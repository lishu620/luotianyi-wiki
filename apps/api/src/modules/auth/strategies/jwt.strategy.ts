import type { AdminUser } from '@luotianyi/shared';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AclService } from '../../acl/acl.service';
import type { JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly acl: AclService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret') ?? 'luotianyi-dev-secret-change-me',
    });
  }

  /** 每次请求都从数据库解析用户 + 角色权限，已被停用的账号立即失效 */
  async validate(payload: JwtPayload): Promise<AdminUser> {
    const ctx = await this.acl.resolve(payload.sub);
    if (!ctx || !ctx.active) throw new UnauthorizedException('账号不存在或已被停用');

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
}
