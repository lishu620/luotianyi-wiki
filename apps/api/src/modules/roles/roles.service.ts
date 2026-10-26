import { ALL_PERMISSIONS, type Role } from '@luotianyi/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { RoleEntity } from '../../entities/role.entity';
import { UserEntity } from '../../entities/user.entity';
import { AclService } from '../acl/acl.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

/** 内置超级管理员角色名（不可删除、不可改名，权限恒为 `*`） */
export const SUPER_ROLE_NAME = '超级管理员';

/** 自助注册用户的默认角色名 */
export const REGISTER_ROLE_NAME = '注册用户';

/** 注册用户默认拥有的表情广场权限（可创建 / 管理自己的表情包） */
export const REGISTER_DEFAULT_PERMISSIONS = [
  'emoji.create',
  'emoji.update.own',
  'emoji.delete.own',
];

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roles: Repository<RoleEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly acl: AclService,
  ) {}

  private toRole(role: RoleEntity, userCount = 0): Role {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions ?? [],
      builtin: role.builtin,
      userCount,
      createdAt: new Date(role.createdAt).toISOString(),
      updatedAt: new Date(role.updatedAt).toISOString(),
    };
  }

  /** 只保留合法权限键（`*` 不允许通过接口下发，避免任意提权） */
  private sanitizePermissions(input?: string[]): string[] {
    if (!Array.isArray(input)) return [];
    const valid = new Set(ALL_PERMISSIONS);
    return [...new Set(input.filter((key) => valid.has(key)))];
  }

  private async userCounts(): Promise<Map<string, number>> {
    const rows = await this.users
      .createQueryBuilder('u')
      .select('u."roleId"', 'roleId')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('u."roleId"')
      .getRawMany<{ roleId: string | null; count: number }>();

    return new Map(rows.map((row) => [row.roleId ?? '', Number(row.count)]));
  }

  async findAll(): Promise<Role[]> {
    const [roles, counts] = await Promise.all([
      this.roles.find({ order: { builtin: 'DESC', createdAt: 'ASC' } }),
      this.userCounts(),
    ]);

    return roles.map((role) => this.toRole(role, counts.get(role.id) ?? 0));
  }

  async findOne(id: string): Promise<RoleEntity> {
    const role = await this.roles.findOne({ where: { id } });
    if (!role) throw new NotFoundException('未找到该角色');
    return role;
  }

  async findByName(name: string): Promise<RoleEntity | null> {
    return this.roles.findOne({ where: { name } });
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    const name = dto.name.trim();
    const exists = await this.findByName(name);
    if (exists) throw new BadRequestException('角色名已存在');

    const role = await this.roles.save(
      this.roles.create({
        name,
        description: dto.description?.trim() || null,
        permissions: this.sanitizePermissions(dto.permissions),
        builtin: false,
      }),
    );

    return this.toRole(role, 0);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    if (dto.name !== undefined && dto.name.trim() !== role.name) {
      if (role.builtin) throw new BadRequestException('内置角色不可改名');
      const exists = await this.roles.findOne({ where: { name: dto.name.trim(), id: Not(id) } });
      if (exists) throw new BadRequestException('角色名已存在');
      role.name = dto.name.trim();
    }

    if (dto.description !== undefined) role.description = dto.description?.trim() || null;

    // 内置超管角色权限恒为 '*'
    if (dto.permissions !== undefined && !role.builtin) {
      role.permissions = this.sanitizePermissions(dto.permissions);
    }

    const saved = await this.roles.save(role);
    this.acl.invalidate();

    const counts = await this.userCounts();
    return this.toRole(saved, counts.get(saved.id) ?? 0);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const role = await this.findOne(id);
    if (role.builtin) throw new BadRequestException('内置角色不可删除');

    const inUse = await this.users.count({ where: { roleId: id } });
    if (inUse > 0) throw new BadRequestException(`仍有 ${inUse} 个用户使用该角色，请先调整后再删除`);

    await this.roles.remove(role);
    this.acl.invalidate();
    return { success: true };
  }

  /** 确保内置超级管理员角色存在 */
  async ensureSuperRole(): Promise<RoleEntity> {
    const existing = await this.findByName(SUPER_ROLE_NAME);
    if (existing) {
      if (!existing.builtin || !existing.permissions.includes('*')) {
        existing.builtin = true;
        existing.permissions = ['*'];
        return this.roles.save(existing);
      }
      return existing;
    }

    const created = await this.roles.save(
      this.roles.create({
        name: SUPER_ROLE_NAME,
        description: '内置角色：拥有全部权限，不可删除',
        permissions: ['*'],
        builtin: true,
      }),
    );
    this.acl.invalidate();
    return created;
  }

  /** 确保「注册用户」角色存在（自助注册时分配），并补齐表情广场默认权限 */
  async ensureUserRole(): Promise<RoleEntity> {
    const existing = await this.findByName(REGISTER_ROLE_NAME);
    if (existing) {
      const merged = [...new Set([...(existing.permissions ?? []), ...REGISTER_DEFAULT_PERMISSIONS])];
      if (merged.length !== (existing.permissions?.length ?? 0)) {
        existing.permissions = merged;
        const saved = await this.roles.save(existing);
        this.acl.invalidate();
        return saved;
      }
      return existing;
    }

    const created = await this.roles.save(
      this.roles.create({
        name: REGISTER_ROLE_NAME,
        description: '自助注册用户，可创建并管理自己的表情包',
        permissions: [...REGISTER_DEFAULT_PERMISSIONS],
        builtin: false,
      }),
    );
    this.acl.invalidate();
    return created;
  }
}
