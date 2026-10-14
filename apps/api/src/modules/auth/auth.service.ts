import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AdminUser, LoginResponse } from '@luotianyi/shared';
import { AclService } from '../acl/acl.service';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';

export interface JwtPayload {
  sub: string;
  username: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly acl: AclService,
    private readonly roles: RolesService,
  ) {}

  /** 自助注册：创建普通用户并直接登录 */
  async register(username: string, password: string): Promise<LoginResponse> {
    const name = username.trim();
    if (await this.users.findByUsername(name)) {
      throw new ConflictException('该用户名已被注册');
    }

    const role = await this.roles.ensureUserRole();
    const created = await this.users.create({ username: name, password, roleId: role.id, active: true });

    const payload: JwtPayload = { sub: created.id, username: created.username };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      expiresIn: this.resolveExpiresInSeconds(),
      user: await this.toAdminUser(created.id),
    };
  }

  async toAdminUser(userId: string): Promise<AdminUser> {
    const ctx = await this.acl.resolve(userId);
    if (!ctx) throw new UnauthorizedException('账号不存在');

    return {
      id: ctx.userId,
      username: ctx.username,
      roleId: ctx.roleId,
      roleName: ctx.roleName,
      permissions: ctx.permissions,
      active: ctx.active,
      lastLoginAt: ctx.lastLoginAt ? new Date(ctx.lastLoginAt).toISOString() : null,
      createdAt: new Date(ctx.createdAt).toISOString(),
    };
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    const user = await this.users.findByUsername(username);
    const genericError = new UnauthorizedException('用户名或密码错误');

    if (!user) {
      // 仍然执行一次哈希计算，避免通过响应时间探测用户名是否存在
      await this.users.verifyPassword(
        password,
        '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv',
      );
      throw genericError;
    }

    const matched = await this.users.verifyPassword(password, user.passwordHash);
    if (!matched) throw genericError;

    if (!user.active) throw new UnauthorizedException('账号已被停用，请联系管理员');

    await this.users.touchLastLogin(user.id);
    this.acl.invalidate(user.id);

    const payload: JwtPayload = { sub: user.id, username: user.username };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      expiresIn: this.resolveExpiresInSeconds(),
      user: await this.toAdminUser(user.id),
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('登录状态已失效，请重新登录');

    const matched = await this.users.verifyPassword(currentPassword, user.passwordHash);
    if (!matched) throw new UnauthorizedException('原密码不正确');

    await this.users.updatePassword(user.id, newPassword);
  }

  private resolveExpiresInSeconds(): number {
    const raw = String(this.config.get<string>('jwt.expiresIn') ?? '7d').trim();
    const match = /^(\d+)([smhd])?$/.exec(raw);
    if (!match) return 7 * 24 * 3600;

    const amount = Number(match[1]);
    const unit = match[2] ?? 's';
    const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[unit] ?? 1;

    return amount * multiplier;
  }
}
