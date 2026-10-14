import type { AdminUser, Paginated, SongChangeRequest, Song } from '@luotianyi/shared';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PERMISSIONS } from '../../common/constants/permissions';
import { buildPaginated } from '../../common/utils';
import { SongChangeRequestEntity } from '../../entities/song-change-request.entity';
import { SongEntity } from '../../entities/song.entity';
import { UserEntity } from '../../entities/user.entity';
import { AclService } from '../acl/acl.service';
import { SearchIndexerService } from '../search/search-indexer.service';
import { CreateSongRequestDto, QuerySongRequestsDto } from './dto/song-request.dto';

/** 允许通过申请修改的歌曲字段及其类型 */
const SONG_FIELDS: Record<string, 'string' | 'number' | 'boolean' | 'stringArray'> = {
  title: 'string',
  titlePinyin: 'string',
  producer: 'string',
  lyricist: 'string',
  composer: 'string',
  arranger: 'string',
  vocalType: 'string',
  releaseDate: 'string',
  releaseYear: 'number',
  duration: 'number',
  playCount: 'number',
  description: 'string',
  lyrics: 'string',
  coverUrl: 'string',
  bilibiliUrl: 'string',
  youtubeUrl: 'string',
  neteaseUrl: 'string',
  qqMusicUrl: 'string',
  isFeatured: 'boolean',
  status: 'string',
  sortOrder: 'number',
  aliases: 'stringArray',
  featuredSingers: 'stringArray',
  tags: 'stringArray',
};

@Injectable()
export class SongRequestsService {
  constructor(
    @InjectRepository(SongChangeRequestEntity)
    private readonly requests: Repository<SongChangeRequestEntity>,
    @InjectRepository(SongEntity)
    private readonly songs: Repository<SongEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly indexer: SearchIndexerService,
  ) {}

  /** 过滤 + 类型归一化，避免把非法字段写进歌曲 */
  private coerceChanges(raw: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(raw ?? {})) {
      const type = SONG_FIELDS[key];
      if (!type) continue;

      if (type === 'stringArray') {
        result[key] = Array.isArray(value) ? value.map((item) => String(item)) : [];
        continue;
      }
      if (type === 'number') {
        const num = value === '' || value === null || value === undefined ? null : Number(value);
        result[key] = num === null || Number.isNaN(num) ? null : num;
        continue;
      }
      if (type === 'boolean') {
        result[key] = Boolean(value);
        continue;
      }
      const text = value === null || value === undefined ? '' : String(value);
      result[key] = text || null;
    }

    return result;
  }

  private async enrich(rows: SongChangeRequestEntity[]): Promise<SongChangeRequest[]> {
    if (rows.length === 0) return [];

    const songIds = [...new Set(rows.map((row) => row.songId))];
    const userIds = [
      ...new Set(
        rows
          .flatMap((row) => [row.requesterId, row.reviewerId])
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const [songs, users] = await Promise.all([
      this.songs.find({ where: { id: In(songIds) }, select: ['id', 'title'] }),
      userIds.length
        ? this.users.find({ where: { id: In(userIds) }, select: ['id', 'username'] })
        : Promise.resolve([] as UserEntity[]),
    ]);

    const songMap = new Map(songs.map((song) => [song.id, song]));
    const userMap = new Map(users.map((user) => [user.id, user.username]));

    return rows.map((row) => ({
      id: row.id,
      songId: row.songId,
      songTitle: songMap.get(row.songId)?.title ?? null,
      requesterId: row.requesterId,
      requesterName: userMap.get(row.requesterId) ?? null,
      changes: row.changes ?? {},
      reason: row.reason,
      status: row.status,
      reviewerId: row.reviewerId,
      reviewerName: row.reviewerId ? (userMap.get(row.reviewerId) ?? null) : null,
      reviewNote: row.reviewNote,
      reviewedAt: row.reviewedAt ? new Date(row.reviewedAt).toISOString() : null,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    }));
  }

  private canReview(user: AdminUser, song: SongEntity | null): boolean {
    if (AclService.has(user.permissions, PERMISSIONS.songApprove)) return true;
    if (AclService.isSuper(user.permissions)) return true;
    return Boolean(song && song.ownerId && song.ownerId === user.id);
  }

  async create(user: AdminUser, songId: string, dto: CreateSongRequestDto): Promise<SongChangeRequest> {
    const canContribute =
      AclService.has(user.permissions, PERMISSIONS.songCreate) ||
      AclService.has(user.permissions, PERMISSIONS.songUpdateOwn) ||
      AclService.has(user.permissions, PERMISSIONS.songUpdateAny);
    if (!canContribute) throw new ForbiddenException('当前角色没有投稿或修改歌曲的权限');

    const song = await this.songs.findOne({ where: { id: songId } });
    if (!song) throw new NotFoundException('未找到该歌曲');

    const changes = this.coerceChanges(dto.changes);
    if (Object.keys(changes).length === 0) throw new BadRequestException('没有可提交的有效字段');

    const saved = await this.requests.save(
      this.requests.create({
        songId,
        requesterId: user.id,
        changes,
        reason: dto.reason?.trim() || null,
        status: 'pending',
      }),
    );

    const [dtoOut] = await this.enrich([saved]);
    return dtoOut;
  }

  async findAll(user: AdminUser, query: QuerySongRequestsDto): Promise<Paginated<SongChangeRequest>> {
    const qb = this.requests.createQueryBuilder('r').where('1 = 1');
    const canReviewAll = AclService.has(user.permissions, PERMISSIONS.songApprove) || AclService.isSuper(user.permissions);

    if (!canReviewAll) {
      const owned = await this.songs.find({ where: { ownerId: user.id }, select: ['id'] });
      const ownedIds = owned.map((song) => song.id);
      if (ownedIds.length > 0) {
        qb.andWhere('(r."requesterId" = :uid OR r."songId" IN (:...ownedIds))', {
          uid: user.id,
          ownedIds,
        });
      } else {
        qb.andWhere('r."requesterId" = :uid', { uid: user.id });
      }
    }

    if (query.status) qb.andWhere('r.status = :status', { status: query.status });
    if (query.songId) qb.andWhere('r."songId" = :songId', { songId: query.songId });
    if (query.mine) qb.andWhere('r."requesterId" = :uid', { uid: user.id });

    qb.orderBy('r.createdAt', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);

    const [items, total] = await qb.getManyAndCount();
    return buildPaginated(await this.enrich(items), total, query.page, query.pageSize);
  }

  async pendingCount(user: AdminUser): Promise<{ count: number }> {
    const qb = this.requests.createQueryBuilder('r').where('r.status = :status', { status: 'pending' });
    const canReviewAll = AclService.has(user.permissions, PERMISSIONS.songApprove) || AclService.isSuper(user.permissions);

    if (!canReviewAll) {
      const owned = await this.songs.find({ where: { ownerId: user.id }, select: ['id'] });
      const ownedIds = owned.map((song) => song.id);
      if (ownedIds.length > 0) {
        qb.andWhere('(r."songId" IN (:...ownedIds))', { ownedIds });
      } else {
        return { count: 0 };
      }
    }

    return { count: await qb.getCount() };
  }

  private async loadForReview(user: AdminUser, id: string) {
    const request = await this.requests.findOne({ where: { id } });
    if (!request) throw new NotFoundException('未找到该修改申请');
    if (request.status !== 'pending') throw new BadRequestException('该申请已处理，无法重复审批');

    const song = await this.songs.findOne({ where: { id: request.songId } });
    if (!this.canReview(user, song)) throw new ForbiddenException('你没有审批该申请的权限');

    return { request, song };
  }

  private async review(
    user: AdminUser,
    id: string,
    status: 'approved' | 'rejected',
    note?: string,
  ): Promise<SongChangeRequest> {
    const { request, song } = await this.loadForReview(user, id);

    if (status === 'approved' && song) {
      Object.assign(song, this.coerceChanges(request.changes as Record<string, unknown>));
      const saved = await this.songs.save(song);
      await this.indexer.indexSong(saved);
    }

    request.status = status;
    request.reviewerId = user.id;
    request.reviewNote = note?.trim() || null;
    request.reviewedAt = new Date();

    const savedRequest = await this.requests.save(request);
    const [dtoOut] = await this.enrich([savedRequest]);
    return dtoOut;
  }

  approve(user: AdminUser, id: string, note?: string): Promise<SongChangeRequest> {
    return this.review(user, id, 'approved', note);
  }

  reject(user: AdminUser, id: string, note?: string): Promise<SongChangeRequest> {
    return this.review(user, id, 'rejected', note);
  }

  /** 歌曲被删除时清理其申请 */
  async removeBySong(songId: string): Promise<void> {
    await this.requests.delete({ songId });
  }

  /** 供 songs 模块判断是否需要走审批 */
  static canEditDirectly(user: AdminUser, song: SongEntity | null): boolean {
    if (AclService.has(user.permissions, PERMISSIONS.songUpdateAny)) return true;
    if (AclService.has(user.permissions, PERMISSIONS.songUpdateOwn) && song?.ownerId === user.id) return true;
    return false;
  }

  async listSongIdsWithPending(): Promise<string[]> {
    const rows = await this.requests.find({ where: { status: 'pending' }, select: ['songId'] });
    return [...new Set(rows.map((row) => row.songId))];
  }
}

export type { Song };
