import type {
  CommunityGroup,
  CommunityGroupQuery,
  CommunityGroupSection,
  Paginated,
} from '@luotianyi/shared';
import { api } from './http';

export interface SectionGroups {
  section: CommunityGroupSection;
  groups: CommunityGroup[];
}

export type GroupPayload = Partial<CommunityGroup> & { name: string; number: string };

export const groupApi = {
  /* ---------------- 公开接口 ---------------- */
  list: (query: CommunityGroupQuery) => api.get<Paginated<CommunityGroup>>('/groups', query),
  grouped: () => api.get<SectionGroups[]>('/groups/grouped'),
  sections: () =>
    api.get<Array<{ section: CommunityGroupSection; count: number }>>('/groups/sections'),
  detail: (id: string) => api.get<CommunityGroup>(`/groups/${id}`),

  /* ---------------- 后台接口 ---------------- */
  adminList: (query: CommunityGroupQuery) =>
    api.get<Paginated<CommunityGroup>>('/admin/groups', query),
  create: (payload: GroupPayload) => api.post<CommunityGroup>('/admin/groups', payload),
  update: (id: string, payload: GroupPayload) =>
    api.patch<CommunityGroup>(`/admin/groups/${id}`, payload),
  remove: (id: string) => api.delete<{ success: boolean }>(`/admin/groups/${id}`),
  bulkRemove: (ids: string[]) =>
    api.post<{ deleted: number }>('/admin/groups/bulk-delete', { ids }),
};
