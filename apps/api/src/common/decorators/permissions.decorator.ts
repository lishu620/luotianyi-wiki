import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'required-permissions';
export const PERMISSION_ANY_KEY = 'required-any-permissions';

/**
 * 声明访问该接口所需的权限键（**全部**满足才放行）。
 * 使用 `*` 通配权限的角色自动通过。
 *
 * @example
 * @RequirePermission('song.update.any')
 * @RequirePermission('link.create', 'link.update.own')
 */
export const RequirePermission = (...permissions: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSION_KEY, permissions);

/**
 * 声明访问该接口所需的权限键（**任一**满足即放行）。
 *
 * @example
 * @RequireAnyPermission('song.create', 'song.update.own', 'song.update.any')
 */
export const RequireAnyPermission = (...permissions: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSION_ANY_KEY, permissions);
