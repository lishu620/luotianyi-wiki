import type { Paginated, SongSortField } from '@luotianyi/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { buildPaginated, normalizeStringArray } from '../../common/utils';
import { SongEntity } from '../../entities/song.entity';
import { SearchIndexerService } from '../search/search-indexer.service';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/create-song.dto';
import { QuerySongsDto } from './dto/query-songs.dto';

@Injectable()
export class SongsService {
  constructor(
    @InjectRepository(SongEntity)
    private readonly songs: Repository<SongEntity>,
    private readonly indexer: SearchIndexerService,
  ) {}

  /* ------------------------------ 查询 ------------------------------ */

  private buildBaseQuery(alias = 'song'): SelectQueryBuilder<SongEntity> {
    return this.songs.createQueryBuilder(alias);
  }

  private applyFilters(
    qb: SelectQueryBuilder<SongEntity>,
    query: QuerySongsDto,
    options: { includeDraft: boolean },
  ): void {
    if (options.includeDraft) {
      if (query.status) qb.andWhere('song.status = :status', { status: query.status });
    } else {
      qb.andWhere('song.status = :status', { status: 'published' });
    }

    if (query.year) qb.andWhere('song.releaseYear = :year', { year: query.year });
    if (query.vocalType) qb.andWhere('song.vocalType = :vocalType', { vocalType: query.vocalType });
    if (query.producer) qb.andWhere('song.producer = :producer', { producer: query.producer });
    if (query.featured !== undefined) {
      qb.andWhere('song.isFeatured = :featured', { featured: query.featured });
    }
    if (query.tag) qb.andWhere(':tag = ANY(song.tags)', { tag: query.tag });
    if (query.keyword && query.keyword.trim()) {
      qb.andWhere(this.keywordCondition(), { kw: `%${query.keyword.trim()}%` });
    }
  }

  /** PostgreSQL 兜底模糊检索：标题 / 拼音 / 别名 / P主 / 标签 */
  private keywordCondition(): string {
    return `(
      song.title ILIKE :kw
      OR coalesce(song."titlePinyin", '') ILIKE :kw
      OR coalesce(song.producer, '') ILIKE :kw
      OR coalesce(song.lyricist, '') ILIKE :kw
      OR array_to_string(song.aliases, ' ') ILIKE :kw
      OR array_to_string(song.tags, ' ') ILIKE :kw
    )`;
  }

  private applyOrder(qb: SelectQueryBuilder<SongEntity>, query: QuerySongsDto): void {
    const sortBy: SongSortField = query.sortBy ?? 'createdAt';
    const order = query.order ?? 'DESC';

    qb.orderBy(`song.${sortBy}`, order);
    if (sortBy !== 'createdAt') qb.addOrderBy('song.createdAt', 'DESC');
  }

  async findAll(query: QuerySongsDto, ownerId?: string): Promise<Paginated<SongEntity>> {
    const qb = this.buildBaseQuery().where('1 = 1');
    this.applyFilters(qb, query, { includeDraft: true });
    if (ownerId) qb.andWhere('song."ownerId" = :ownerId', { ownerId });
    this.applyOrder(qb, query);
    qb.skip((query.page - 1) * query.pageSize).take(query.pageSize);

    const [items, total] = await qb.getManyAndCount();
    return buildPaginated(items, total, query.page, query.pageSize);
  }

  async findPublished(query: QuerySongsDto): Promise<Paginated<SongEntity>> {
    const qb = this.buildBaseQuery().where('1 = 1');
    this.applyFilters(qb, query, { includeDraft: false });
    this.applyOrder(qb, query);
    qb.skip((query.page - 1) * query.pageSize).take(query.pageSize);

    const [items, total] = await qb.getManyAndCount();
    return buildPaginated(items, total, query.page, query.pageSize);
  }

  async findFeatured(limit = 6): Promise<SongEntity[]> {
    return this.songs.find({
      where: { status: 'published', isFeatured: true },
      order: { playCount: 'DESC', createdAt: 'DESC' },
      take: limit,
    });
  }

  async findOne(id: string): Promise<SongEntity> {
    const song = await this.songs.findOne({ where: { id } });
    if (!song) throw new NotFoundException('未找到该歌曲');
    return song;
  }

  async findOnePublished(id: string): Promise<SongEntity> {
    const song = await this.songs.findOne({ where: { id, status: 'published' } });
    if (!song) throw new NotFoundException('未找到该歌曲');
    return song;
  }

  async findManyByIds(ids: string[]): Promise<SongEntity[]> {
    if (ids.length === 0) return [];
    return this.songs.find({ where: { id: In(ids) } });
  }

  /** 同 P 主或共享标签的推荐歌曲 */
  async findRelated(id: string, limit = 4): Promise<SongEntity[]> {
    const current = await this.songs.findOne({ where: { id } });
    if (!current) return [];

    const qb = this.buildBaseQuery()
      .where('song.id != :id', { id })
      .andWhere('song.status = :status', { status: 'published' });

    if (current.tags?.length && current.producer) {
      qb.andWhere('(song.producer = :producer OR song.tags && :tags)', {
        producer: current.producer,
        tags: current.tags,
      });
    } else if (current.tags?.length) {
      qb.andWhere('song.tags && :tags', { tags: current.tags });
    } else if (current.producer) {
      qb.andWhere('song.producer = :producer', { producer: current.producer });
    }

    return qb.orderBy('song.playCount', 'DESC').take(limit).getMany();
  }

  async getFilterOptions(): Promise<{
    years: number[];
    producers: string[];
    tags: { tag: string; count: number }[];
  }> {
    const [years, producers, tagRows] = await Promise.all([
      this.songs.query(
        `SELECT DISTINCT "releaseYear" AS year FROM songs
         WHERE status = 'published' AND "releaseYear" IS NOT NULL ORDER BY year DESC`,
      ) as Promise<Array<{ year: number }>>,
      this.songs.query(
        `SELECT DISTINCT producer FROM songs
         WHERE status = 'published' AND producer IS NOT NULL AND producer <> ''
         ORDER BY producer ASC LIMIT 200`,
      ) as Promise<Array<{ producer: string }>>,
      this.songs.query(
        `SELECT tag, COUNT(*)::int AS count FROM songs, unnest(tags) AS tag
         WHERE status = 'published' GROUP BY tag ORDER BY count DESC, tag ASC LIMIT 60`,
      ) as Promise<Array<{ tag: string; count: number }>>,
    ]);

    return {
      years: years.map((row) => Number(row.year)),
      producers: producers.map((row) => row.producer),
      tags: tagRows.map((row) => ({ tag: row.tag, count: Number(row.count) })),
    };
  }

  /* ------------------------------ 写入 ------------------------------ */

  private normalizeDto(dto: CreateSongDto): Partial<SongEntity> {
    const releaseDate = dto.releaseDate?.trim() || null;
    const derivedYear = releaseDate ? Number(releaseDate.slice(0, 4)) : null;
    const releaseYear = dto.releaseYear ?? derivedYear;

    return {
      title: dto.title?.trim(),
      titlePinyin: dto.titlePinyin?.trim() || null,
      aliases: normalizeStringArray(dto.aliases),
      producer: dto.producer?.trim() || null,
      lyricist: dto.lyricist?.trim() || null,
      composer: dto.composer?.trim() || null,
      arranger: dto.arranger?.trim() || null,
      vocalType: dto.vocalType ?? 'solo',
      featuredSingers: normalizeStringArray(dto.featuredSingers),
      releaseDate,
      releaseYear: releaseYear && !Number.isNaN(releaseYear) ? releaseYear : null,
      duration: dto.duration ?? null,
      playCount: dto.playCount ?? 0,
      tags: normalizeStringArray(dto.tags),
      description: dto.description?.trim() || null,
      lyrics: dto.lyrics ?? null,
      coverUrl: dto.coverUrl?.trim() || null,
      bilibiliUrl: dto.bilibiliUrl?.trim() || null,
      youtubeUrl: dto.youtubeUrl?.trim() || null,
      neteaseUrl: dto.neteaseUrl?.trim() || null,
      qqMusicUrl: dto.qqMusicUrl?.trim() || null,
      isFeatured: dto.isFeatured ?? false,
      status: dto.status ?? 'published',
      sortOrder: dto.sortOrder ?? 0,
    };
  }

  async create(dto: CreateSongDto, ownerId?: string | null): Promise<SongEntity> {
    const entity = this.songs.create({ ...this.normalizeDto(dto), ownerId: ownerId ?? null });
    const saved = await this.songs.save(entity);
    await this.indexer.indexSong(saved);
    return saved;
  }

  async update(id: string, dto: UpdateSongDto): Promise<SongEntity> {
    const song = await this.findOne(id);
    const patch = this.normalizeDto(dto as CreateSongDto) as Record<string, unknown>;

    // 仅覆盖请求体中真实出现的字段，其余保持原值
    for (const key of Object.keys(dto)) {
      const value = patch[key];
      if (value !== undefined) {
        (song as unknown as Record<string, unknown>)[key] = value;
      }
    }

    const saved = await this.songs.save(song);
    await this.indexer.indexSong(saved);
    return saved;
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const song = await this.findOne(id);
    await this.songs.remove(song);
    await this.indexer.removeSongs([id]);
    return { success: true };
  }

  async removeMany(ids: string[]): Promise<{ deleted: number }> {
    if (ids.length === 0) return { deleted: 0 };

    await this.songs.delete({ id: In(ids) });
    await this.indexer.removeSongs(ids);
    return { deleted: ids.length };
  }

  /** 批量写入（种子数据 / 导入） */
  async createMany(dtos: CreateSongDto[]): Promise<SongEntity[]> {
    const entities = dtos.map((dto) => this.songs.create(this.normalizeDto(dto)));
    const saved = await this.songs.save(entities);
    await this.indexer.indexSongs(saved);
    return saved;
  }

  count(): Promise<number> {
    return this.songs.count();
  }
}
