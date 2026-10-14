import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AdminUser } from '@luotianyi/shared';

/** 从 JWT 请求上下文中取出当前登录管理员。 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminUser | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: AdminUser }>();
    return request.user;
  },
);
