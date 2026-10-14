import type { ExternalLink, SearchResponse, Song } from '@luotianyi/shared';
import { Injectable, Logger } from '@nestjs/common';
import type { ExternalLinkEntity } from '../../entities/external-link.entity';
import type { SongEntity } from '../../entities/song.entity';
import { LinksService } from '../links/links.service';
import { SongsService } from '../songs/songs.service';
import { LINKS_INDEX, SONGS_INDEX, type SongSearchDocument } from './search-indexer.service';
import { MeilisearchService } from './meilisearch.service';
import { SearchLinksDto, SearchSongsDto } from './dto/search.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly meili: MeilisearchService,
    private readonly songs: SongsService,
    private readonly links: LinksService,
  ) {}

  get engine(): 'meilisearch' | 'postgres' {
    return this.meili.isReady ? 'meilisearch' : 'postgres';
  }

  /* --------------------------- 歌曲搜索 --------------------------- */

  async searchSongs(dto: SearchSongsDto): Promise<SearchResponse<Song>> {
    const query = (dto.q ?? '').trim();
    const offset = (dto.page - 1) * dto.pageSize;

    if (this.meili.isReady) {
      try {
        const result = await this.meili.search<SongSearchDocument>(SONGS_INDEX, query, {
          limit: dto.pageSize,
          offset,
          filter: this.buildSongFilter(dto),
          sort: this.buildSongSort(dto),
          attributesToHighlight: ['title', 'aliases', 'producer'],
        });

        const ordered = await this.hydrateSongs(result.hits.map((hit) => hit.id));

        return {
          hits: ordered as unknown as Song[],
          total: result.estimatedTotalHits,
          engine: 'meilisearch',
          processingTimeMs: result.processingTimeMs,
          query,
        };
      } catch (error) {
        this.logger.warn(
          `Meilisearch 检索失败，本次降级为 PostgreSQL：${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const page = await this.songs.findPublished({
      keyword: query,
      year: dto.year,
      tag: dto.tag,
      vocalType: dto.vocalType,
      producer: dto.producer,
      featured: dto.featured,
      sortBy: this.mapSortField(dto.sortBy),
      order: dto.order,
      page: dto.page,
      pageSize: dto.pageSize,
    });

    return {
      hits: page.items as unknown as Song[],
      total: page.total,
      engine: 'postgres',
      query,
    };
  }

  /* --------------------------- 外链搜索 --------------------------- */

  async searchLinks(dto: SearchLinksDto): Promise<SearchResponse<ExternalLink>> {
    const query = (dto.q ?? '').trim();
    const offset = (dto.page - 1) * dto.pageSize;

    if (this.meili.isReady) {
      try {
        const filter: string[] = ['status = "published"'];
        if (dto.category) filter.push(`category = "${dto.category}"`);
        if (dto.recommended !== undefined) filter.push(`recommended = ${dto.recommended}`);

        const result = await this.meili.search<{ id: string }>(LINKS_INDEX, query, {
          limit: dto.pageSize,
          offset,
          filter,
          attributesToHighlight: ['title', 'description'],
        });

        const ordered = await this.hydrateLinks(result.hits.map((hit) => hit.id));

        return {
          hits: ordered as unknown as ExternalLink[],
          total: result.estimatedTotalHits,
          engine: 'meilisearch',
          processingTimeMs: result.processingTimeMs,
          query,
        };
      } catch (error) {
        this.logger.warn(
          `Meilisearch 外链检索失败，本次降级为 PostgreSQL：${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const page = await this.links.findPublished({
      keyword: query,
      category: dto.category,
      recommended: dto.recommended,
      page: dto.page,
      pageSize: dto.pageSize,
    });

    return {
      hits: page.items as unknown as ExternalLink[],
      total: page.total,
      engine: 'postgres',
      query,
    };
  }

  /* --------------------------- 汇总搜索 --------------------------- */

  async searchAll(query: string, limit = 5): Promise<{
    engine: 'meilisearch' | 'postgres';
    query: string;
    songs: Song[];
    links: ExternalLink[];
  }> {
    const [songs, links] = await Promise.all([
      this.searchSongs({ q: query, page: 1, pageSize: limit }),
      this.searchLinks({ q: query, page: 1, pageSize: limit }),
    ]);

    return {
      engine: songs.engine,
      query,
      songs: songs.hits,
      links: links.hits,
    };
  }

  /* --------------------------- 内部工具 --------------------------- */

  private buildSongFilter(dto: SearchSongsDto): string[] {
    const filter: string[] = ['status = "published"'];

    if (dto.year) filter.push(`releaseYear = ${Number(dto.year)}`);
    if (dto.vocalType) filter.push(`vocalType = "${dto.vocalType}"`);
    if (dto.producer) filter.push(`producer = "${this.escapeFilterValue(dto.producer)}"`);
    if (dto.tag) filter.push(`tags = "${this.escapeFilterValue(dto.tag)}"`);
    if (dto.featured !== undefined) filter.push(`isFeatured = ${dto.featured}`);

    return filter;
  }

  private buildSongSort(dto: SearchSongsDto): string[] | undefined {
    const direction = (dto.order ?? 'DESC').toLowerCase();

    switch (dto.sortBy) {
      case 'playCount':
        return [`playCount:${direction}`];
      case 'releaseYear':
        return [`releaseYear:${direction}`];
      case 'createdAt':
        return [`createdAtTs:${direction}`];
      case 'title':
        return [`title:${direction === 'desc' ? 'desc' : 'asc'}`];
      default:
        return undefined;
    }
  }

  private mapSortField(
    sortBy?: string,
  ): 'playCount' | 'releaseDate' | 'createdAt' | 'title' | undefined {
    switch (sortBy) {
      case 'playCount':
      case 'createdAt':
      case 'title':
        return sortBy;
      case 'releaseYear':
        return 'releaseDate';
      default:
        return undefined;
    }
  }

  private escapeFilterValue(value: string): string {
    return value.replace(/"/g, '\\"');
  }

  /** 按 Meilisearch 返回顺序回填完整实体 */
  private async hydrateSongs(ids: string[]): Promise<SongEntity[]> {
    if (ids.length === 0) return [];

    const rows = await this.songs.findManyByIds(ids);
    const byId = new Map(rows.map((row) => [row.id, row]));

    return ids.map((id) => byId.get(id)).filter((row): row is SongEntity => Boolean(row));
  }

  private async hydrateLinks(ids: string[]): Promise<ExternalLinkEntity[]> {
    if (ids.length === 0) return [];

    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          return await this.links.findOnePublished(id);
        } catch {
          return null;
        }
      }),
    );

    return results.filter((row): row is ExternalLinkEntity => row !== null);
  }
}
