<script setup lang="ts">
import { LINK_CATEGORY_ICONS, LINK_CATEGORY_LABELS, type ExternalLink } from '@luotianyi/shared';
import { computed } from 'vue';

import { linkApi } from '@/api';
import { initialFromText } from '@/utils';

const props = defineProps<{ link: ExternalLink }>();

const categoryLabel = computed(() => LINK_CATEGORY_LABELS[props.link.category] ?? '其他站点');
const categoryIcon = computed(() => LINK_CATEGORY_ICONS[props.link.category] ?? 'Link');
const initial = computed(() => initialFromText(props.link.title));

function handleOpen(): void {
  // 记录点击，失败不影响跳转
  void linkApi.recordClick(props.link.id).catch(() => undefined);
  window.open(props.link.url, '_blank', 'noopener,noreferrer');
}
</script>

<template>
  <button
    type="button"
    class="lty-card lty-card-hover group flex w-full items-start gap-3.5 p-4 text-left"
    @click="handleOpen"
  >
    <span
      class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-brand-600 dark:bg-ink-800 dark:text-brand-300"
    >
      <img
        v-if="link.iconUrl"
        :src="link.iconUrl"
        :alt="link.title"
        class="h-6 w-6 object-contain"
        loading="lazy"
      />
      <span v-else class="text-sm font-bold">{{ initial }}</span>
    </span>

    <span class="min-w-0 flex-1">
      <span class="flex items-center gap-2">
        <span
          class="truncate font-semibold text-ink-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300"
        >
          {{ link.title }}
        </span>
        <span
          v-if="link.recommended"
          class="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
        >
          推荐
        </span>
      </span>

      <span class="mt-1 block truncate text-xs text-ink-500 dark:text-ink-400">
        <el-icon class="mr-1 align-[-2px]"><component :is="categoryIcon" /></el-icon>
        {{ categoryLabel }}
        <template v-if="link.tags?.length">
          <span class="mx-1.5 text-ink-300">·</span>{{ link.tags.slice(0, 3).join(' / ') }}
        </template>
      </span>

      <span v-if="link.description" class="mt-1.5 line-clamp-2 block text-xs text-ink-500 dark:text-ink-400">
        {{ link.description }}
      </span>
    </span>

    <el-icon
      class="mt-1 shrink-0 text-ink-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-500"
    >
      <TopRight />
    </el-icon>
  </button>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
