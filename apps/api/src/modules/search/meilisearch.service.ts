import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Meilisearch, type EnqueuedTask } from 'meilisearch';

export interface IndexSettings {
    searchableAttributes?: string[];
    filterableAttributes?: string[];
    sortableAttributes?: string[];
    displayedAttributes?: string[];
}

export interface MeiliIndexOptions {
    limit?: number;
    offset?: number;
    filter?: string | string[];
    sort?: string[];
    attributesToHighlight?: string[];
}

export interface MeiliSearchResult<T> {
    hits: T[];
    estimatedTotalHits: number;
    processingTimeMs: number;
}

/**
 * Meilisearch 客户端封装。
 * 设计原则：Meilisearch 属于「可选增强」，连接失败时整个服务自动降级为 PostgreSQL 检索，
 * 不会阻塞应用启动。
 */
@Injectable()
export class MeilisearchService implements OnModuleInit {
    private readonly logger = new Logger(MeilisearchService.name);

    private client: Meilisearch | null = null;
    private ready = false;
    private initPromise: Promise<void> | null = null;
    private readonly enabled: boolean;
    private readonly host: string;

    constructor(private readonly config: ConfigService) {
        this.enabled = config.get<boolean>('meili.enabled') ?? true;
        this.host = config.get<string>('meili.host') ?? 'http://localhost:7700';
    }

    get isReady(): boolean {
        return this.ready && this.client !== null;
    }

    /**
     * NestJS 会用 Promise.all 并发执行同一模块内所有 onModuleInit，
     * 因此不能依赖钩子顺序。这里把连接过程收敛成一个幂等的 Promise，
     * 任何需要 Meilisearch 的代码都可以 await whenReady() 后再操作。
     */
    async onModuleInit(): Promise<void> {
        await this.init();
    }

    private init(): Promise<void> {
        this.initPromise ??= this.connect();
        return this.initPromise;
    }

    /** 等待连接流程结束，返回 Meilisearch 是否可用。 */
    async whenReady(): Promise<boolean> {
        await this.init();
        return this.isReady;
    }

    private async connect(): Promise<void> {
        if (!this.enabled) {
            this.logger.warn('MEILI_ENABLED=false，搜索将使用 PostgreSQL 检索');
            return;
        }

        try {
            const client = new Meilisearch({
                host: this.host,
                apiKey: this.config.get<string>('meili.apiKey') ?? undefined,
            });

            await client.health();
            this.client = client;
            this.ready = true;
            this.logger.log(`Meilisearch 连接成功 → ${this.host}`);
        } catch (error) {
            this.client = null;
            this.ready = false;
            this.logger.warn(
                `Meilisearch 连接失败（${this.host}），已降级为 PostgreSQL 检索：${error instanceof Error ? error.message : String(error)
                }`,
            );
        }
    }

    /** 等待 Meilisearch 异步任务完成；任务失败时抛错，避免问题被静默吞掉。 */
    private async runTask(pending: Promise<EnqueuedTask> | EnqueuedTask): Promise<void> {
        const enqueued = await pending;
        const task = await this.client?.tasks.waitForTask(enqueued.taskUid);

        if (task && task.status === 'failed') {
            const detail = task.error ? `${task.error.code}: ${task.error.message}` : '未知原因';
            throw new Error(`Meilisearch ${task.type} 任务失败（${detail}）`);
        }
    }

    /** 索引不存在时创建，并同步检索/过滤/排序设置。 */
    async ensureIndex(uid: string, settings: IndexSettings): Promise<void> {
        if (!this.isReady || this.client === null) return;

        try {
            try {
                await this.client.getIndex(uid);
            } catch {
                await this.runTask(this.client.createIndex(uid, { primaryKey: 'id' }));
                this.logger.log(`已创建 Meilisearch 索引：${uid}`);
            }

            await this.runTask(
                this.client.index(uid).updateSettings({
                    searchableAttributes: settings.searchableAttributes,
                    filterableAttributes: settings.filterableAttributes,
                    sortableAttributes: settings.sortableAttributes,
                    displayedAttributes: settings.displayedAttributes,
                }),
            );
        } catch (error) {
            this.logger.warn(
                `同步 Meilisearch 索引设置失败（${uid}）：${error instanceof Error ? error.message : String(error)
                }`,
            );
        }
    }

    async upsert<T extends Record<string, any>>(uid: string, documents: T[]): Promise<void> {
        if (!this.isReady || documents.length === 0) return;

        try {
            await this.runTask(this.client!.index(uid).addDocuments(documents));
        } catch (error) {
            this.logger.warn(
                `写入 Meilisearch 索引失败（${uid}）：${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    async remove(uid: string, ids: string[]): Promise<void> {
        if (!this.isReady || ids.length === 0) return;

        try {
            await this.runTask(this.client!.index(uid).deleteDocuments(ids));
        } catch (error) {
            this.logger.warn(
                `删除 Meilisearch 索引文档失败（${uid}）：${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    /** 全量覆盖索引（先清空再写入）。 */
    async replaceAll<T extends Record<string, any>>(uid: string, documents: T[]): Promise<void> {
        if (!this.isReady || this.client === null) return;

        try {
            const index = this.client.index(uid);

            await this.runTask(index.deleteAllDocuments());

            // 分批写入，避免单次 payload 过大
            const chunkSize = 1000;
            for (let i = 0; i < documents.length; i += chunkSize) {
                await this.runTask(index.addDocuments(documents.slice(i, i + chunkSize)));
            }

            this.logger.log(`已重建 Meilisearch 索引 ${uid}，共 ${documents.length} 篇文档`);
        } catch (error) {
            this.logger.warn(
                `重建 Meilisearch 索引失败（${uid}）：${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    async search<T extends Record<string, any> = Record<string, unknown>>(
        uid: string,
        query: string,
        options: MeiliIndexOptions = {},
    ): Promise<MeiliSearchResult<T>> {
        if (this.client === null) {
            return { hits: [], estimatedTotalHits: 0, processingTimeMs: 0 };
        }

        const result = await this.client.index(uid).search<T>(query, {
            limit: options.limit ?? 20,
            offset: options.offset ?? 0,
            filter: options.filter,
            sort: options.sort,
            attributesToHighlight: options.attributesToHighlight,
            highlightPreTag: '<mark>',
            highlightPostTag: '</mark>',
        });

        return {
            hits: result.hits as T[],
            estimatedTotalHits: result.estimatedTotalHits ?? result.hits.length,
            processingTimeMs: result.processingTimeMs ?? 0,
        };
    }

    async stats(uid: string): Promise<{ numberOfDocuments: number } | null> {
        if (!this.isReady) return null;

        try {
            const indexStats = await this.client?.index(uid).getStats();
            return { numberOfDocuments: indexStats?.numberOfDocuments ?? 0 };
        } catch {
            return null;
        }
    }
}
