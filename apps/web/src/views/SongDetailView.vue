<script setup lang="ts">
import { VOCAL_TYPE_LABELS } from '@luotianyi/shared';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import EmptyState from '@/components/EmptyState.vue';
import SongCard from '@/components/SongCard.vue';
import { useSongsStore } from '@/stores/songs';
import {
  formatDateLong,
  formatDuration,
  formatNumber,
  getSongExternalLinks,
  gradientFromText,
  initialFromText,
  renderMarkdown,
} from '@/utils';

const route = useRoute();
const router = useRouter();
const store = useSongsStore();

const lyricsExpanded = ref(false);
const failed = ref(false);

const song = computed(() => store.detail);
const gradient = computed(() => gradientFromText(song.value?.title ?? ''));
const initial = computed(() => initialFromText(song.value?.title ?? ''));
const platformLinks = computed(() => (song.value ? getSongExternalLinks(song.value) : []));

const credits = computed(() => {
  const current = song.value;
  if (!current) return [];

  return [
    { label: 'P 主 / 投稿', value: current.producer },
    { label: '作词', value: current.lyricist },
    { label: '作曲', value: current.composer },
    { label: '编曲', value: current.arranger },
    { label: '演唱形式', value: VOCAL_TYPE_LABELS[current.vocalType] ?? '独唱' },
    {
      label: '其他演唱者',
      value: current.featuredSingers?.length ? current.featuredSingers.join('、') : null,
    },
  ].filter((item) => Boolean(item.value));
});

function loadLyrics(): void {
  lyricsExpanded.value = true;
}

async function load(id: string): Promise<void> {
  failed.value = false;
  lyricsExpanded.value = false;

  try {
    await store.fetchDetail(id);
  } catch {
    failed.value = true;
  }
}

watch(
  () => route.params.id,
  (id) => {
    if (typeof id === 'string') void load(id);
  },
);

onMounted(() => {
  if (typeof route.params.id === 'string') void load(route.params.id);
});
</script>

<template>
  <div v-loading="store.detailLoading" class="lty-container py-10">
    <el-button text class="mb-4" @click="router.back()">
      <el-icon class="mr-1"><ArrowLeft /></el-icon>
      返回
    </el-button>

    <template v-if="song">
      <div class="grid gap-8 lg:grid-cols-[320px_1fr]">
        <!-- 封面 -->
        <div class="lty-card overflow-hidden">
          <div
            class="flex h-64 items-center justify-center"
            :style="{ background: song.coverUrl ? undefined : gradient }"
          >
            <img
              v-if="song.coverUrl"
              :src="song.coverUrl"
              :alt="song.title"
              class="h-full w-full object-cover"
            />
            <span v-else class="text-6xl font-black text-white/85">{{ initial }}</span>
          </div>

          <div class="space-y-3 p-5">
            <div class="flex items-center justify-between text-sm">
              <span class="text-ink-500 dark:text-ink-400">播放量</span>
              <span class="font-semibold text-ink-900 dark:text-white">
                {{ formatNumber(song.playCount) }}
              </span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-ink-500 dark:text-ink-400">时长</span>
              <span class="font-semibold text-ink-900 dark:text-white">
                {{ formatDuration(song.duration) }}
              </span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-ink-500 dark:text-ink-400">发行</span>
              <span class="font-semibold text-ink-900 dark:text-white">
                {{ formatDateLong(song.releaseDate) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 详情 -->
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span
              v-if="song.isFeatured"
              class="lty-chip bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
            >
              <el-icon><StarFilled /></el-icon>
              代表作
            </span>
            <span
              class="lty-chip bg-brand-50 text-brand-700 dark:bg-ink-800 dark:text-brand-300"
            >
              {{ VOCAL_TYPE_LABELS[song.vocalType] ?? '独唱' }}
            </span>
            <span v-if="song.releaseYear" class="lty-chip bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
              {{ song.releaseYear }}
            </span>
          </div>

          <h1 class="mt-3 text-3xl font-black tracking-tight text-ink-900 sm:text-4xl dark:text-white">
            {{ song.title }}
          </h1>

          <p v-if="song.aliases?.length" class="mt-2 text-sm text-ink-500 dark:text-ink-400">
            别名：{{ song.aliases.join(' / ') }}
          </p>

          <!-- 平台跳转 -->
          <div v-if="platformLinks.length" class="mt-6 flex flex-wrap gap-2.5">
            <a
              v-for="link in platformLinks"
              :key="link.label"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 rounded-xl border border-ink-200/70 px-3.5 py-2 text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-soft dark:border-ink-800"
            >
              <el-icon :style="{ color: link.color }"><component :is="link.icon" /></el-icon>
              {{ link.label }}
            </a>
          </div>

          <!-- 标签 -->
          <div v-if="song.tags?.length" class="mt-5 flex flex-wrap gap-2">
            <router-link
              v-for="tag in song.tags"
              :key="tag"
              :to="{ name: 'songs', query: { tag } }"
              class="lty-chip bg-ink-100 text-ink-600 transition-colors hover:bg-brand-100 hover:text-brand-700 dark:bg-ink-800 dark:text-ink-300"
            >
              # {{ tag }}
            </router-link>
          </div>

          <!-- 创作信息 -->
          <div v-if="credits.length" class="lty-card mt-6 p-5">
            <p class="mb-4 text-sm font-semibold text-ink-900 dark:text-white">创作信息</p>
            <dl class="grid gap-3 sm:grid-cols-2">
              <div v-for="item in credits" :key="item.label" class="flex items-baseline gap-3 text-sm">
                <dt class="w-24 shrink-0 text-ink-500 dark:text-ink-400">{{ item.label }}</dt>
                <dd class="font-medium text-ink-900 dark:text-white">{{ item.value }}</dd>
              </div>
            </dl>
          </div>

          <!-- 简介 -->
          <div v-if="song.description" class="lty-card mt-6 p-5">
            <p class="mb-3 text-sm font-semibold text-ink-900 dark:text-white">歌曲简介</p>
            <div class="lty-prose">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div v-html="renderMarkdown(song.description)" />
            </div>
          </div>

          <!-- 歌词 -->
          <div v-if="song.lyrics" class="lty-card mt-6 p-5">
            <div class="mb-3 flex items-center justify-between">
              <p class="text-sm font-semibold text-ink-900 dark:text-white">歌词</p>
              <el-button text size="small" @click="lyricsExpanded = !lyricsExpanded">
                {{ lyricsExpanded ? '收起' : '展开' }}
              </el-button>
            </div>

            <pre
              class="max-h-80 overflow-auto text-sm leading-relaxed whitespace-pre-wrap text-ink-600 dark:text-ink-300"
              :class="lyricsExpanded ? '' : 'max-h-32'"
            >{{ song.lyrics }}</pre>

            <el-button v-if="!lyricsExpanded" text size="small" @click="loadLyrics">
              查看完整歌词
            </el-button>
          </div>
        </div>
      </div>

      <!-- 相关推荐 -->
      <section v-if="store.related.length" class="mt-14">
        <h2 class="text-xl font-bold text-ink-900 dark:text-white">相关推荐</h2>
        <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SongCard v-for="item in store.related" :key="item.id" :song="item" compact />
        </div>
      </section>
    </template>

    <EmptyState
      v-else-if="!store.detailLoading"
      icon="Warning"
      :title="failed ? '没有找到这首歌' : '暂无数据'"
      description="可能是链接已失效，或者该歌曲尚未发布。"
    >
      <el-button type="primary" plain @click="router.push({ name: 'songs' })">返回歌曲库</el-button>
    </EmptyState>
  </div>
</template>
