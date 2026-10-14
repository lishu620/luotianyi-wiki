import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** 需要管理员身份的路由统一使用该守卫。 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
