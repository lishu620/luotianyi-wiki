import type { LinkCategory, Paginated } from '@luotianyi/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { buildPaginated, normalizeStringArray } from '../../common/utils';
import { ExternalLinkEntity } from '../../entities/external-link.entity';
import { SearchIndexerService } from '../search/search-indexer.service';
import { CreateLinkDto, UpdateLinkDto } from './dto/create-link.dto';
import { QueryLinksDto } from './dto/query-links.dto';

export interface LinkGroup {
  category: LinkCategory;
  links: ExternalLinkEntity[];
}

@Injectable()
export class LinksService {
  constructor(
    @InjectRepository(ExternalLinkEntity)
    private readonly links: Repository<ExternalLinkEntity>,
    private readonly indexer: SearchIndexerService,
  ) {}

  private applyFilters(
    qb: SelectQueryBuilder<ExternalLinkEntity>,
    query: QueryLinksDto,
    includeDraft: boolean,
  ): void {
    if (includeDraft) {
      if (query.status) qb.andWhere('link.status = :status', { status: query.status });
    } else {
      qb.andWhere('link.status = :status', { status: 'published' });
    }

    if (query.category) qb.andWhere('link.category = :category', { category: query.category });
    if (query.recommended !== undefined) {
      qb.andWhere('link.recommended = :recommended', { recommended: query.recommended });
    }
    if (query.keyword?.trim()) {
      qb.andWhere(
        `(link.title ILIKE :kw OR coalesce(link.description, '') ILIKE :kw OR array_to_string(link.tags, ' ') ILIKE :kw OR link.url ILIKE :kw)`,
        { kw: `%${query.keyword.trim()}%` },
      );
    }
  }

  private async paginate(
    query: QueryLinksDto,
    includeDraft: boolean,
    ownerId?: string,
  ): Promise<Paginated<ExternalLinkEntity>> {
    const qb = this.links.createQueryBuilder('link').where('1 = 1');
    this.applyFilters(qb, query, includeDraft);
    if (ownerId) qb.andWhere('link."ownerId" = :ownerId', { ownerId });

    qb.orderBy('link.recommended', 'DESC')
      .addOrderBy('link.sortOrder', 'ASC')
      .addOrderBy('link.createdAt', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);

    const [items, total] = await qb.getManyAndCount();
    return buildPaginated(items, total, query.page, query.pageSize);
  }

  findAll(query: QueryLinksDto, ownerId?: string): Promise<Paginated<ExternalLinkEntity>> {
    return this.paginate(query, true, ownerId);
  }

  findPublished(query: QueryLinksDto): Promise<Paginated<ExternalLinkEntity>> {
    return this.paginate(query, false);
  }

  /** 导航页：按分类分组返回全部已发布站点 */
  async findGroupedByCategory(): Promise<LinkGroup[]> {
    const links = await this.links.find({
      where: { status: 'published' },
      order: { recommended: 'DESC', sortOrder: 'ASC', createdAt: 'DESC' },
    });

    const groups = new Map<LinkCategory, ExternalLinkEntity[]>();
    for (const link of links) {
      const bucket = groups.get(link.category) ?? [];
      bucket.push(link);
      groups.set(link.category, bucket);
    }

    return [...groups.entries()].map(([category, items]) => ({ category, links: items }));
  }

  async getCategoryCounts(): Promise<Array<{ category: LinkCategory; count: number }>> {
    const rows = (await this.links.query(
      `SELECT category, COUNT(*)::int AS count FROM external_links WHERE status = 'published' GROUP BY category`,
    )) as Array<{ category: LinkCategory; count: number }>;

    return rows.map((row) => ({ category: row.category, count: Number(row.count) }));
  }

  async findOne(id: string): Promise<ExternalLinkEntity> {
    const link = await this.links.findOne({ where: { id } });
    if (!link) throw new NotFoundException('未找到该外链站点');
    return link;
  }

  async findOnePublished(id: string): Promise<ExternalLinkEntity> {
    const link = await this.links.findOne({ where: { id, status: 'published' } });
    if (!link) throw new NotFoundException('未找到该外链站点');
    return link;
  }

  private normalize(dto: CreateLinkDto): Partial<ExternalLinkEntity> {
    return {
      title: dto.title?.trim(),
      url: dto.url?.trim(),
      description: dto.description?.trim() || null,
      category: dto.category ?? 'other',
      iconUrl: dto.iconUrl?.trim() || null,
      tags: normalizeStringArray(dto.tags),
      recommended: dto.recommended ?? false,
      sortOrder: dto.sortOrder ?? 0,
      status: dto.status ?? 'published',
    };
  }

  async create(dto: CreateLinkDto, ownerId?: string | null): Promise<ExternalLinkEntity> {
    const entity = this.links.create({ ...this.normalize(dto), ownerId: ownerId ?? null });
    const saved = await this.links.save(entity);
    await this.indexer.indexLink(saved);
    return saved;
  }

  async update(id: string, dto: UpdateLinkDto): Promise<ExternalLinkEntity> {
    const link = await this.findOne(id);
    const patch = this.normalize(dto as CreateLinkDto) as Record<string, unknown>;

    for (const key of Object.keys(dto)) {
      const value = patch[key];
      if (value !== undefined) {
        (link as unknown as Record<string, unknown>)[key] = value;
      }
    }

    const saved = await this.links.save(link);
    await this.indexer.indexLink(saved);
    return saved;
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const link = await this.findOne(id);
    await this.links.remove(link);
    await this.indexer.removeLinks([id]);
    return { success: true };
  }

  async removeMany(ids: string[]): Promise<{ deleted: number }> {
    if (ids.length === 0) return { deleted: 0 };

    await this.links.delete({ id: In(ids) });
    await this.indexer.removeLinks(ids);
    return { deleted: ids.length };
  }

  /** 记录一次跳转点击 */
  async recordClick(id: string): Promise<{ success: boolean }> {
    await this.links.increment({ id }, 'clicks', 1);
    return { success: true };
  }

  count(): Promise<number> {
    return this.links.count();
  }
}
