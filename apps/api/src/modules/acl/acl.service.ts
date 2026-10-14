import { SUPER_PERMISSION } from '@luotianyi/shared';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from '../../entities/role.entity';
import { UserEntity } from '../../entities/user.entity';

export interface AclContext {
  userId: string;
  username: string;
  roleId: string | null;
  roleName: string | null;
  permissions: string[];
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

/**
 * 解析「用户 → 角色 → 权限」，带 30s 内存缓存。
 * 角色/用户变更后调用 invalidate() 立即失效。
 */
@Injectable()
export class AclService {
  private readonly cache = new Map<string, { value: AclContext; at: number }>();
  private readonly ttlMs = 30_000;

  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(RoleEntity) private readonly roles: Repository<RoleEntity>,
  ) {}

  async resolve(userId: string): Promise<AclContext | null> {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.at < this.ttlMs) return cached.value;

    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) return null;

    const role = user.roleId ? await this.roles.findOne({ where: { id: user.roleId } }) : null;
    const value: AclContext = {
      userId: user.id,
      username: user.username,
      roleId: user.roleId,
      roleName: role?.name ?? null,
      permissions: role?.permissions ?? [],
      active: user.active,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };

    this.cache.set(userId, { value, at: Date.now() });
    return value;
  }

  invalidate(userId?: string): void {
    if (userId) this.cache.delete(userId);
    else this.cache.clear();
  }

  /** 权限判断：拥有 '*' 或包含目标权限即通过 */
  static has(permissions: string[] | undefined, required: string): boolean {
    if (!permissions) return false;
    return permissions.includes(SUPER_PERMISSION) || permissions.includes(required);
  }

  static hasAll(permissions: string[] | undefined, required: string[]): boolean {
    return required.every((key) => AclService.has(permissions, key));
  }

  static isSuper(permissions: string[] | undefined): boolean {
    return Boolean(permissions?.includes(SUPER_PERMISSION));
  }
}
