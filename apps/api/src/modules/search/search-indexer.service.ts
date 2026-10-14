import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalLinkEntity } from '../../entities/external-link.entity';
import { SongEntity } from '../../entities/song.entity';
import { MeilisearchService } from './meilisearch.service';

export const SONGS_INDEX = 'songs';
export const LINKS_INDEX = 'links';

const SONG_SETTINGS = {
    searchableAttributes: [
        'title',
        'titlePinyin',
        'aliases',
        'producer',
        'lyricist',
        'composer',
        'featuredSingers',
        'tags',
        'description',
    ],
    filterableAttributes: [
        'status',
        'releaseYear',
        'vocalType',
        'producer',
        'tags',
        'isFeatured',
        'aliases',
    ],
    sortableAttributes: ['playCount', 'releaseYear', 'createdAtTs', 'title'],
    displayedAttributes: ['*'],
};

const LINK_SETTINGS = {
    searchableAttributes: ['title', 'description', 'tags', 'category'],
    filterableAttributes: ['status', 'category', 'recommended', 'tags'],
    sortableAttributes: ['sortOrder', 'clicks', 'createdAtTs', 'title'],
    displayedAttributes: ['*'],
};

export interface SongSearchDocument {
    id: string;
    title: string;
    titlePinyin: string;
    aliases: string[];
    producer: string;
    lyricist: string;
    composer: string;
    featuredSingers: string[];
    vocalType: string;
    tags: string[];
    releaseYear: number;
    playCount: number;
    isFeatured: boolean;
    status: string;
    coverUrl: string;
    description: string;
    createdAtTs: number;
}

function toSongDocument(song: SongEntity): SongSearchDocument {
    return {
        id: song.id,
        title: song.title,
        titlePinyin: song.titlePinyin ?? '',
        aliases: song.aliases ?? [],
        producer: song.producer ?? '',
        lyricist: song.lyricist ?? '',
        composer: song.composer ?? '',
        featuredSingers: song.featuredSingers ?? [],
        vocalType: song.vocalType,
        tags: song.tags ?? [],
        releaseYear: song.releaseYear ?? 0,
        playCount: song.playCount ?? 0,
        isFeatured: Boolean(song.isFeatured),
        status: song.status,
        coverUrl: song.coverUrl ?? '',
        description: (song.description ?? '').slice(0, 500),
        createdAtTs: new Date(song.createdAt ?? Date.now()).getTime(),
    };
}

@Injectable()
export class SearchIndexerService implements OnModuleInit {
    private readonly logger = new Logger(SearchIndexerService.name);

    constructor(
        private readonly meili: MeilisearchService,
        @InjectRepository(SongEntity) private readonly songs: Repository<SongEntity>,
        @InjectRepository(ExternalLinkEntity) private readonly links: Repository<ExternalLinkEntity>,
    ) { }

    async onModuleInit(): Promise<void> {
        // 必须等待连接完成，否则会与 MeilisearchService.onModuleInit 产生竞态，
        // 导致索引设置（filterableAttributes 等）从未写入。
        const available = await this.meili.whenReady();
        if (!available) return;

        try {
            await this.meili.ensureIndex(SONGS_INDEX, SONG_SETTINGS);
            await this.meili.ensureIndex(LINKS_INDEX, LINK_SETTINGS);
        } catch (error) {
            this.logger.error(
                `初始化搜索索引失败：${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    async indexSong(song: SongEntity): Promise<void> {
        if (!this.meili.isReady) return;
        await this.meili.upsert(SONGS_INDEX, [toSongDocument(song)]);
    }

    async indexSongs(songs: SongEntity[]): Promise<void> {
        if (!this.meili.isReady || songs.length === 0) return;
        await this.meili.upsert(SONGS_INDEX, songs.map(toSongDocument));
    }

    async removeSongs(ids: string[]): Promise<void> {
        await this.meili.remove(SONGS_INDEX, ids);
    }

    async indexLink(link: ExternalLinkEntity): Promise<void> {
        if (!this.meili.isReady) return;

        await this.meili.upsert(LINKS_INDEX, [
            {
                id: link.id,
                title: link.title,
                description: link.description ?? '',
                category: link.category,
                tags: link.tags ?? [],
                recommended: Boolean(link.recommended),
                status: link.status,
                clicks: link.clicks ?? 0,
                sortOrder: link.sortOrder ?? 0,
                createdAtTs: new Date(link.createdAt ?? Date.now()).getTime(),
            },
        ]);
    }

    async removeLinks(ids: string[]): Promise<void> {
        await this.meili.remove(LINKS_INDEX, ids);
    }

    /** 全量重建索引，用于 `pnpm reindex` 或后台一键重建。 */
    async reindexAll(): Promise<{ songs: number; links: number; meilisearchReady: boolean }> {
        const [songRows, linkRows] = await Promise.all([
            this.songs.find({ order: { createdAt: 'DESC' } }),
            this.links.find({ order: { sortOrder: 'ASC' } }),
        ]);

        if (!this.meili.isReady) {
            this.logger.warn('Meilisearch 不可用，跳过重建（检索将使用 PostgreSQL）');
            return { songs: 0, links: 0, meilisearchReady: false };
        }

        await this.meili.replaceAll(SONGS_INDEX, songRows.map(toSongDocument));
        await this.meili.replaceAll(
            LINKS_INDEX,
            linkRows.map((link) => ({
                id: link.id,
                title: link.title,
                description: link.description ?? '',
                category: link.category,
                tags: link.tags ?? [],
                recommended: Boolean(link.recommended),
                status: link.status,
                clicks: link.clicks ?? 0,
                sortOrder: link.sortOrder ?? 0,
                createdAtTs: new Date(link.createdAt ?? Date.now()).getTime(),
            })),
        );

        return { songs: songRows.length, links: linkRows.length, meilisearchReady: true };
    }
}
