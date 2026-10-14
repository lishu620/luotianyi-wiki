import type { ExternalLink, SearchResponse, Song } from '@luotianyi/shared';
import { api } from './http';

export interface SearchSongsParams {
  q?: string;
  year?: number;
  tag?: string;
  vocalType?: string;
  producer?: string;
  featured?: boolean;
  sortBy?: string;
  order?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchLinksParams {
  q?: string;
  category?: string;
  recommended?: boolean;
  page?: number;
  pageSize?: number;
}

export interface SearchAllResult {
  engine: 'meilisearch' | 'postgres';
  query: string;
  songs: Song[];
  links: ExternalLink[];
}

export interface SearchStatus {
  meilisearchReady: boolean;
  engine: 'meilisearch' | 'postgres';
  songsIndexed: number;
  linksIndexed: number;
}

export const searchApi = {
  songs: (params: SearchSongsParams) => api.get<SearchResponse<Song>>('/search/songs', params),
  links: (params: SearchLinksParams) => api.get<SearchResponse<ExternalLink>>('/search/links', params),
  all: (q: string, limit = 5) => api.get<SearchAllResult>('/search', { q, limit }),
  status: () => api.get<SearchStatus>('/search/status'),
  reindex: () => api.post<{ songs: number; links: number; meilisearchReady: boolean }>('/search/reindex'),
};
