import type { CommunityGroupSection } from '@luotianyi/shared';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { groupApi, type SectionGroups } from '@/api';

export const useGroupsStore = defineStore('groups', () => {
  const sections = ref<SectionGroups[]>([]);
  const counts = ref<Array<{ section: CommunityGroupSection; count: number }>>([]);
  const loading = ref(false);
  const lastLoadedAt = ref(0);

  async function fetchGrouped(force = false): Promise<void> {
    // 5 分钟内复用缓存，避免来回切换页面时重复请求
    if (!force && sections.value.length > 0 && Date.now() - lastLoadedAt.value < 5 * 60 * 1000) {
      return;
    }

    loading.value = true;
    try {
      const [grouped, sectionCounts] = await Promise.all([
        groupApi.grouped(),
        groupApi.sections(),
      ]);
      sections.value = grouped;
      counts.value = sectionCounts;
      lastLoadedAt.value = Date.now();
    } finally {
      loading.value = false;
    }
  }

  return { sections, counts, loading, fetchGrouped };
});
