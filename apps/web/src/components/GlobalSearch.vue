<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { searchApi, type SearchAllResult } from '@/api';
import { formatNumber, gradientFromText, initialFromText } from '@/utils';

const visible = defineModel<boolean>({ required: true });

const router = useRouter();
const keyword = ref('');
const loading = ref(false);
const result = ref<SearchAllResult | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;

async function runSearch(): Promise<void> {
  const query = keyword.value.trim();

  if (!query) {
    result.value = null;
    return;
  }

  loading.value = true;
  try {
    result.value = await searchApi.all(query, 6);
  } catch {
    result.value = null;
  } finally {
    loading.value = false;
  }
}

watch(keyword, () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void runSearch(), 320);
});

watch(visible, (open) => {
  if (!open) {
    keyword.value = '';
    result.value = null;
  }
});

function goToSong(id: string): void {
  visible.value = false;
  void router.push({ name: 'song-detail', params: { id } });
}

function goToSongs(): void {
  visible.value = false;
  void router.push({ name: 'songs', query: { keyword: keyword.value.trim() } });
}

function goToLinks(): void {
  visible.value = false;
  void router.push({ name: 'links', query: { keyword: keyword.value.trim() } });
}
</script>

<template>
  <el-dialog
    v-model="visible"
    width="min(680px, 92vw)"
    top="10vh"
    :show-close="false"
    append-to-body
    class="lty-search-dialog"
  >
    <template #header>
      <el-input
        v-model="keyword"
        size="large"
        placeholder="搜索歌曲、P 主、标签或同好站点…"
        clearable
        autofocus
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </template>

    <div v-loading="loading" class="max-h-[60vh] min-h-[120px] overflow-y-auto pr-1">
      <template v-if="result">
        <div v-if="result.songs.length" class="mb-2">
          <p class="px-1 pb-1 text-xs font-semibold tracking-wide text-ink-400 uppercase">
            歌曲
            <span v-if="result.engine === 'postgres'" class="ml-1 normal-case">（数据库检索）</span>
          </p>

          <button
            v-for="song in result.songs"
            :key="song.id"
            type="button"
            class="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-brand-50 dark:hover:bg-ink-800"
            @click="goToSong(song.id)"
          >
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
              :style="{ background: gradientFromText(song.title) }"
            >
              {{ initialFromText(song.title) }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-ink-800 dark:text-ink-100">
                {{ song.title }}
              </span>
              <span class="block truncate text-xs text-ink-400">
                {{ song.producer || 'P 主待补充' }} · {{ song.releaseYear ?? '—' }} ·
                {{ formatNumber(song.playCount) }} 播放
              </span>
            </span>
          </button>
        </div>

        <div v-if="result.links.length" class="mb-2">
          <p class="px-1 pb-1 text-xs font-semibold tracking-wide text-ink-400 uppercase">同好站点</p>

          <a
            v-for="link in result.links"
            :key="link.id"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="flex w-full items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-brand-50 dark:hover:bg-ink-800"
            @click="visible = false"
          >
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600 dark:bg-ink-800 dark:text-brand-300"
            >
              {{ initialFromText(link.title) }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-ink-800 dark:text-ink-100">
                {{ link.title }}
              </span>
              <span class="block truncate text-xs text-ink-400">{{ link.url }}</span>
            </span>
          </a>
        </div>

        <el-empty
          v-if="!result.songs.length && !result.links.length"
          description="没有找到相关内容，换个关键词试试"
          :image-size="80"
        />
      </template>

      <p v-else class="py-8 text-center text-sm text-ink-400">
        输入关键词开始搜索，支持歌名、拼音、P 主与标签
      </p>
    </div>

    <template #footer>
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-400">
        <span>回车即时搜索 · 结果由 Meilisearch/数据库提供</span>
        <div class="flex gap-2">
          <el-button text size="small" :disabled="!keyword.trim()" @click="goToSongs">
            查看全部歌曲
          </el-button>
          <el-button text size="small" :disabled="!keyword.trim()" @click="goToLinks">
            查看全部站点
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<style>
.lty-search-dialog .el-dialog__header {
  margin-right: 0;
  padding-bottom: 8px;
}
</style>
