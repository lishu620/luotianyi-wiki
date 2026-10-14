<script setup lang="ts">
import { VOCAL_TYPES, VOCAL_TYPE_LABELS, type SongSortField, type VocalType } from '@luotianyi/shared';
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import EmptyState from '@/components/EmptyState.vue';
import SectionHeading from '@/components/SectionHeading.vue';
import SongCard from '@/components/SongCard.vue';
import { useSongsStore } from '@/stores/songs';

const route = useRoute();
const router = useRouter();
const store = useSongsStore();

const keywordInput = ref('');

const sortOptions: Array<{ value: SongSortField; label: string }> = [
  { value: 'createdAt', label: '最新收录' },
  { value: 'releaseDate', label: '发行时间' },
  { value: 'playCount', label: '播放量' },
  { value: 'title', label: '标题' },
];

async function load(): Promise<void> {
  await store.fetchList().catch(() => undefined);
}

function applySearch(): void {
  store.applyQuickFilter({ keyword: keywordInput.value.trim() });
  void syncRoute();
}

async function syncRoute(): Promise<void> {
  const query: Record<string, string> = {};
  if (store.query.keyword) query.keyword = store.query.keyword;
  if (store.query.year) query.year = String(store.query.year);
  if (store.query.tag) query.tag = store.query.tag;
  if (store.query.vocalType) query.vocalType = store.query.vocalType;
  if (store.query.producer) query.producer = store.query.producer;
  if (store.query.page && store.query.page > 1) query.page = String(store.query.page);

  await router.replace({ name: 'songs', query });
  await load();
}

function resetAll(): void {
  store.resetQuery();
  keywordInput.value = '';
  void syncRoute();
}

function changePage(page: number): void {
  store.setPage(page);
  void syncRoute();
}

watch(
  () => [store.query.year, store.query.tag, store.query.vocalType, store.query.producer, store.query.sortBy, store.query.order],
  () => {
    store.setPage(1);
    void syncRoute();
  },
);

onMounted(async () => {
  // 支持从其他页面带 query 进入
  const { keyword, year, tag, vocalType } = route.query;
  if (typeof keyword === 'string') {
    keywordInput.value = keyword;
    store.query.keyword = keyword;
  }
  if (typeof year === 'string') store.query.year = Number(year);
  if (typeof tag === 'string') store.query.tag = tag;
  if (typeof vocalType === 'string') store.query.vocalType = vocalType as VocalType;

  await Promise.allSettled([store.fetchFilters(), load()]);
});
</script>

<template>
  <div>
    <section class="border-b border-ink-200/60 bg-gradient-to-br from-brand-50 to-white dark:border-ink-800 dark:from-ink-900 dark:to-ink-950">
      <div class="lty-container py-12">
        <SectionHeading
          title="歌曲库"
          subtitle="收录洛天依的原创曲目，支持按关键词、年份、P 主与标签检索"
          icon="Headset"
        />

        <div class="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <el-input
            v-model="keywordInput"
            size="large"
            class="lg:max-w-md"
            placeholder="搜索歌名 / 拼音 / P 主 / 标签"
            clearable
            @keyup.enter="applySearch"
            @clear="applySearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
            <template #append>
              <el-button @click="applySearch">搜索</el-button>
            </template>
          </el-input>

          <div class="flex flex-wrap items-center gap-2">
            <el-select
              v-model="store.query.year"
              placeholder="年份"
              clearable
              class="!w-28"
              size="large"
            >
              <el-option v-for="year in store.filters.years" :key="year" :label="`${year} 年`" :value="year" />
            </el-select>

            <el-select v-model="store.query.producer" placeholder="P 主" clearable filterable class="!w-40" size="large">
              <el-option v-for="producer in store.filters.producers" :key="producer" :label="producer" :value="producer" />
            </el-select>

            <el-select v-model="store.query.vocalType" placeholder="演唱形式" clearable class="!w-32" size="large">
              <el-option
                v-for="type in VOCAL_TYPES"
                :key="type"
                :label="VOCAL_TYPE_LABELS[type]"
                :value="type"
              />
            </el-select>

            <el-select v-model="store.query.sortBy" class="!w-32" size="large">
              <el-option v-for="item in sortOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>

            <el-button size="large" text @click="resetAll">
              <el-icon class="mr-1"><RefreshLeft /></el-icon>
              重置
            </el-button>
          </div>
        </div>

        <!-- 标签快捷筛选 -->
        <div v-if="store.filters.tags.length" class="mt-4 flex flex-wrap gap-2">
          <button
            v-for="item in store.filters.tags.slice(0, 14)"
            :key="item.tag"
            type="button"
            class="lty-chip transition-colors"
            :class="
              store.query.tag === item.tag
                ? 'bg-brand-500 text-white'
                : 'bg-white text-ink-600 hover:bg-brand-50 dark:bg-ink-800 dark:text-ink-300'
            "
            @click="store.query.tag = store.query.tag === item.tag ? undefined : item.tag"
          >
            {{ item.tag }}
            <span class="opacity-60">{{ item.count }}</span>
          </button>
        </div>
      </div>
    </section>

    <section v-loading="store.loading" class="lty-container py-10">
      <div class="mb-5 flex items-center justify-between text-sm text-ink-500 dark:text-ink-400">
        <span>共 {{ store.total }} 首歌曲</span>
        <span v-if="store.query.keyword">关键词：{{ store.query.keyword }}</span>
      </div>

      <div v-if="store.list.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SongCard v-for="song in store.list" :key="song.id" :song="song" />
      </div>

      <EmptyState
        v-else-if="!store.loading"
        icon="Search"
        title="没有匹配的歌曲"
        description="试试更换关键词或清空筛选条件。"
      >
        <el-button type="primary" plain @click="resetAll">清空筛选</el-button>
      </EmptyState>

      <div v-if="store.totalPages > 1" class="mt-8 flex justify-center">
        <el-pagination
          background
          layout="prev, pager, next"
          :current-page="store.query.page"
          :page-size="store.query.pageSize"
          :total="store.total"
          @current-change="changePage"
        />
      </div>
    </section>
  </div>
</template>
