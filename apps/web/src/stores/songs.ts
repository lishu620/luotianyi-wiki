import type { Song, SongQuery } from '@luotianyi/shared';
import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';

import { songApi, type SongFilterOptions } from '@/api';
import { compact } from '@/utils';

type SongsQuery = SongQuery & { page: number; pageSize: number };

function createDefaultQuery(): SongsQuery {
  return {
    page: 1,
    pageSize: 12,
    keyword: '',
    year: undefined,
    tag: undefined,
    vocalType: undefined,
    producer: undefined,
    featured: undefined,
    sortBy: 'createdAt',
    order: 'DESC',
  };
}

export const useSongsStore = defineStore('songs', () => {
  const query = reactive<SongsQuery>(createDefaultQuery());

  const list = ref<Song[]>([]);
  const total = ref(0);
  const totalPages = ref(0);
  const loading = ref(false);

  const featured = ref<Song[]>([]);
  const filters = ref<SongFilterOptions>({ years: [], producers: [], tags: [] });

  const detail = ref<Song | null>(null);
  const related = ref<Song[]>([]);
  const detailLoading = ref(false);

  async function fetchList(): Promise<void> {
    loading.value = true;
    try {
      const result = await songApi.list(compact({ ...query }));
      list.value = result.items;
      total.value = result.total;
      totalPages.value = result.totalPages;
    } finally {
      loading.value = false;
    }
  }

  async function fetchFeatured(limit = 6): Promise<void> {
    featured.value = await songApi.featured(limit);
  }

  async function fetchFilters(): Promise<void> {
    filters.value = await songApi.filters();
  }

  async function fetchDetail(id: string): Promise<void> {
    detailLoading.value = true;
    try {
      const [song, relatedSongs] = await Promise.all([
        songApi.detail(id),
        songApi.related(id, 4).catch(() => [] as Song[]),
      ]);
      detail.value = song;
      related.value = relatedSongs;
    } finally {
      detailLoading.value = false;
    }
  }

  function setPage(page: number): void {
    query.page = page;
  }

  function resetQuery(): void {
    Object.assign(query, createDefaultQuery());
  }

  function applyQuickFilter(patch: Partial<SongsQuery>): void {
    Object.assign(query, { page: 1 }, patch);
  }

  return {
    query,
    list,
    total,
    totalPages,
    loading,
    featured,
    filters,
    detail,
    related,
    detailLoading,
    fetchList,
    fetchFeatured,
    fetchFilters,
    fetchDetail,
    setPage,
    resetQuery,
    applyQuickFilter,
  };
});
