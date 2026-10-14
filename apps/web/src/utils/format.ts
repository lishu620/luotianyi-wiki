/** 数字格式化：1.2 万 / 3.4 亿 */
export function formatNumber(value?: number | null): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '0';
  if (num >= 1e8) return `${(num / 1e8).toFixed(num >= 1e9 ? 0 : 1)} 亿`;
  if (num >= 1e4) return `${(num / 1e4).toFixed(num >= 1e5 ? 0 : 1)} 万`;
  return num.toLocaleString('zh-CN');
}

/** 秒 -> mm:ss */
export function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return '--:--';

  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);

  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

/** 日期字符串 -> 2015-04-25 */
export function formatDate(value?: string | null): string {
  if (!value) return '—';
  return String(value).slice(0, 10);
}

/** 日期字符串 -> 2015 年 4 月 25 日 */
export function formatDateLong(value?: string | null): string {
  if (!value) return '—';

  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!year || !month || !day) return String(value);

  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`;
}

/** 退出 undefined / 空字符串字段，便于作为 query 参数发送 */
export function compact<T extends Record<string, unknown>>(input: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    result[key] = value;
  }
  return result;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

/** 行内 Markdown 子集：代码 / 加粗 / 链接 */
function renderInline(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
}

/**
 * 极简 Markdown 渲染（标题 / 无序列表 / 段落 / 加粗 / 行内代码 / 链接）。
 * 输出前统一转义 HTML，避免 XSS。
 */
export function renderMarkdown(markdown?: string | null): string {
  const source = (markdown ?? '').replace(/\r\n/g, '\n');
  if (!source.trim()) return '';

  const html: string[] = [];
  let listBuffer: string[] = [];
  let paragraphBuffer: string[] = [];

  const flushList = (): void => {
    if (listBuffer.length === 0) return;
    html.push(`<ul>${listBuffer.map((item) => `<li>${item}</li>`).join('')}</ul>`);
    listBuffer = [];
  };

  const flushParagraph = (): void => {
    if (paragraphBuffer.length === 0) return;
    html.push(`<p>${paragraphBuffer.join('<br />')}</p>`);
    paragraphBuffer = [];
  };

  for (const rawLine of source.split('\n')) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      flushList();
      flushParagraph();
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushList();
      flushParagraph();
      html.push(`<h3>${renderInline(heading[2])}</h3>`);
      continue;
    }

    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      listBuffer.push(renderInline(bullet[1]));
      continue;
    }

    flushList();
    paragraphBuffer.push(renderInline(line));
  }

  flushList();
  flushParagraph();

  return html.join('\n');
}

export interface ExternalPlatformLink {
  label: string;
  url: string;
  icon: string;
  color: string;
}

/** 汇总一首歌在各平台上的跳转链接 */
export function getSongExternalLinks(song: {
  bilibiliUrl?: string | null;
  youtubeUrl?: string | null;
  neteaseUrl?: string | null;
  qqMusicUrl?: string | null;
}): ExternalPlatformLink[] {
  const links: ExternalPlatformLink[] = [];

  if (song.bilibiliUrl) {
    links.push({ label: '哔哩哔哩', url: song.bilibiliUrl, icon: 'VideoPlay', color: '#fb7299' });
  }
  if (song.youtubeUrl) {
    links.push({ label: 'YouTube', url: song.youtubeUrl, icon: 'Promotion', color: '#ff0000' });
  }
  if (song.neteaseUrl) {
    links.push({ label: '网易云音乐', url: song.neteaseUrl, icon: 'Headset', color: '#c20c0c' });
  }
  if (song.qqMusicUrl) {
    links.push({ label: 'QQ 音乐', url: song.qqMusicUrl, icon: 'Sunny', color: '#31c27c' });
  }

  return links;
}
