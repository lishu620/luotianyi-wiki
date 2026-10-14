import type { AdminUser } from '@luotianyi/shared';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_ANY_KEY, PERMISSION_KEY } from '../../common/decorators/permissions.decorator';
import { AclService } from './acl.service';

/**
 * 权限守卫：读取 @RequirePermission / @RequireAnyPermission 声明的权限键，
 * 与请求用户（由 JwtStrategy 注入的 permissions）比对。
 *
 * `*` 通配权限（超管角色）直接放行。
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];

    const requiredAll = this.reflector.getAllAndOverride<string[]>(PERMISSION_KEY, targets);
    const requiredAny = this.reflector.getAllAndOverride<string[]>(PERMISSION_ANY_KEY, targets);

    if ((!requiredAll || requiredAll.length === 0) && (!requiredAny || requiredAny.length === 0)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AdminUser }>();
    const user = request.user;

    if (!user) throw new ForbiddenException('未登录或登录状态已失效');

    const permissions = user.permissions;

    if (requiredAll?.length && !AclService.hasAll(permissions, requiredAll)) {
      throw new ForbiddenException('当前角色没有该操作权限');
    }

    if (requiredAny?.length && !requiredAny.some((key) => AclService.has(permissions, key))) {
      throw new ForbiddenException('当前角色没有该操作权限');
    }

    return true;
  }
}
