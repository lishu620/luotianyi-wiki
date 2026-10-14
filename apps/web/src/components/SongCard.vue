<script setup lang="ts">
import { VOCAL_TYPE_LABELS, type Song } from '@luotianyi/shared';
import { computed } from 'vue';

import { formatDate, formatDuration, formatNumber, gradientFromText, initialFromText } from '@/utils';

interface Props {
  song: Song;
  /** 紧凑模式用于列表/推荐位 */
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), { compact: false });

const gradient = computed(() => gradientFromText(props.song.title));
const initial = computed(() => initialFromText(props.song.title));
const vocalLabel = computed(() => VOCAL_TYPE_LABELS[props.song.vocalType] ?? '独唱');
const visibleTags = computed(() => (props.song.tags ?? []).slice(0, 3));
</script>

<template>
  <router-link
    :to="{ name: 'song-detail', params: { id: song.id } }"
    class="lty-card lty-card-hover group flex flex-col overflow-hidden"
  >
    <div
      class="relative flex h-36 items-center justify-center overflow-hidden"
      :style="{ background: song.coverUrl ? undefined : gradient }"
    >
      <img
        v-if="song.coverUrl"
        :src="song.coverUrl"
        :alt="song.title"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      <span v-else class="text-4xl font-black text-white/85 select-none">{{ initial }}</span>

      <span
        v-if="song.isFeatured"
        class="absolute top-2.5 left-2.5 rounded-full bg-amber-400/95 px-2 py-0.5 text-[11px] font-semibold text-amber-950 shadow"
      >
        代表作
      </span>

      <span
        v-if="song.duration"
        class="absolute right-2.5 bottom-2.5 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur"
      >
        {{ formatDuration(song.duration) }}
      </span>
    </div>

    <div class="flex flex-1 flex-col gap-2 p-4">
      <h3
        class="line-clamp-1 font-semibold text-ink-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300"
      >
        {{ song.title }}
      </h3>

      <p class="line-clamp-1 text-xs text-ink-500 dark:text-ink-400">
        <span>{{ song.producer || 'P 主待补充' }}</span>
        <span class="mx-1.5 text-ink-300">·</span>
        <span>{{ song.releaseYear ?? '—' }}</span>
        <span class="mx-1.5 text-ink-300">·</span>
        <span>{{ vocalLabel }}</span>
      </p>

      <p v-if="!compact && song.description" class="line-clamp-2 text-xs text-ink-500 dark:text-ink-400">
        {{ song.description }}
      </p>

      <div v-if="visibleTags.length" class="mt-auto flex flex-wrap gap-1.5 pt-1">
        <span
          v-for="tag in visibleTags"
          :key="tag"
          class="lty-chip bg-brand-50 text-brand-700 dark:bg-ink-800 dark:text-brand-300"
        >
          {{ tag }}
        </span>
      </div>

      <div
        class="mt-3 flex items-center justify-between border-t border-ink-100 pt-3 text-[11px] text-ink-400 dark:border-ink-800"
      >
        <span class="inline-flex items-center gap-1">
          <el-icon><View /></el-icon>
          {{ formatNumber(song.playCount) }}
        </span>
        <span>{{ formatDate(song.releaseDate) }}</span>
      </div>
    </div>
  </router-link>
</template>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
