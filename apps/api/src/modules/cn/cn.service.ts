import {
  CN_CONTACT_KEYS,
  type CnBilibiliProfile,
  type CnCardStyle,
  type CnGender,
  type CnProfile,
  type CnPurpose,
  type CnSort,
  type CnStatus,
  type Paginated,
} from '@luotianyi/shared';
import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { buildPaginated, escapeLikeKeyword, normalizeStringArray } from '../../common/utils';
import { CnLikeEntity } from '../../entities/cn-like.entity';
import { CnProfileEntity } from '../../entities/cn-profile.entity';
import { UserEntity } from '../../entities/user.entity';
import { QueryCnDto, UpsertCnProfileDto } from './dto/cn.dto';

interface ViewerContext {
  viewerId?: string;
  outgoing: Set<string>;
  incoming: Set<string>;
}

@Injectable()
export class CnService {
  constructor(
    @InjectRepository(CnProfileEntity)
    private readonly profiles: Repository<CnProfileEntity>,
    @InjectRepository(CnLikeEntity)
    private readonly likes: Repository<CnLikeEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  /* ------------------------------------------------------------ 工具 */

  private toContactMap(input?: Record<string, unknown>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const key of CN_CONTACT_KEYS) {
      const value = input?.[key];
      const text = value === undefined || value === null ? '' : String(value).trim();
      if (text) out[key] = text.slice(0, 120);
    }
    return out;
  }

  private async viewerContext(viewerId?: string): Promise<ViewerContext> {
    if (!viewerId) return { outgoing: new Set(), incoming: new Set() };

    const rows = await this.likes.find({
      where: [{ fromUserId: viewerId }, { toUserId: viewerId }],
    });

    const outgoing = new Set<string>();
    const incoming = new Set<string>();
    for (const row of rows) {
      if (row.fromUserId === viewerId) outgoing.add(row.toUserId);
      if (row.toUserId === viewerId) incoming.add(row.fromUserId);
    }

    return { viewerId, outgoing, incoming };
  }

  private async userNameMap(ids: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(ids)].filter(Boolean);
    if (unique.length === 0) return new Map();

    const users = await this.users.find({ where: { id: In(unique) }, select: ['id', 'username'] });
    return new Map(users.map((user) => [user.id, user.username]));
  }

  /* ------------------------------------------------------------ B 站头像 */

  private readonly biliCache = new Map<string, { expiresAt: number; value: CnBilibiliProfile }>();

  /** B 站风控要求的设备标识（buvid3），碰到 -352 会换一个重试 */
  private biliBuvid = CnService.randomBuvid();

  private static randomBuvid(): string {
    const chunk = (size: number) =>
      Array.from({ length: size }, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join('');
    return `${chunk(8)}-${chunk(4)}-${chunk(4)}-${chunk(4)}-${chunk(12)}infoc`;
  }

  /** 从 UID / 主页链接中提取纯数字 mid */
  private static extractMid(input: string): string | null {
    const text = String(input ?? '').trim();
    if (!text) return null;
    if (/^\d{1,15}$/.test(text)) return text;
    const space = text.match(/space\.bilibili\.com\/(\d{1,15})/i);
    if (space) return space[1];
    const any = text.match(/(\d{4,15})/);
    return any ? any[1] : null;
  }

  /** B 站图片直链统一转 https，并换成小尺寸 webp */
  private static normalizeFace(face?: string): string | null {
    const text = (face ?? '').trim();
    if (!text) return null;
    const https = text.replace(/^http:\/\//i, 'https://');
    if (https.includes('@') || !/hdslb\.com/i.test(https)) return https;
    return `${https}@200w_200h_1c.webp`;
  }

  private async requestBilibili(mid: string, buvid: string): Promise<CnBilibiliProfile> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(
        `https://api.bilibili.com/x/web-interface/card?mid=${mid}&photo=false`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Referer: `https://space.bilibili.com/${mid}`,
            Origin: 'https://space.bilibili.com',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            Accept: 'application/json, text/plain, */*',
            // 不带 buvid3 时 B 站会直接返回 -352 风控
            Cookie: `buvid3=${buvid}`,
          },
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new ServiceUnavailableException(`B 站接口返回 ${response.status}`);
      }

      const json = (await response.json()) as {
        code?: number;
        message?: string;
        data?: { card?: { mid?: string | number; name?: string; face?: string } };
      };

      if (json.code === -352 || json.code === -412) {
        throw new ServiceUnavailableException('B 站风控拦截，请稍后重试');
      }

      if (json.code !== 0) {
        throw new NotFoundException(json.message || '未找到该 B 站账号');
      }

      const face = CnService.normalizeFace(json.data?.card?.face);
      if (!face) throw new NotFoundException('该 B 站账号没有公开头像');

      return {
        mid: String(json.data?.card?.mid ?? mid),
        name: json.data?.card?.name?.trim() || null,
        avatarUrl: face,
        spaceUrl: `https://space.bilibili.com/${mid}`,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException('无法连接 B 站接口，请稍后重试或手动填写头像地址');
    } finally {
      clearTimeout(timer);
    }
  }

  /** 按 B 站 UID / 主页链接获取头像与昵称（带 10 分钟内存缓存） */
  async fetchBilibiliProfile(input: string): Promise<CnBilibiliProfile> {
    const mid = CnService.extractMid(input);
    if (!mid) throw new BadRequestException('请填写正确的 B 站 UID 或主页链接');

    const cached = this.biliCache.get(mid);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    let value: CnBilibiliProfile;
    try {
      value = await this.requestBilibili(mid, this.biliBuvid);
    } catch (error) {
      // 风控 / 网络波动：换一个设备标识重试一次
      if (!(error instanceof ServiceUnavailableException)) throw error;
      this.biliBuvid = CnService.randomBuvid();
      value = await this.requestBilibili(mid, this.biliBuvid);
    }

    if (this.biliCache.size > 300) this.biliCache.clear();
    this.biliCache.set(mid, { expiresAt: Date.now() + 10 * 60 * 1000, value });

    return value;
  }

  private toDto(
    profile: CnProfileEntity,
    names: Map<string, string>,
    ctx: ViewerContext,
    forceVisible = false,
  ): CnProfile {
    const likedByMe = Boolean(ctx.viewerId && ctx.outgoing.has(profile.userId));
    const mutualWithMe = Boolean(
      ctx.viewerId && ctx.outgoing.has(profile.userId) && ctx.incoming.has(profile.userId),
    );
    const isOwner = ctx.viewerId === profile.userId;
    const unlocked = forceVisible || isOwner || mutualWithMe;

    return {
      id: profile.id,
      userId: profile.userId,
      authorUsername: names.get(profile.userId) ?? null,
      cn: profile.cn,
      avatarUrl: profile.avatarUrl,
      bilibiliUid: profile.bilibiliUid ?? null,
      cardStyle: profile.cardStyle ?? 'classic',
      gender: profile.gender,
      age: profile.age,
      region: profile.region,
      personality: profile.personality,
      declaration: profile.declaration,
      interests: profile.interests ?? [],
      lookingFor: profile.lookingFor ?? [],
      purpose: profile.purpose ?? 'display',
      contacts: unlocked ? { ...(profile.contacts ?? {}) } : {},
      contactsVisible: unlocked,
      status: profile.status,
      viewCount: profile.viewCount,
      likeCount: profile.likeCount,
      likedByMe,
      mutualWithMe,
      createdAt: new Date(profile.createdAt).toISOString(),
      updatedAt: new Date(profile.updatedAt).toISOString(),
    };
  }

  private async mapMany(
    profiles: CnProfileEntity[],
    ctx: ViewerContext,
    forceVisible = false,
  ): Promise<CnProfile[]> {
    const names = await this.userNameMap(profiles.map((profile) => profile.userId));
    return profiles.map((profile) => this.toDto(profile, names, ctx, forceVisible));
  }

  /* ------------------------------------------------------------ 公开查询 */

  async findAll(query: QueryCnDto, viewerId?: string): Promise<Paginated<CnProfile>> {
    const qb = this.profiles.createQueryBuilder('p').where('p.status = :status', { status: 'visible' });
    if (viewerId) qb.andWhere('p."userId" != :viewerId', { viewerId });

    if (query.keyword?.trim()) {
      const kw = `%${escapeLikeKeyword(query.keyword.trim())}%`;
      qb.andWhere(
        `(p.cn ILIKE :kw OR coalesce(p.declaration,'') ILIKE :kw OR coalesce(p.personality,'') ILIKE :kw OR array_to_string(p.interests,' ') ILIKE :kw OR array_to_string(p.lookingFor,' ') ILIKE :kw)`,
        { kw },
      );
    }
    if (query.interest) qb.andWhere(':interest = ANY(p.interests)', { interest: query.interest });
    if (query.region) {
      qb.andWhere('p.region ILIKE :region', { region: `%${escapeLikeKeyword(query.region)}%` });
    }
    if (query.gender) qb.andWhere('p.gender = :gender', { gender: query.gender });
    if (query.purpose) qb.andWhere('p.purpose = :purpose', { purpose: query.purpose });

    const sort: CnSort = query.sort ?? 'latest';
    if (sort === 'active') {
      qb.orderBy('p.likeCount', 'DESC').addOrderBy('p.viewCount', 'DESC');
    } else if (sort === 'random') {
      qb.orderBy('RANDOM()');
    } else {
      qb.orderBy('p.createdAt', 'DESC');
    }

    qb.skip((query.page - 1) * query.pageSize).take(query.pageSize);

    const [items, total] = await qb.getManyAndCount();
    const ctx = await this.viewerContext(viewerId);
    return buildPaginated(await this.mapMany(items, ctx), total, query.page, query.pageSize);
  }

  /** 心动推荐：按兴趣标签重合度排序（无登录时退化为热门） */
  async findHeart(viewerId: string | undefined, limit = 12): Promise<CnProfile[]> {
    const qb = this.profiles.createQueryBuilder('p').where('p.status = :status', { status: 'visible' });
    if (viewerId) qb.andWhere('p."userId" != :viewerId', { viewerId });
    qb.orderBy('p.likeCount', 'DESC').addOrderBy('p.viewCount', 'DESC').limit(200);

    const candidates = await qb.getMany();
    const ctx = await this.viewerContext(viewerId);

    const mine = viewerId ? await this.profiles.findOne({ where: { userId: viewerId } }) : null;
    const myTags = new Set(mine?.interests ?? []);

    const scored = candidates.map((profile) => {
      const tags = profile.interests ?? [];
      const overlap = tags.filter((tag) => myTags.has(tag)).length;
      const union = new Set([...tags, ...myTags]).size || 1;
      const score = myTags.size > 0 ? overlap / union : 0;
      const jitter = Math.random() * 0.05;
      return { profile, score: score + jitter };
    });

    scored.sort((a, b) => b.score - a.score || b.profile.likeCount - a.profile.likeCount);

    return this.mapMany(
      scored.slice(0, limit).map((item) => item.profile),
      ctx,
    );
  }

  async findOne(id: string, viewerId?: string, forceVisible = false): Promise<CnProfile> {
    const profile = await this.profiles.findOne({ where: { id } });
    if (!profile) throw new NotFoundException('未找到该扩列条');

    await this.profiles.increment({ id }, 'viewCount', 1);
    profile.viewCount += 1;

    const ctx = await this.viewerContext(viewerId);
    const names = await this.userNameMap([profile.userId]);
    return this.toDto(profile, names, ctx, forceVisible);
  }

  async getFilters(): Promise<{ interests: { value: string; count: number }[]; regions: string[] }> {
    const interestRows = (await this.profiles.query(
      `SELECT tag AS value, COUNT(*)::int AS count FROM cn_profiles, unnest(interests) AS tag
       WHERE status = 'visible' GROUP BY tag ORDER BY count DESC, tag ASC LIMIT 30`,
    )) as Array<{ value: string; count: number }>;

    const regionRows = (await this.profiles.query(
      `SELECT region FROM cn_profiles WHERE status = 'visible' AND region IS NOT NULL AND region <> ''
       GROUP BY region ORDER BY COUNT(*) DESC LIMIT 30`,
    )) as Array<{ region: string }>;

    return {
      interests: interestRows.map((row) => ({ value: row.value, count: Number(row.count) })),
      regions: regionRows.map((row) => row.region),
    };
  }

  /* ------------------------------------------------------------ 心动 */

  async like(profileId: string, viewerId: string): Promise<{ liked: boolean; mutual: boolean; likeCount: number }> {
    const profile = await this.profiles.findOne({ where: { id: profileId } });
    if (!profile) throw new NotFoundException('未找到该扩列条');
    if (profile.userId === viewerId) throw new BadRequestException('不能对自己心动');

    const existing = await this.likes.findOne({
      where: { fromUserId: viewerId, toUserId: profile.userId },
    });

    let liked = true;
    if (existing) {
      await this.likes.remove(existing);
      liked = false;
    } else {
      await this.likes.save(this.likes.create({ fromUserId: viewerId, toUserId: profile.userId }));
    }

    profile.likeCount = await this.likes.count({ where: { toUserId: profile.userId } });
    await this.profiles.save(profile);

    const reverse = await this.likes.findOne({
      where: { fromUserId: profile.userId, toUserId: viewerId },
    });

    return { liked, mutual: Boolean(liked && reverse), likeCount: profile.likeCount };
  }

  /** 我看过/我对谁心动过 */
  async findMyLikes(userId: string): Promise<string[]> {
    const rows = await this.likes.find({ where: { fromUserId: userId }, select: ['toUserId'] });
    return rows.map((row) => row.toUserId);
  }

  /* ------------------------------------------------------------ 我的扩列条 */

  async findMine(userId: string): Promise<CnProfile | null> {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) return null;

    const ctx = await this.viewerContext(userId);
    const names = await this.userNameMap([userId]);
    return this.toDto(profile, names, ctx, true);
  }

  async upsertMine(userId: string, dto: UpsertCnProfileDto): Promise<CnProfile> {
    const rawBilibili = dto.bilibiliUid?.trim() ?? '';
    const data = {
      cn: dto.cn.trim(),
      avatarUrl: dto.avatarUrl?.trim() || null,
      bilibiliUid: rawBilibili ? CnService.extractMid(rawBilibili) : null,
      cardStyle: (dto.cardStyle ?? 'classic') as CnCardStyle,
      gender: (dto.gender ?? 'secret') as CnGender,
      age: dto.age ?? null,
      region: dto.region?.trim() || null,
      personality: dto.personality?.trim() || null,
      declaration: dto.declaration?.trim() || null,
      interests: normalizeStringArray(dto.interests, 20),
      lookingFor: normalizeStringArray(dto.lookingFor, 20),
      purpose: (dto.purpose ?? 'display') as CnPurpose,
      contacts: this.toContactMap(dto.contacts as Record<string, unknown> | undefined),
      status: (dto.status ?? 'visible') as CnStatus,
    };

    // 只填了 B 站 UID 时，自动同步 B 站头像（B 站不可用也不影响保存）
    if (!data.avatarUrl && data.bilibiliUid) {
      try {
        data.avatarUrl = (await this.fetchBilibiliProfile(data.bilibiliUid)).avatarUrl;
      } catch {
        // 忽略：用户可以稍后在页面上手动点「同步头像」重试
      }
    }

    let profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) {
      profile = this.profiles.create({ userId, ...data });
    } else {
      Object.assign(profile, data);
    }

    const saved = await this.profiles.save(profile);
    const ctx = await this.viewerContext(userId);
    const names = await this.userNameMap([userId]);
    return this.toDto(saved, names, ctx, true);
  }

  async removeMine(userId: string): Promise<{ success: boolean }> {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) return { success: true };

    await this.profiles.remove(profile);
    await this.likes.delete([{ fromUserId: userId }, { toUserId: userId }]);
    return { success: true };
  }

  /* ------------------------------------------------------------ 后台管理 */

  async adminList(query: QueryCnDto): Promise<Paginated<CnProfile>> {
    const qb = this.profiles.createQueryBuilder('p').where('1 = 1');

    if (query.keyword?.trim()) {
      qb.andWhere('(p.cn ILIKE :kw OR coalesce(p.declaration,\'\') ILIKE :kw)', {
        kw: `%${escapeLikeKeyword(query.keyword.trim())}%`,
      });
    }
    qb.orderBy('p.createdAt', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);

    const [items, total] = await qb.getManyAndCount();
    const ctx = await this.viewerContext(undefined);
    return buildPaginated(await this.mapMany(items, ctx, true), total, query.page, query.pageSize);
  }

  async adminSetStatus(id: string, status: CnStatus): Promise<CnProfile> {
    const profile = await this.profiles.findOne({ where: { id } });
    if (!profile) throw new NotFoundException('未找到该扩列条');

    profile.status = status;
    const saved = await this.profiles.save(profile);
    const ctx = await this.viewerContext(undefined);
    const names = await this.userNameMap([saved.userId]);
    return this.toDto(saved, names, ctx, true);
  }

  async adminRemove(id: string): Promise<{ success: boolean }> {
    const profile = await this.profiles.findOne({ where: { id } });
    if (!profile) throw new NotFoundException('未找到该扩列条');

    await this.profiles.remove(profile);
    await this.likes.delete([{ fromUserId: profile.userId }, { toUserId: profile.userId }]);
    return { success: true };
  }

  count(): Promise<number> {
    return this.profiles.count();
  }
}
