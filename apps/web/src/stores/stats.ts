import type { StatsDashboard } from '@luotianyi/shared';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { statsApi } from '@/api';

export const useStatsStore = defineStore('stats', () => {
  const dashboard = ref<StatsDashboard | null>(null);
  const loading = ref(false);

  async function fetchDashboard(): Promise<void> {
    loading.value = true;
    try {
      dashboard.value = await statsApi.dashboard();
    } finally {
      loading.value = false;
    }
  }

  return { dashboard, loading, fetchDashboard };
});
