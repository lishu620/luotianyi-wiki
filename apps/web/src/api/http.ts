import type { ApiEnvelope } from '@luotianyi/shared';
import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';

export const TOKEN_STORAGE_KEY = 'lty-admin-token';

const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || '/api';

const http = axios.create({
    baseURL,
    timeout: 20000,
    headers: { 'Content-Type': 'application/json' },
});

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/** 注册 401 处理函数（在 main.ts 中与 router 绑定，避免循环引用）。 */
export function onUnauthorized(handler: UnauthorizedHandler): void {
    unauthorizedHandler = handler;
}

http.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/** 开发环境下后端真实地址，用于生成更具体的错误提示 */
const backendHint =
    import.meta.env.VITE_API_BASE_URL?.trim() ||
    import.meta.env.VITE_PROXY_TARGET ||
    'http://localhost:3000';

/** 短时间内重复的错误只弹一次，避免并发请求刷屏 */
const recentMessages = new Map<string, number>();
const DEDUPE_WINDOW_MS = 3000;

function notifyError(message: string): void {
    const now = Date.now();
    const last = recentMessages.get(message) ?? 0;

    // 清理过期记录，避免 Map 无限增长
    for (const [key, timestamp] of recentMessages) {
        if (now - timestamp > DEDUPE_WINDOW_MS) recentMessages.delete(key);
    }

    if (now - last < DEDUPE_WINDOW_MS) return;

    recentMessages.set(message, now);
    ElMessage.error(message);
}

http.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiEnvelope<null> & { details?: string[] }>) => {
        const status = error.response?.status;
        const body = error.response?.data;
        // 只有带 code 字段的才是后端返回的业务错误，其余属于网关/代理层错误
        const isBackendEnvelope = Boolean(body && typeof body === 'object' && 'code' in body);

        let message: string;

        if (status === 401) {
            message = body?.message || '登录状态已失效，请重新登录';
            unauthorizedHandler?.();
        } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            message = `请求超时，后端未在预期时间内响应（${backendHint}）`;
        } else if (!error.response) {
            message = `无法连接后端服务，请确认已启动后端：pnpm dev:api（地址 ${backendHint}）`;
        } else if (!isBackendEnvelope && status !== undefined && status >= 500) {
            message = `后端服务不可用（HTTP ${status}），请确认后端、PostgreSQL 与 Meilisearch 已启动`;
        } else if (Array.isArray(body?.details) && body.details.length > 0) {
            message = body.details.join('；');
        } else {
            message = body?.message || error.message || '请求失败，请稍后重试';
        }

        notifyError(message);
        return Promise.reject(new Error(message));
    },
);

/** 发起请求并自动解包 { code, message, data } 信封。 */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await http.request<ApiEnvelope<T>>(config);
    const body = response.data;

    if (body && typeof body === 'object' && 'code' in body) {
        if (body.code !== 0) {
            ElMessage.error(body.message || '请求失败');
            throw new Error(body.message);
        }
        return body.data;
    }

    return body as unknown as T;
}

export const api = {
    get: <T>(url: string, params?: unknown) => request<T>({ method: 'GET', url, params }),
    post: <T>(url: string, data?: unknown) => request<T>({ method: 'POST', url, data }),
    patch: <T>(url: string, data?: unknown) => request<T>({ method: 'PATCH', url, data }),
    put: <T>(url: string, data?: unknown) => request<T>({ method: 'PUT', url, data }),
    delete: <T>(url: string) => request<T>({ method: 'DELETE', url }),
};

export default http;
