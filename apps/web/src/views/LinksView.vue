<script setup lang="ts">
import { LINK_CATEGORIES, LINK_CATEGORY_ICONS, LINK_CATEGORY_LABELS, type LinkCategory } from '@luotianyi/shared';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import EmptyState from '@/components/EmptyState.vue';
import LinkCard from '@/components/LinkCard.vue';
import SectionHeading from '@/components/SectionHeading.vue';
import { useLinksStore } from '@/stores/links';

const route = useRoute();
const store = useLinksStore();

const activeCategory = ref<LinkCategory | 'all'>('all');
const keyword = ref('');

const visibleGroups = computed(() =>
  store.groups
    .filter((group) => activeCategory.value === 'all' || group.category === activeCategory.value)
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => {
        const query = keyword.value.trim().toLowerCase();
        if (!query) return true;

        return (
          link.title.toLowerCase().includes(query) ||
          (link.description ?? '').toLowerCase().includes(query) ||
          link.url.toLowerCase().includes(query) ||
          (link.tags ?? []).some((tag) => tag.toLowerCase().includes(query))
        );
      }),
    }))
    .filter((group) => group.links.length > 0),
);

const totalVisible = computed(() =>
  visibleGroups.value.reduce((sum, group) => sum + group.links.length, 0),
);

function countOf(category: LinkCategory): number {
  return store.counts.find((item) => item.category === category)?.count ?? 0;
}

onMounted(async () => {
  const category = route.query.category;
  if (typeof category === 'string' && (LINK_CATEGORIES as readonly string[]).includes(category)) {
    activeCategory.value = category as LinkCategory;
  }

  await store.fetchGrouped().catch(() => undefined);
});
</script>

<template>
  <div>
    <section
      class="border-b border-ink-200/60 bg-gradient-to-br from-brand-50 to-white dark:border-ink-800 dark:from-ink-900 dark:to-ink-950"
    >
      <div class="lty-container py-12">
        <SectionHeading
          title="同好导航"
          subtitle="整理同好与官方制作的资料站、视频平台、音乐平台与社区，点击卡片即新窗口跳转"
          icon="Connection"
        />

        <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <el-input
            v-model="keyword"
            size="large"
            class="sm:max-w-sm"
            placeholder="在站点名称、简介、标签中筛选"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="lty-chip transition-colors"
              :class="
                activeCategory === 'all'
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-ink-600 hover:bg-brand-50 dark:bg-ink-800 dark:text-ink-300'
              "
              @click="activeCategory = 'all'"
            >
              <el-icon><Menu /></el-icon>
              全部
              <span class="opacity-70">{{ store.counts.reduce((s, i) => s + i.count, 0) }}</span>
            </button>

            <button
              v-for="category in LINK_CATEGORIES"
              :key="category"
              type="button"
              class="lty-chip transition-colors"
              :class="
                activeCategory === category
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-ink-600 hover:bg-brand-50 dark:bg-ink-800 dark:text-ink-300'
              "
              @click="activeCategory = category"
            >
              <el-icon><component :is="LINK_CATEGORY_ICONS[category]" /></el-icon>
              {{ LINK_CATEGORY_LABELS[category] }}
              <span class="opacity-70">{{ countOf(category) }}</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <section v-loading="store.loading" class="lty-container py-10">
      <p class="mb-6 text-sm text-ink-500 dark:text-ink-400">共 {{ totalVisible }} 个站点</p>

      <div v-if="visibleGroups.length" class="space-y-10">
        <div v-for="group in visibleGroups" :key="group.category">
          <div class="mb-4 flex items-center gap-2.5">
            <span
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white"
            >
              <el-icon :size="18"><component :is="LINK_CATEGORY_ICONS[group.category]" /></el-icon>
            </span>
            <h2 class="text-lg font-bold text-ink-900 dark:text-white">
              {{ LINK_CATEGORY_LABELS[group.category] }}
            </h2>
            <span class="text-xs text-ink-400">{{ group.links.length }} 个</span>
          </div>

          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <LinkCard v-for="link in group.links" :key="link.id" :link="link" />
          </div>
        </div>
      </div>

      <EmptyState
        v-else-if="!store.loading"
        icon="Link"
        title="没有匹配的站点"
        description="换个关键词，或登录后台添加更多同好站点。"
      >
        <el-button type="primary" plain @click="keyword = ''; activeCategory = 'all'">重置筛选</el-button>
      </EmptyState>
    </section>
  </div>
</template>
