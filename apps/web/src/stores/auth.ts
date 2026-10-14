import type { AdminUser, LoginPayload, LoginResponse } from '@luotianyi/shared';
import { SUPER_PERMISSION } from '@luotianyi/shared';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { authApi, TOKEN_STORAGE_KEY } from '@/api';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_STORAGE_KEY));
  const user = ref<AdminUser | null>(null);
  const loading = ref(false);

  const isLoggedIn = computed(() => Boolean(token.value));
  const permissions = computed<string[]>(() => user.value?.permissions ?? []);
  const isSuper = computed(() => permissions.value.includes(SUPER_PERMISSION));
  const roleLabel = computed(() => user.value?.roleName ?? '未分配角色');

  /** 任一权限命中即通过（用于菜单 / 按钮显隐） */
  function can(...required: string[]): boolean {
    if (required.length === 0) return true;
    if (isSuper.value) return true;
    return required.some((key) => permissions.value.includes(key));
  }

  /** 全部权限命中才通过 */
  function canAll(...required: string[]): boolean {
    if (required.length === 0) return true;
    if (isSuper.value) return true;
    return required.every((key) => permissions.value.includes(key));
  }

  function setSession(nextToken: string, nextUser: AdminUser): void {
    token.value = nextToken;
    user.value = nextUser;
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
  }

  function clearSession(): void {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  async function login(payload: LoginPayload): Promise<LoginResponse> {
    loading.value = true;
    try {
      const result = await authApi.login(payload);
      setSession(result.accessToken, result.user);
      return result;
    } finally {
      loading.value = false;
    }
  }

  async function register(payload: LoginPayload): Promise<LoginResponse> {
    loading.value = true;
    try {
      const result = await authApi.register(payload);
      setSession(result.accessToken, result.user);
      return result;
    } finally {
      loading.value = false;
    }
  }

  /** 刷新页面后补拉一次用户信息；失败则视为登录失效。 */
  async function ensureProfile(): Promise<AdminUser | null> {
    if (!token.value) return null;
    if (user.value) return user.value;

    try {
      user.value = await authApi.me();
      return user.value;
    } catch {
      clearSession();
      return null;
    }
  }

  function logout(): void {
    clearSession();
  }

  return {
    token,
    user,
    loading,
    isLoggedIn,
    permissions,
    isSuper,
    roleLabel,
    can,
    canAll,
    login,
    register,
    logout,
    clearSession,
    ensureProfile,
    setSession,
  };
});
