import type { AdminUser, Paginated, UserPayload, UserQuery } from '@luotianyi/shared';
import { api } from './http';

export type CreateUserPayload = UserPayload & { password: string };

export const userApi = {
  list: (query: UserQuery) => api.get<Paginated<AdminUser>>('/admin/users', query),
  detail: (id: string) => api.get<AdminUser>(`/admin/users/${id}`),
  create: (payload: CreateUserPayload) => api.post<AdminUser>('/admin/users', payload),
  update: (id: string, payload: Partial<UserPayload>) =>
    api.patch<AdminUser>(`/admin/users/${id}`, payload),
  resetPassword: (id: string, password: string) =>
    api.post<{ success: boolean }>(`/admin/users/${id}/reset-password`, { password }),
  remove: (id: string) => api.delete<{ success: boolean }>(`/admin/users/${id}`),
};
