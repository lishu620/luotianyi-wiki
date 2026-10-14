import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { ApiEnvelope } from '@luotianyi/shared';
import { Observable, map } from 'rxjs';

/**
 * 统一成功响应包装。前端 http 层会自动解包 data 字段。
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: 'ok',
        data: (data ?? null) as T,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
