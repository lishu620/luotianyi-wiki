import type {
  CategoryStat,
  StatsDashboard,
  StatsOverview,
  TagStat,
  TopSongStat,
  YearStat,
} from '@luotianyi/shared';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalLinkEntity } from '../../entities/external-link.entity';
import { SongEntity } from '../../entities/song.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(SongEntity)
    private readonly songs: Repository<SongEntity>,
    @InjectRepository(ExternalLinkEntity)
    private readonly links: Repository<ExternalLinkEntity>,
  ) {}

  async getOverview(): Promise<StatsOverview> {
    const [songRows, linkCount, tagRows] = await Promise.all([
      this.songs.query(
        `SELECT
           COUNT(*)::int AS "songCount",
           COUNT(*) FILTER (WHERE status = 'published')::int AS "publishedSongCount",
           COUNT(*) FILTER (WHERE "isFeatured" = true)::int AS "featuredCount",
           COALESCE(SUM("playCount"), 0)::bigint AS "totalPlayCount",
           MIN("releaseYear") AS "earliestYear",
           MAX("releaseYear") AS "latestYear"
         FROM songs`,
      ) as Promise<
        Array<{
          songCount: number;
          publishedSongCount: number;
          featuredCount: number;
          totalPlayCount: string | number;
          earliestYear: number | null;
          latestYear: number | null;
        }>
      >,
      this.links.count(),
      this.songs.query(
        `SELECT COUNT(DISTINCT tag)::int AS count FROM songs, unnest(tags) AS tag WHERE status = 'published'`,
      ) as Promise<Array<{ count: number }>>,
    ]);

    const row = songRows[0] ?? {
      songCount: 0,
      publishedSongCount: 0,
      featuredCount: 0,
      totalPlayCount: 0,
      earliestYear: null,
      latestYear: null,
    };

    return {
      songCount: Number(row.songCount),
      publishedSongCount: Number(row.publishedSongCount),
      featuredCount: Number(row.featuredCount),
      linkCount: Number(linkCount),
      totalPlayCount: Number(row.totalPlayCount ?? 0),
      tagCount: Number(tagRows[0]?.count ?? 0),
      earliestYear: row.earliestYear === null ? null : Number(row.earliestYear),
      latestYear: row.latestYear === null ? null : Number(row.latestYear),
    };
  }

  async getByYear(): Promise<YearStat[]> {
    const rows = (await this.songs.query(
      `SELECT "releaseYear" AS year,
              COUNT(*)::int AS "songCount",
              COALESCE(SUM("playCount"), 0)::bigint AS "playCount"
       FROM songs
       WHERE status = 'published' AND "releaseYear" IS NOT NULL
       GROUP BY "releaseYear"
       ORDER BY "releaseYear" ASC`,
    )) as Array<{ year: number; songCount: number; playCount: string | number }>;

    return rows.map((row) => ({
      year: Number(row.year),
      songCount: Number(row.songCount),
      playCount: Number(row.playCount),
    }));
  }

  async getTopSongs(limit = 10): Promise<TopSongStat[]> {
    const rows = (await this.songs.query(
      `SELECT id, title, producer, "playCount", "releaseYear"
       FROM songs
       WHERE status = 'published'
       ORDER BY "playCount" DESC, title ASC
       LIMIT $1`,
      [Math.min(Math.max(limit, 1), 50)],
    )) as Array<{
      id: string;
      title: string;
      producer: string | null;
      playCount: number;
      releaseYear: number | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      producer: row.producer,
      playCount: Number(row.playCount),
      releaseYear: row.releaseYear === null ? null : Number(row.releaseYear),
    }));
  }

  async getTags(limit = 20): Promise<TagStat[]> {
    const rows = (await this.songs.query(
      `SELECT tag, COUNT(*)::int AS count
       FROM songs, unnest(tags) AS tag
       WHERE status = 'published'
       GROUP BY tag
       ORDER BY count DESC, tag ASC
       LIMIT $1`,
      [Math.min(Math.max(limit, 1), 60)],
    )) as Array<{ tag: string; count: number }>;

    return rows.map((row) => ({ tag: row.tag, count: Number(row.count) }));
  }

  async getLinkCategories(): Promise<CategoryStat[]> {
    const rows = (await this.links.query(
      `SELECT category, COUNT(*)::int AS count
       FROM external_links
       WHERE status = 'published'
       GROUP BY category
       ORDER BY count DESC`,
    )) as Array<{ category: CategoryStat['category']; count: number }>;

    return rows.map((row) => ({ category: row.category, count: Number(row.count) }));
  }

  async getDashboard(topLimit = 10, tagLimit = 20): Promise<StatsDashboard> {
    const [overview, byYear, topSongs, tags, linkCategories] = await Promise.all([
      this.getOverview(),
      this.getByYear(),
      this.getTopSongs(topLimit),
      this.getTags(tagLimit),
      this.getLinkCategories(),
    ]);

    return { overview, byYear, topSongs, tags, linkCategories };
  }
}
