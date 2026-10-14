import type { ExternalLink, LinkCategory, LinkQuery, Paginated } from '@luotianyi/shared';
import { api } from './http';

export interface LinkGroup {
  category: LinkCategory;
  links: ExternalLink[];
}

export type LinkPayload = Partial<ExternalLink> & { title: string; url: string };

export const linkApi = {
  /* ---------------- 公开接口 ---------------- */
  list: (query: LinkQuery) => api.get<Paginated<ExternalLink>>('/links', query),
  grouped: () => api.get<LinkGroup[]>('/links/grouped'),
  categories: () => api.get<Array<{ category: LinkCategory; count: number }>>('/links/categories'),
  detail: (id: string) => api.get<ExternalLink>(`/links/${id}`),
  recordClick: (id: string) => api.post<{ success: boolean }>(`/links/${id}/click`),

  /* ---------------- 后台接口 ---------------- */
  adminList: (query: LinkQuery) => api.get<Paginated<ExternalLink>>('/admin/links', query),
  adminDetail: (id: string) => api.get<ExternalLink>(`/admin/links/${id}`),
  create: (payload: LinkPayload) => api.post<ExternalLink>('/admin/links', payload),
  update: (id: string, payload: LinkPayload) => api.patch<ExternalLink>(`/admin/links/${id}`, payload),
  remove: (id: string) => api.delete<{ success: boolean }>(`/admin/links/${id}`),
  bulkRemove: (ids: string[]) => api.post<{ deleted: number }>('/admin/links/bulk-delete', { ids }),
};
