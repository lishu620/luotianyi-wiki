import type { ChangeRequestStatus, Paginated, SongChangeRequest } from '@luotianyi/shared';
import { api } from './http';

export interface SongRequestQuery {
  status?: ChangeRequestStatus;
  songId?: string;
  mine?: boolean;
  page?: number;
  pageSize?: number;
}

export const songRequestApi = {
  list: (query: SongRequestQuery) =>
    api.get<Paginated<SongChangeRequest>>('/admin/song-requests', query),
  pendingCount: () => api.get<{ count: number }>('/admin/song-requests/pending-count'),
  approve: (id: string, note?: string) =>
    api.post<SongChangeRequest>(`/admin/song-requests/${id}/approve`, { note }),
  reject: (id: string, note?: string) =>
    api.post<SongChangeRequest>(`/admin/song-requests/${id}/reject`, { note }),
  /** 提交修改申请（非本人编辑歌曲时使用） */
  submit: (songId: string, changes: Record<string, unknown>, reason?: string) =>
    api.post<SongChangeRequest>(`/admin/songs/${songId}/change-request`, { changes, reason }),
};
