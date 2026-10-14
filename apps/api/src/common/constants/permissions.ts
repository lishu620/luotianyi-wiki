import type { PermissionModule } from '@luotianyi/shared';

/** 权限点清单（后端校验用；前端展示的完整定义在 @luotianyi/shared 的 PERMISSIONS） */
export const PERMISSIONS = {
  songCreate: 'song.create',
  songUpdateOwn: 'song.update.own',
  songUpdateAny: 'song.update.any',
  songDelete: 'song.delete',
  songApprove: 'song.approve',
  linkCreate: 'link.create',
  linkUpdateOwn: 'link.update.own',
  linkUpdateAny: 'link.update.any',
  linkDelete: 'link.delete',
  groupCreate: 'group.create',
  groupUpdateOwn: 'group.update.own',
  groupUpdateAny: 'group.update.any',
  groupDelete: 'group.delete',
  cnManage: 'cn.manage',
  profileUpdate: 'profile.update',
  userManage: 'user.manage',
  roleManage: 'role.manage',
  systemReindex: 'system.reindex',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_MODULE_OF: Record<PermissionKey, PermissionModule> = {
  'song.create': 'song',
  'song.update.own': 'song',
  'song.update.any': 'song',
  'song.delete': 'song',
  'song.approve': 'song',
  'link.create': 'link',
  'link.update.own': 'link',
  'link.update.any': 'link',
  'link.delete': 'link',
  'group.create': 'group',
  'group.update.own': 'group',
  'group.update.any': 'group',
  'group.delete': 'group',
  'cn.manage': 'cn',
  'profile.update': 'profile',
  'user.manage': 'user',
  'role.manage': 'role',
  'system.reindex': 'system',
};
