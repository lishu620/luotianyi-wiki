/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

interface ImportMetaEnv {
  /** 后端接口地址，留空则走 Vite 代理的 /api */
  readonly VITE_API_BASE_URL?: string;
  /** 开发代理目标 */
  readonly VITE_PROXY_TARGET?: string;
  /** 站点标题 */
  readonly VITE_APP_TITLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
