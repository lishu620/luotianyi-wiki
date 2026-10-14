import type { Paginated } from '@luotianyi/shared';

export function buildPaginated<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): Paginated<T> {
  const safePageSize = pageSize > 0 ? pageSize : 1;

  return {
    items,
    total,
    page,
    pageSize: safePageSize,
    totalPages: Math.ceil(total / safePageSize),
  };
}

/** 将 'true' / '1' / true 统一解析为布尔值，用于 query 参数。 */
export function parseBooleanQuery(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

/** 生成用于 ILIKE 的安全关键词（转义 % 和 _）。 */
export function escapeLikeKeyword(keyword: string): string {
  return keyword.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/** 中文字符串 -> 规范化标签数组（去空、去重、限长）。 */
export function normalizeStringArray(value: unknown, maxItems = 30): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of value) {
    const text = String(item ?? '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text.slice(0, 60));
    if (result.length >= maxItems) break;
  }

  return result;
}
