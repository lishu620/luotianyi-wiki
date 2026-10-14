import { ALL_PERMISSIONS } from '@luotianyi/shared';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GroupsService } from '../modules/groups/groups.service';
import { LinksService } from '../modules/links/links.service';
import { ProfileService } from '../modules/profile/profile.service';
import { RolesService } from '../modules/roles/roles.service';
import { SearchIndexerService } from '../modules/search/search-indexer.service';
import { SongsService } from '../modules/songs/songs.service';
import { UsersService } from '../modules/users/users.service';
import { COMMUNITY_GROUP_SEED } from './community-group-seed-data';
import { LINK_SEED, PROFILE_SEED, SONG_SEED } from './seed-data';

export interface SeedResult {
  admin: string;
  profileSections: number;
  songs: number;
  links: number;
  groups: number;
  skipped: string[];
}

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly users: UsersService,
    private readonly roles: RolesService,
    private readonly songs: SongsService,
    private readonly links: LinksService,
    private readonly groups: GroupsService,
    private readonly profile: ProfileService,
    private readonly indexer: SearchIndexerService,
  ) {}

  /**
   * 写入示例数据。
   * @param force 为 true 时清空既有歌曲/外链后重新写入；简介分节始终按 slug 覆盖。
   */
  async run(force = false): Promise<SeedResult> {
    const skipped: string[] = [];

    // 0. 角色与权限（内置超管 + 预设角色）
    const superRole = await this.roles.ensureSuperRole();
    await this.ensurePresetRoles();
    this.logger.log(`角色就绪（超级管理员角色：${superRole.name}）`);

    // 1. 管理员账号（分配超级管理员角色）
    const adminUsername = this.config.get<string>('admin.username') ?? 'admin';
    const adminPassword = this.config.get<string>('admin.password') ?? 'luotianyi2026';
    await this.users.ensureAdmin({
      username: adminUsername,
      password: adminPassword,
      roleId: superRole.id,
      syncPassword: force,
      syncRole: true,
    });
    this.logger.log(`管理员账号就绪：${adminUsername}`);

    // 2. 介绍页分节（按 slug 覆盖，保证内容可迭代）
    for (const section of PROFILE_SEED) {
      await this.profile.upsertBySlug(section);
    }
    this.logger.log(`介绍页分节写入完成：${PROFILE_SEED.length} 节`);

    // 3. 歌曲
    let songCount = 0;
    const existingSongs = await this.songs.count();
    if (existingSongs > 0 && !force) {
      skipped.push(`songs(已有 ${existingSongs} 条)`);
      this.logger.warn(`已存在 ${existingSongs} 首歌曲，跳过写入（使用 --force 可覆盖）`);
    } else {
      if (force && existingSongs > 0) {
        const all = await this.songs.findAll({ page: 1, pageSize: 100 });
        await this.songs.removeMany(all.items.map((item) => item.id));
      }
      const created = await this.songs.createMany(SONG_SEED);
      songCount = created.length;
      this.logger.log(`示例歌曲写入完成：${songCount} 首`);
    }

    // 4. 外链站点
    let linkCount = 0;
    const existingLinks = await this.links.count();
    if (existingLinks > 0 && !force) {
      skipped.push(`links(已有 ${existingLinks} 条)`);
      this.logger.warn(`已存在 ${existingLinks} 个外链站点，跳过写入（使用 --force 可覆盖）`);
    } else {
      if (force && existingLinks > 0) {
        const all = await this.links.findAll({ page: 1, pageSize: 100 });
        await this.links.removeMany(all.items.map((item) => item.id));
      }
      for (const link of LINK_SEED) {
        await this.links.create(link);
        linkCount += 1;
      }
      this.logger.log(`示例外链写入完成：${linkCount} 个`);
    }

    // 5. 中V群聊
    let groupCount = 0;
    const existingGroups = await this.groups.count();
    if (existingGroups > 0 && !force) {
      skipped.push(`groups(已有 ${existingGroups} 条)`);
      this.logger.warn(`已存在 ${existingGroups} 个群聊，跳过写入（使用 --force 可覆盖）`);
    } else {
      if (force && existingGroups > 0) {
        await this.groups.clear();
      }
      const created = await this.groups.createMany(COMMUNITY_GROUP_SEED);
      groupCount = created.length;
      this.logger.log(`群聊导航写入完成：${groupCount} 个`);
    }

    // 6. 重建搜索索引
    const reindexResult = await this.indexer.reindexAll();
    if (!reindexResult.meilisearchReady) {
      this.logger.warn('Meilisearch 未就绪，搜索索引未写入（运行时检索会自动降级到 PostgreSQL）');
    }

    return {
      admin: adminUsername,
      profileSections: PROFILE_SEED.length,
      songs: songCount,
      links: linkCount,
      groups: groupCount,
      skipped,
    };
  }

  /** 预设几个常用角色，方便开箱即用（已存在则跳过） */
  private async ensurePresetRoles(): Promise<void> {
    const presets: Array<{ name: string; description: string; permissions: string[] }> = [
      {
        name: '注册用户',
        description: '自助注册用户，可使用扩列等公开功能',
        permissions: [],
      },
      {
        name: '站点管理员',
        description: '除用户与角色管理外的全部权限',
        permissions: ALL_PERMISSIONS.filter(
          (key) => !key.startsWith('user.') && !key.startsWith('role.'),
        ),
      },
      {
        name: '内容编辑',
        description: '可管理全部歌曲 / 外链 / 群聊与介绍页',
        permissions: [
          'song.create',
          'song.update.any',
          'song.delete',
          'song.approve',
          'link.create',
          'link.update.any',
          'link.delete',
          'group.create',
          'group.update.any',
          'group.delete',
          'profile.update',
        ],
      },
      {
        name: '投稿用户',
        description: '投稿歌曲，发布与修改自己的群聊和外链',
        permissions: [
          'song.create',
          'song.update.own',
          'link.create',
          'link.update.own',
          'group.create',
          'group.update.own',
        ],
      },
    ];

    for (const preset of presets) {
      const existing = await this.roles.findByName(preset.name);
      if (!existing) {
        await this.roles.create(preset);
        this.logger.log(`已创建预设角色：${preset.name}`);
      }
    }
  }
}
