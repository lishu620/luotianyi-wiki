import type { ProfileSection } from '@luotianyi/shared';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { profileApi } from '@/api';

export const useProfileStore = defineStore('profile', () => {
  const sections = ref<ProfileSection[]>([]);
  const loading = ref(false);
  const loaded = ref(false);

  const hero = computed(() => sections.value.find((section) => section.slug === 'hero') ?? null);

  const bySlug = computed(() => {
    const map = new Map<string, ProfileSection>();
    for (const section of sections.value) map.set(section.slug, section);
    return map;
  });

  async function fetchSections(force = false): Promise<void> {
    if (loaded.value && !force) return;

    loading.value = true;
    try {
      sections.value = await profileApi.list();
      loaded.value = true;
    } finally {
      loading.value = false;
    }
  }

  return { sections, loading, loaded, hero, bySlug, fetchSections };
});
