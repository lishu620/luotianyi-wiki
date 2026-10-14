import type { Role, RolePayload } from '@luotianyi/shared';
import { api } from './http';

export const roleApi = {
  list: () => api.get<Role[]>('/admin/roles'),
  detail: (id: string) => api.get<Role>(`/admin/roles/${id}`),
  create: (payload: RolePayload) => api.post<Role>('/admin/roles', payload),
  update: (id: string, payload: Partial<RolePayload>) => api.patch<Role>(`/admin/roles/${id}`, payload),
  remove: (id: string) => api.delete<{ success: boolean }>(`/admin/roles/${id}`),
};
