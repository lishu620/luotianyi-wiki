import type {
  CnBilibiliProfile,
  CnFilters,
  CnProfile,
  CnProfilePayload,
  CnProfileQuery,
  CnStatus,
  Paginated,
} from '@luotianyi/shared';
import { api } from './http';

export interface CnLikeResult {
  liked: boolean;
  mutual: boolean;
  likeCount: number;
}

export const cnApi = {
  /* ---------------- 公开 ---------------- */
  list: (query: CnProfileQuery) => api.get<Paginated<CnProfile>>('/cn', query),
  heart: (limit = 12) => api.get<CnProfile[]>('/cn/heart', { limit }),
  filters: () => api.get<CnFilters>('/cn/filters'),
  detail: (id: string) => api.get<CnProfile>(`/cn/${id}`),
  like: (id: string) => api.post<CnLikeResult>(`/cn/${id}/like`),
  /** 按 B 站 UID / 主页链接获取头像（需登录） */
  bilibiliAvatar: (uid: string) =>
    api.get<CnBilibiliProfile>('/cn/bilibili-avatar', { uid }),

  /* ---------------- 我的 ---------------- */
  mine: () => api.get<CnProfile | null>('/cn/mine'),
  saveMine: (payload: CnProfilePayload) => api.put<CnProfile>('/cn/mine', payload),
  removeMine: () => api.delete<{ success: boolean }>('/cn/mine'),
  myLikes: () => api.get<string[]>('/cn/my-likes'),

  /* ---------------- 后台 ---------------- */
  adminList: (query: CnProfileQuery) => api.get<Paginated<CnProfile>>('/admin/cn', query),
  adminSetStatus: (id: string, status: CnStatus) =>
    api.patch<CnProfile>(`/admin/cn/${id}/status`, { status }),
  adminRemove: (id: string) => api.delete<{ success: boolean }>(`/admin/cn/${id}`),
};
