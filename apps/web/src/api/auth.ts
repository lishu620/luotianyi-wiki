import type { AdminUser, LoginPayload, LoginResponse } from '@luotianyi/shared';
import { api } from './http';

export const authApi = {
  login: (payload: LoginPayload) => api.post<LoginResponse>('/auth/login', payload),
  register: (payload: LoginPayload) => api.post<LoginResponse>('/auth/register', payload),
  me: () => api.get<AdminUser>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch<{ success: boolean }>('/auth/password', { currentPassword, newPassword }),
};
