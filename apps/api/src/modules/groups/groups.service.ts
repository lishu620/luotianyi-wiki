import type { CommunityGroupSection, Paginated } from '@luotianyi/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { buildPaginated, escapeLikeKeyword } from '../../common/utils';
import { CommunityGroupEntity } from '../../entities/community-group.entity';
import { CreateGroupDto, UpdateGroupDto } from './dto/create-group.dto';
import { QueryGroupsDto } from './dto/query-groups.dto';

export interface CommunityGroupGroup {
  section: CommunityGroupSection;
  groups: CommunityGroupEntity[];
}

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(CommunityGroupEntity)
    private readonly repo: Repository<CommunityGroupEntity>,
  ) {}

  private async paginate(
    query: QueryGroupsDto,
    includeDraft: boolean,
    ownerId?: string,
  ): Promise<Paginated<CommunityGroupEntity>> {
    const qb = this.repo.createQueryBuilder('g').where('1 = 1');

    if (includeDraft) {
      if (query.status) qb.andWhere('g.status = :status', { status: query.status });
    } else {
      qb.andWhere('g.status = :status', { status: 'published' });
    }

    if (query.section) qb.andWhere('g.section = :section', { section: query.section });
    if (ownerId) qb.andWhere('g."ownerId" = :ownerId', { ownerId });

    if (query.keyword?.trim()) {
      const kw = `%${escapeLikeKeyword(query.keyword.trim())}%`;
      qb.andWhere(
        `(g.name ILIKE :kw OR g.number ILIKE :kw OR coalesce(g.note, '') ILIKE :kw)`,
        { kw },
      );
    }

    qb.orderBy('g.sortOrder', 'ASC')
      .addOrderBy('g.createdAt', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);

    const [items, total] = await qb.getManyAndCount();
    return buildPaginated(items, total, query.page, query.pageSize);
  }

  findAll(query: QueryGroupsDto, ownerId?: string): Promise<Paginated<CommunityGroupEntity>> {
    return this.paginate(query, true, ownerId);
  }

  findPublished(query: QueryGroupsDto): Promise<Paginated<CommunityGroupEntity>> {
    return this.paginate(query, false);
  }

  /** 前台群聊导航页：按栏目分组返回全部已发布群聊 */
  async findGrouped(): Promise<CommunityGroupGroup[]> {
    const groups = await this.repo.find({
      where: { status: 'published' },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    const map = new Map<CommunityGroupSection, CommunityGroupEntity[]>();
    for (const group of groups) {
      const bucket = map.get(group.section) ?? [];
      bucket.push(group);
      map.set(group.section, bucket);
    }

    return [...map.entries()].map(([section, list]) => ({ section, groups: list }));
  }

  async getSectionCounts(): Promise<Array<{ section: CommunityGroupSection; count: number }>> {
    const rows = (await this.repo.query(
      `SELECT section, COUNT(*)::int AS count FROM community_groups WHERE status = 'published' GROUP BY section`,
    )) as Array<{ section: CommunityGroupSection; count: number }>;

    return rows.map((row) => ({ section: row.section, count: Number(row.count) }));
  }

  async findOne(id: string): Promise<CommunityGroupEntity> {
    const group = await this.repo.findOne({ where: { id } });
    if (!group) throw new NotFoundException('未找到该群聊');
    return group;
  }

  async findOnePublished(id: string): Promise<CommunityGroupEntity> {
    const group = await this.repo.findOne({ where: { id, status: 'published' } });
    if (!group) throw new NotFoundException('未找到该群聊');
    return group;
  }

  private normalize(dto: CreateGroupDto): Partial<CommunityGroupEntity> {
    return {
      name: dto.name?.trim(),
      number: dto.number?.trim(),
      level: dto.level?.trim() || null,
      note: dto.note?.trim() || null,
      section: dto.section ?? 'other',
      sortOrder: dto.sortOrder ?? 0,
      status: dto.status ?? 'published',
    };
  }

  async create(dto: CreateGroupDto, ownerId?: string | null): Promise<CommunityGroupEntity> {
    return this.repo.save(this.repo.create({ ...this.normalize(dto), ownerId: ownerId ?? null }));
  }

  async update(id: string, dto: UpdateGroupDto): Promise<CommunityGroupEntity> {
    const group = await this.findOne(id);
    const patch = this.normalize(dto as CreateGroupDto) as Record<string, unknown>;

    for (const key of Object.keys(dto)) {
      const value = patch[key];
      if (value !== undefined) {
        (group as unknown as Record<string, unknown>)[key] = value;
      }
    }

    return this.repo.save(group);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const group = await this.findOne(id);
    await this.repo.remove(group);
    return { success: true };
  }

  async removeMany(ids: string[]): Promise<{ deleted: number }> {
    if (ids.length === 0) return { deleted: 0 };
    await this.repo.delete({ id: In(ids) });
    return { deleted: ids.length };
  }

  count(): Promise<number> {
    return this.repo.count();
  }

  async createMany(items: Array<Partial<CommunityGroupEntity>>): Promise<CommunityGroupEntity[]> {
    return this.repo.save(this.repo.create(items));
  }

  /** 清空全部群聊（仅用于 seed --force） */
  async clear(): Promise<void> {
    await this.repo.clear();
  }
}
