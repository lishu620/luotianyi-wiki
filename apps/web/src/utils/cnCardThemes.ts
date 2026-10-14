import type { CnCardStyle } from '@luotianyi/shared';

/**
 * 个人介绍卡的款式主题。
 *
 * 同一套 token 同时供两处使用：
 * - `CnCard.vue`：写入 CSS 变量，页面上按主题渲染；
 * - `exportCnCard.ts`：Canvas 导出时直接取色。
 */
export interface CnCardTheme {
  /** 顶部渐变起止色 */
  headerFrom: string;
  headerTo: string;
  /** 卡片底色（浅色 / 深色模式） */
  surface: string;
  surfaceDark: string;
  /** 主文字 */
  ink: string;
  inkDark: string;
  /** 次要文字 */
  muted: string;
  mutedDark: string;
  /** 强调色（用于头像描边、链接、统计数字） */
  accent: string;
  /** 标签底色 */
  accentSoft: string;
  /** 标签文字（浅色 / 深色模式） */
  accentInk: string;
  accentInkDark: string;
  /** 联系方式区块底色 */
  panel: string;
  panelDark: string;
  /** 卡片描边 */
  border: string;
  borderDark: string;
}

export const CN_CARD_THEMES: Record<CnCardStyle, CnCardTheme> = {
  classic: {
    headerFrom: '#66ccff',
    headerTo: '#d6f2ff',
    surface: '#ffffff',
    surfaceDark: '#0f172a',
    ink: '#0f172a',
    inkDark: '#f8fafc',
    muted: '#64748b',
    mutedDark: '#94a3b8',
    accent: '#33b4f0',
    accentSoft: 'rgba(102, 204, 255, 0.20)',
    accentInk: '#0b6d9e',
    accentInkDark: '#8fdfff',
    panel: 'rgba(102, 204, 255, 0.12)',
    panelDark: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(102, 204, 255, 0.45)',
    borderDark: 'rgba(102, 204, 255, 0.28)',
  },
  sakura: {
    headerFrom: '#ffa6cb',
    headerTo: '#ffe6f1',
    surface: '#ffffff',
    surfaceDark: '#1b1220',
    ink: '#3f1027',
    inkDark: '#ffe9f3',
    muted: '#9d6b81',
    mutedDark: '#d0a8bb',
    accent: '#ff6fb0',
    accentSoft: 'rgba(255, 111, 176, 0.18)',
    accentInk: '#c2185b',
    accentInkDark: '#ffb3d1',
    panel: 'rgba(255, 111, 176, 0.10)',
    panelDark: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(255, 111, 176, 0.42)',
    borderDark: 'rgba(255, 111, 176, 0.26)',
  },
  midnight: {
    headerFrom: '#6656d8',
    headerTo: '#1b1b2f',
    surface: '#1b1b2f',
    surfaceDark: '#15152a',
    ink: '#f4f3ff',
    inkDark: '#f4f3ff',
    muted: '#a8a5cf',
    mutedDark: '#a8a5cf',
    accent: '#9b8dff',
    accentSoft: 'rgba(155, 141, 255, 0.22)',
    accentInk: '#cdc6ff',
    accentInkDark: '#cdc6ff',
    panel: 'rgba(255, 255, 255, 0.07)',
    panelDark: 'rgba(255, 255, 255, 0.07)',
    border: 'rgba(155, 141, 255, 0.42)',
    borderDark: 'rgba(155, 141, 255, 0.42)',
  },
  mint: {
    headerFrom: '#6fdcbc',
    headerTo: '#e2fff4',
    surface: '#ffffff',
    surfaceDark: '#0c1b18',
    ink: '#0f2a24',
    inkDark: '#e6fff7',
    muted: '#5b817a',
    mutedDark: '#8fbcb2',
    accent: '#18b98a',
    accentSoft: 'rgba(24, 185, 138, 0.18)',
    accentInk: '#0b7a5c',
    accentInkDark: '#86efac',
    panel: 'rgba(24, 185, 138, 0.10)',
    panelDark: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(24, 185, 138, 0.40)',
    borderDark: 'rgba(24, 185, 138, 0.25)',
  },
  sunset: {
    headerFrom: '#ffab5e',
    headerTo: '#ffe9cf',
    surface: '#ffffff',
    surfaceDark: '#1e1308',
    ink: '#3a2410',
    inkDark: '#ffedd8',
    muted: '#9a7550',
    mutedDark: '#d3ab84',
    accent: '#f97316',
    accentSoft: 'rgba(249, 115, 22, 0.18)',
    accentInk: '#b45309',
    accentInkDark: '#fdba74',
    panel: 'rgba(249, 115, 22, 0.10)',
    panelDark: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(249, 115, 22, 0.40)',
    borderDark: 'rgba(249, 115, 22, 0.25)',
  },
  mono: {
    headerFrom: '#cbd5e1',
    headerTo: '#f8fafc',
    surface: '#ffffff',
    surfaceDark: '#111827',
    ink: '#111827',
    inkDark: '#f3f4f6',
    muted: '#6b7280',
    mutedDark: '#9ca3af',
    accent: '#64748b',
    accentSoft: 'rgba(100, 116, 139, 0.16)',
    accentInk: '#334155',
    accentInkDark: '#cbd5e1',
    panel: 'rgba(100, 116, 139, 0.10)',
    panelDark: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(100, 116, 139, 0.32)',
    borderDark: 'rgba(255, 255, 255, 0.16)',
  },
};

export function cnCardTheme(style: CnCardStyle | undefined): CnCardTheme {
  return CN_CARD_THEMES[style ?? 'classic'] ?? CN_CARD_THEMES.classic;
}

/** 款式选择器用的小圆点渐变 */
export function cnCardSwatch(style: CnCardStyle): string {
  const theme = cnCardTheme(style);
  return `linear-gradient(135deg, ${theme.headerFrom}, ${theme.headerTo})`;
}

/** 写入卡片根元素的 CSS 变量 */
export function cnCardVars(style: CnCardStyle | undefined): Record<string, string> {
  const theme = cnCardTheme(style);
  return {
    '--cn-header-from': theme.headerFrom,
    '--cn-header-to': theme.headerTo,
    '--cn-surface': theme.surface,
    '--cn-surface-dark': theme.surfaceDark,
    '--cn-ink': theme.ink,
    '--cn-ink-dark': theme.inkDark,
    '--cn-muted': theme.muted,
    '--cn-muted-dark': theme.mutedDark,
    '--cn-accent': theme.accent,
    '--cn-accent-soft': theme.accentSoft,
    '--cn-accent-ink': theme.accentInk,
    '--cn-accent-ink-dark': theme.accentInkDark,
    '--cn-panel': theme.panel,
    '--cn-panel-dark': theme.panelDark,
    '--cn-border': theme.border,
    '--cn-border-dark': theme.borderDark,
  };
}
