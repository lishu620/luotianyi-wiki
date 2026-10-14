import type { Paginated, Song, SongQuery } from '@luotianyi/shared';
import { api } from './http';

export interface SongFilterOptions {
  years: number[];
  producers: string[];
  tags: { tag: string; count: number }[];
}

export type SongPayload = Partial<Song> & { title: string };

export const songApi = {
  /* ---------------- 公开接口 ---------------- */
  list: (query: SongQuery) => api.get<Paginated<Song>>('/songs', query),
  featured: (limit = 6) => api.get<Song[]>('/songs/featured', { limit }),
  filters: () => api.get<SongFilterOptions>('/songs/filters'),
  detail: (id: string) => api.get<Song>(`/songs/${id}`),
  related: (id: string, limit = 4) => api.get<Song[]>(`/songs/${id}/related`, { limit }),

  /* ---------------- 后台接口 ---------------- */
  adminList: (query: SongQuery) => api.get<Paginated<Song>>('/admin/songs', query),
  adminDetail: (id: string) => api.get<Song>(`/admin/songs/${id}`),
  create: (payload: SongPayload) => api.post<Song>('/admin/songs', payload),
  update: (id: string, payload: SongPayload) => api.patch<Song>(`/admin/songs/${id}`, payload),
  remove: (id: string) => api.delete<{ success: boolean }>(`/admin/songs/${id}`),
  bulkRemove: (ids: string[]) => api.post<{ deleted: number }>('/admin/songs/bulk-delete', { ids }),
};
