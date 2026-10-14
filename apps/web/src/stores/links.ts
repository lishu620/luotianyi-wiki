import type { LinkCategory, LinkQuery } from '@luotianyi/shared';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { linkApi, type LinkGroup } from '@/api';

export const useLinksStore = defineStore('links', () => {
  const groups = ref<LinkGroup[]>([]);
  const counts = ref<Array<{ category: LinkCategory; count: number }>>([]);
  const loading = ref(false);
  const lastLoadedAt = ref(0);

  async function fetchGrouped(force = false): Promise<void> {
    // 5 分钟内复用缓存，避免来回切换页面时重复请求
    if (!force && groups.value.length > 0 && Date.now() - lastLoadedAt.value < 5 * 60 * 1000) {
      return;
    }

    loading.value = true;
    try {
      const [grouped, categoryCounts] = await Promise.all([
        linkApi.grouped(),
        linkApi.categories(),
      ]);
      groups.value = grouped;
      counts.value = categoryCounts;
      lastLoadedAt.value = Date.now();
    } finally {
      loading.value = false;
    }
  }

  async function search(query: LinkQuery) {
    return linkApi.list(query);
  }

  return { groups, counts, loading, fetchGrouped, search };
});
