import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * 可选登录：带 token 则解析出用户，不带 token 也放行（request.user 为 null）。
 * 用于「登录后显示更多信息」的公开接口（如扩列条列表里的“我已心动 / 相互心动”）。
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(_err: unknown, user: TUser): TUser {
    return (user ?? null) as TUser;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // 未登录 / token 失效都按匿名处理
    }
    return true;
  }
}
