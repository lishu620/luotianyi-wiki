import type {
  EmojiCategory,
  EmojiImage,
  EmojiImageSearchResult,
  EmojiPack,
  EmojiPackQuery,
  EmojiPackStatus,
  EmojiWatermarkPosition,
  Paginated,
} from '@luotianyi/shared';
import { api, request } from './http';

export interface EmojiPackPayload {
  name: string;
  description?: string | null;
  category?: EmojiCategory;
  tags?: string[];
  status?: EmojiPackStatus;
  watermarkEnabled?: boolean;
  watermarkText?: string | null;
  watermarkPosition?: EmojiWatermarkPosition;
  watermarkOpacity?: number;
  sortOrder?: number;
}

export interface EmojiImagePayload {
  name?: string;
  tags?: string[];
  sortOrder?: number;
}

export interface EmojiUploadMeta {
  name?: string;
  tags?: string[];
  watermarkText?: string;
  watermarkPosition?: EmojiWatermarkPosition;
  watermarkOpacity?: number;
  sortOrder?: number;
}

export interface EmojiWatermarkPayload {
  text: string;
  position?: EmojiWatermarkPosition;
  opacity?: number;
}

function buildForm(file: File, meta: EmojiUploadMeta = {}): FormData {
  const form = new FormData();
  form.append('file', file, file.name);

  if (meta.name) form.append('name', meta.name);
  if (meta.tags?.length) form.append('tags', JSON.stringify(meta.tags));
  if (meta.watermarkText) form.append('watermarkText', meta.watermarkText);
  if (meta.watermarkPosition) form.append('watermarkPosition', meta.watermarkPosition);
  if (meta.watermarkOpacity !== undefined) {
    form.append('watermarkOpacity', String(meta.watermarkOpacity));
  }
  if (meta.sortOrder !== undefined) form.append('sortOrder', String(meta.sortOrder));

  return form;
}

export const emojiApi = {
  /* ---------------- 公开接口 ---------------- */
  list: (query: EmojiPackQuery) => api.get<Paginated<EmojiPack>>('/emoji/packs', query),
  categories: () => api.get<Array<{ category: EmojiCategory; count: number }>>('/emoji/categories'),
  stats: () => api.get<{ packCount: number; imageCount: number }>('/emoji/stats'),
  detail: (id: string) => api.get<EmojiPack>(`/emoji/packs/${id}`),
  searchByImage: (file: File, options: { limit?: number; maxDistance?: number } = {}) =>
    request<EmojiImageSearchResult>({
      method: 'POST',
      url: '/emoji/search/image',
      data: buildForm(file),
      params: options,
      timeout: 60000,
    }),

  /* ---------------- 后台接口 ---------------- */
  adminList: (query: EmojiPackQuery) =>
    api.get<Paginated<EmojiPack>>('/admin/emoji/packs', query),
  adminDetail: (id: string) => api.get<EmojiPack>(`/admin/emoji/packs/${id}`),
  createPack: (payload: EmojiPackPayload) => api.post<EmojiPack>('/admin/emoji/packs', payload),
  updatePack: (id: string, payload: Partial<EmojiPackPayload>) =>
    api.patch<EmojiPack>(`/admin/emoji/packs/${id}`, payload),
  removePack: (id: string) => api.delete<{ success: boolean }>(`/admin/emoji/packs/${id}`),
  bulkRemove: (ids: string[]) =>
    api.post<{ deleted: number }>('/admin/emoji/packs/bulk-delete', { ids }),

  uploadImage: (packId: string, file: File, meta?: EmojiUploadMeta) =>
    request<EmojiImage>({
      method: 'POST',
      url: `/admin/emoji/packs/${packId}/images`,
      data: buildForm(file, meta),
      timeout: 120000,
    }),
  updateImage: (imageId: string, payload: EmojiImagePayload) =>
    api.patch<EmojiImage>(`/admin/emoji/images/${imageId}`, payload),
  removeImage: (imageId: string) =>
    api.delete<{ success: boolean }>(`/admin/emoji/images/${imageId}`),
  setCover: (imageId: string) => api.post<EmojiImage>(`/admin/emoji/images/${imageId}/cover`),
  applyWatermark: (imageId: string, payload: EmojiWatermarkPayload) =>
    api.post<EmojiImage>(`/admin/emoji/images/${imageId}/watermark`, payload),
};
