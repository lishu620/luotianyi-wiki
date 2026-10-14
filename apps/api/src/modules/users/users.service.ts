import type { AdminUser, Paginated } from '@luotianyi/shared';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Not, Repository } from 'typeorm';
import { buildPaginated, escapeLikeKeyword } from '../../common/utils';
import { RoleEntity } from '../../entities/role.entity';
import { UserEntity } from '../../entities/user.entity';
import { AclService } from '../acl/acl.service';
import { CreateUserDto, QueryUsersDto, UpdateUserDto } from './dto/user.dto';

export const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roles: Repository<RoleEntity>,
    private readonly acl: AclService,
  ) {}

  findByUsername(username: string): Promise<UserEntity | null> {
    return this.users.findOne({ where: { username } });
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.users.findOne({ where: { id } });
  }

  count(): Promise<number> {
    return this.users.count();
  }

  hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /* ---------------------------------------------------------------- 用户管理 */

  private toAdminUser(user: UserEntity, role: RoleEntity | null): AdminUser {
    return {
      id: user.id,
      username: user.username,
      roleId: user.roleId,
      roleName: role?.name ?? null,
      permissions: role?.permissions ?? [],
      active: user.active,
      lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : null,
      createdAt: new Date(user.createdAt).toISOString(),
    };
  }

  async findAll(query: QueryUsersDto): Promise<Paginated<AdminUser>> {
    const qb = this.users.createQueryBuilder('u').where('1 = 1');

    if (query.keyword?.trim()) {
      qb.andWhere('u.username ILIKE :kw', { kw: `%${escapeLikeKeyword(query.keyword.trim())}%` });
    }
    if (query.roleId) qb.andWhere('u."roleId" = :roleId', { roleId: query.roleId });
    if (query.active !== undefined) qb.andWhere('u.active = :active', { active: query.active });

    qb.orderBy('u.createdAt', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);

    const [items, total] = await qb.getManyAndCount();
    const roles = await this.roles.find();
    const roleMap = new Map(roles.map((role) => [role.id, role]));

    return buildPaginated(
      items.map((user) => this.toAdminUser(user, roleMap.get(user.roleId ?? '') ?? null)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async findOneAsAdmin(id: string): Promise<AdminUser> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('未找到该用户');

    const role = user.roleId ? await this.roles.findOne({ where: { id: user.roleId } }) : null;
    return this.toAdminUser(user, role);
  }

  private async roleOf(user: UserEntity): Promise<RoleEntity | null> {
    return user.roleId ? this.roles.findOne({ where: { id: user.roleId } }) : null;
  }

  private static isSuperRole(role: RoleEntity | null): boolean {
    return Boolean(role?.permissions?.includes('*'));
  }

  /** 超管保护：避免把最后一个启用中的超管改角色 / 停用 / 删除，导致无法再管理 */
  private async assertNotLastSuper(user: UserEntity, action: string): Promise<void> {
    if (!UsersService.isSuperRole(await this.roleOf(user))) return;

    const actives = await this.users.find({ where: { active: true } });
    let superCount = 0;
    for (const item of actives) {
      if (UsersService.isSuperRole(await this.roleOf(item))) superCount += 1;
    }

    if (superCount <= 1) {
      throw new BadRequestException(`系统至少需要保留一个启用中的超级管理员，无法${action}`);
    }
  }

  async create(dto: CreateUserDto): Promise<AdminUser> {
    const username = dto.username.trim();
    if (await this.findByUsername(username)) throw new BadRequestException('用户名已存在');

    if (dto.roleId) {
      const role = await this.roles.findOne({ where: { id: dto.roleId } });
      if (!role) throw new BadRequestException('所选角色不存在');
    }

    const user = await this.users.save(
      this.users.create({
        username,
        passwordHash: await this.hashPassword(dto.password),
        roleId: dto.roleId ?? null,
        active: dto.active ?? true,
      }),
    );

    this.logger.log(`已创建用户：${username}`);
    return this.toAdminUser(user, await this.roleOf(user));
  }

  async update(id: string, dto: UpdateUserDto): Promise<AdminUser> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('未找到该用户');

    if (dto.username !== undefined && dto.username.trim() !== user.username) {
      const exists = await this.users.findOne({
        where: { username: dto.username.trim(), id: Not(id) },
      });
      if (exists) throw new BadRequestException('用户名已存在');
      user.username = dto.username.trim();
    }

    if (dto.roleId !== undefined && dto.roleId !== user.roleId) {
      await this.assertNotLastSuper(user, '变更其角色');
      if (dto.roleId) {
        const role = await this.roles.findOne({ where: { id: dto.roleId } });
        if (!role) throw new BadRequestException('所选角色不存在');
      }
      user.roleId = dto.roleId ?? null;
    }

    if (dto.active !== undefined && dto.active !== user.active) {
      if (!dto.active) await this.assertNotLastSuper(user, '停用该账号');
      user.active = dto.active;
    }

    if (dto.password) user.passwordHash = await this.hashPassword(dto.password);

    const saved = await this.users.save(user);
    this.acl.invalidate(id);
    return this.toAdminUser(saved, await this.roleOf(saved));
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('未找到该用户');

    await this.assertNotLastSuper(user, '删除该账号');
    await this.users.remove(user);
    this.acl.invalidate(id);
    return { success: true };
  }

  async resetPassword(id: string, password: string): Promise<{ success: boolean }> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('未找到该用户');

    await this.updatePassword(id, password);
    return { success: true };
  }

  /* ---------------------------------------------------------------- 供 seed / auth 使用 */

  /** 确保管理员账号存在；已存在时可选地同步密码与角色。 */
  async ensureAdmin(params: {
    username: string;
    password: string;
    roleId?: string | null;
    syncPassword?: boolean;
    syncRole?: boolean;
  }): Promise<UserEntity> {
    const existing = await this.findByUsername(params.username);

    if (!existing) {
      const created = await this.users.save(
        this.users.create({
          username: params.username,
          passwordHash: await this.hashPassword(params.password),
          roleId: params.roleId ?? null,
          active: true,
        }),
      );
      this.logger.log(`已创建管理员账号：${params.username}`);
      return created;
    }

    let changed = false;
    if (params.syncPassword) {
      existing.passwordHash = await this.hashPassword(params.password);
      changed = true;
    }
    if (params.syncRole && params.roleId && existing.roleId !== params.roleId) {
      existing.roleId = params.roleId;
      changed = true;
    }

    if (changed) {
      await this.users.save(existing);
      this.acl.invalidate(existing.id);
      this.logger.log(`已更新管理员账号：${params.username}`);
    }

    return existing;
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    await this.users.update({ id: userId }, { passwordHash: await this.hashPassword(newPassword) });
    this.acl.invalidate(userId);
  }

  async touchLastLogin(userId: string): Promise<void> {
    await this.users.update({ id: userId }, { lastLoginAt: new Date() });
  }
}
