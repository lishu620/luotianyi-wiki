import type { ProfileSection, ProfileSlug } from '@luotianyi/shared';
import { api } from './http';

export type ProfilePayload = Partial<ProfileSection> & { slug: ProfileSlug; title: string };

export const profileApi = {
  /* ---------------- 公开接口 ---------------- */
  list: () => api.get<ProfileSection[]>('/profile'),
  bySlug: (slug: ProfileSlug) => api.get<ProfileSection>(`/profile/${slug}`),
  slugs: () => api.get<ProfileSlug[]>('/profile/slugs'),

  /* ---------------- 后台接口 ---------------- */
  adminList: () => api.get<ProfileSection[]>('/admin/profile'),
  adminDetail: (id: string) => api.get<ProfileSection>(`/admin/profile/${id}`),
  create: (payload: ProfilePayload) => api.post<ProfileSection>('/admin/profile', payload),
  upsert: (payload: ProfilePayload) => api.post<ProfileSection>('/admin/profile/upsert', payload),
  update: (id: string, payload: Partial<ProfileSection>) =>
    api.patch<ProfileSection>(`/admin/profile/${id}`, payload),
  remove: (id: string) => api.delete<{ success: boolean }>(`/admin/profile/${id}`),
};
