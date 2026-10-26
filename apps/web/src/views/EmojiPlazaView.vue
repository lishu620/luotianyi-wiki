<script setup lang="ts">
import {
  EMOJI_CATEGORIES,
  EMOJI_CATEGORY_ICONS,
  EMOJI_CATEGORY_LABELS,
  EMOJI_PACK_STATUS_LABELS,
  EMOJI_SORT_FIELDS,
  type EmojiCategory,
  type EmojiImage,
  type EmojiImageSearchResult,
  type EmojiPack,
  type EmojiSortField,
} from '@luotianyi/shared';
import { ElMessage } from 'element-plus';
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { emojiApi } from '@/api';
import EmptyState from '@/components/EmptyState.vue';
import SectionHeading from '@/components/SectionHeading.vue';
import { useAuthStore } from '@/stores/auth';
import { compact, formatDate, formatNumber } from '@/utils';

const router = useRouter();
const auth = useAuthStore();

const packs = ref<EmojiPack[]>([]);
const total = ref(0);
const loading = ref(false);
const categories = ref<Array<{ category: EmojiCategory; count: number }>>([]);
const stats = ref({ packCount: 0, imageCount: 0 });

const query = reactive({
  keyword: '',
  category: undefined as EmojiCategory | undefined,
  sortBy: 'updatedAt' as EmojiSortField,
  order: 'DESC' as 'ASC' | 'DESC',
  page: 1,
  pageSize: 12,
});

const sortOptions = EMOJI_SORT_FIELDS.map((field) => ({
  value: field,
  label:
    {
      updatedAt: '最近更新',
      createdAt: '最新创建',
      name: '名称排序',
      imageCount: '表情数量',
    }[field] ?? field,
}));

const canUpload = computed(() => auth.isLoggedIn && auth.can('emoji.create'));

function countOf(category: EmojiCategory): number {
  return categories.value.find((item) => item.category === category)?.count ?? 0;
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const result = await emojiApi.list(compact({ ...query }));
    packs.value = result.items;
    total.value = result.total;
  } catch {
    packs.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

async function loadMeta(): Promise<void> {
  const [categoryRows, overview] = await Promise.all([
    emojiApi.categories().catch(() => []),
    emojiApi.stats().catch(() => ({ packCount: 0, imageCount: 0 })),
  ]);
  categories.value = categoryRows;
  stats.value = overview;
}

function search(): void {
  query.page = 1;
  void load();
}

function reset(): void {
  query.keyword = '';
  query.category = undefined;
  query.sortBy = 'updatedAt';
  query.order = 'DESC';
  query.page = 1;
  void load();
}

function changePage(page: number): void {
  query.page = page;
  void load();
}

function goUpload(): void {
  if (canUpload.value) {
    void router.push({ name: 'admin-emoji' });
    return;
  }
  void router.push({ name: 'login', query: { redirect: '/admin/emoji' } });
}

/* ------------------------------------------------------------------ */
/* 表情包详情                                                          */
/* ------------------------------------------------------------------ */

const drawerVisible = ref(false);
const detailLoading = ref(false);
const activePack = ref<EmojiPack | null>(null);

const previewUrls = computed(() => activePack.value?.images?.map((image) => image.url) ?? []);

async function openPack(pack: EmojiPack): Promise<void> {
  activePack.value = pack;
  drawerVisible.value = true;
  detailLoading.value = true;
  try {
    activePack.value = await emojiApi.detail(pack.id);
  } catch {
    drawerVisible.value = false;
  } finally {
    detailLoading.value = false;
  }
}

function downloadImage(image: EmojiImage): void {
  const link = document.createElement('a');
  link.href = image.url;
  link.download = `${image.name || 'emoji'}.webp`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function copyImageLink(image: EmojiImage): Promise<void> {
  try {
    await navigator.clipboard.writeText(`${window.location.origin}${image.url}`);
    ElMessage.success('图片直链已复制');
  } catch {
    ElMessage.warning('当前浏览器不支持自动复制，请右键图片复制地址');
  }
}

function formatSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/* ------------------------------------------------------------------ */
/* 以图搜图                                                            */
/* ------------------------------------------------------------------ */

const fileInput = ref<HTMLInputElement | null>(null);
const dragActive = ref(false);
const searching = ref(false);
const searchResult = ref<EmojiImageSearchResult | null>(null);
const searchPreview = ref('');
const searchFileName = ref('');

function pickImage(): void {
  fileInput.value?.click();
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file) void runImageSearch(file);
}

function onDrop(event: DragEvent): void {
  dragActive.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) void runImageSearch(file);
}

function releasePreview(): void {
  if (searchPreview.value) URL.revokeObjectURL(searchPreview.value);
  searchPreview.value = '';
}

async function runImageSearch(file: File): Promise<void> {
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件');
    return;
  }
  if (file.size > 12 * 1024 * 1024) {
    ElMessage.warning('图片不能超过 12MB');
    return;
  }

  releasePreview();
  searchPreview.value = URL.createObjectURL(file);
  searchFileName.value = file.name;
  searching.value = true;
  searchResult.value = null;

  try {
    searchResult.value = await emojiApi.searchByImage(file, { limit: 16 });
  } catch {
    searchResult.value = null;
  } finally {
    searching.value = false;
  }
}

function clearSearch(): void {
  releasePreview();
  searchResult.value = null;
  searchFileName.value = '';
}

onMounted(async () => {
  await Promise.allSettled([load(), loadMeta()]);
});

onBeforeUnmount(releasePreview);
</script>

<template>
  <div>
    <section
      class="border-b border-ink-200/60 bg-gradient-to-br from-brand-50 via-white to-violet-50 dark:border-ink-800 dark:from-ink-900 dark:via-ink-950 dark:to-ink-900"
    >
      <div class="lty-container py-12">
        <SectionHeading
          title="表情广场"
          subtitle="收集洛天依相关的表情包，支持按分类浏览、关键词检索，也可以上传一张图找出相似表情与所属表情包"
          icon="MagicStick"
        >
          <div class="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
            <span class="lty-chip bg-white/80 text-brand-700 dark:bg-ink-800 dark:text-brand-300">
              <el-icon><Collection /></el-icon>
              {{ formatNumber(stats.packCount) }} 个表情包
            </span>
            <span class="lty-chip bg-white/80 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
              <el-icon><Picture /></el-icon>
              {{ formatNumber(stats.imageCount) }} 张表情
            </span>
            <span class="text-xs text-ink-400">图片自动压缩为 WebP 存储</span>
          </div>
        </SectionHeading>

        <div class="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <el-input
            v-model="query.keyword"
            size="large"
            class="lg:max-w-sm"
            placeholder="搜索表情包名称、简介或标签"
            clearable
            @keyup.enter="search"
            @clear="search"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-select v-model="query.sortBy" class="!w-36" @change="search">
            <el-option
              v-for="option in sortOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>

          <el-button size="large" plain @click="search">
            <el-icon class="mr-1"><Search /></el-icon>
            筛选
          </el-button>

          <el-button size="large" type="primary" @click="goUpload">
            <el-icon class="mr-1"><Upload /></el-icon>
            {{ canUpload ? '上传表情包' : '登录后上传' }}
          </el-button>

          <el-button v-if="canUpload" size="large" text @click="$router.push({ name: 'admin-emoji' })">
            <el-icon class="mr-1"><Management /></el-icon>
            管理我的表情包
          </el-button>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            class="lty-chip transition-colors"
            :class="
              query.category === undefined
                ? 'bg-brand-500 text-white'
                : 'bg-white text-ink-600 hover:bg-brand-50 dark:bg-ink-800 dark:text-ink-300'
            "
            @click="query.category = undefined; search()"
          >
            <el-icon><Menu /></el-icon>
            全部
            <span class="opacity-70">{{ formatNumber(stats.packCount) }}</span>
          </button>

          <button
            v-for="category in EMOJI_CATEGORIES"
            :key="category"
            type="button"
            class="lty-chip transition-colors"
            :class="
              query.category === category
                ? 'bg-brand-500 text-white'
                : 'bg-white text-ink-600 hover:bg-brand-50 dark:bg-ink-800 dark:text-ink-300'
            "
            @click="query.category = category; search()"
          >
            <el-icon><component :is="EMOJI_CATEGORY_ICONS[category]" /></el-icon>
            {{ EMOJI_CATEGORY_LABELS[category] }}
            <span class="opacity-70">{{ countOf(category) }}</span>
          </button>
        </div>
      </div>
    </section>

    <section class="lty-container py-10">
      <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div class="min-w-0">
          <div v-loading="loading">
            <div v-if="packs.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <button
                v-for="pack in packs"
                :key="pack.id"
                type="button"
                class="lty-card lty-card-hover group overflow-hidden text-left"
                @click="openPack(pack)"
              >
                <div class="relative aspect-square overflow-hidden bg-ink-100 dark:bg-ink-800">
                  <img
                    v-if="pack.coverUrl"
                    :src="pack.coverUrl"
                    :alt="pack.name"
                    class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div v-else class="flex h-full items-center justify-center text-ink-300">
                    <el-icon :size="42"><Picture /></el-icon>
                  </div>

                  <span
                    class="absolute top-2 left-2 lty-chip bg-black/55 text-white backdrop-blur"
                  >
                    <el-icon><component :is="EMOJI_CATEGORY_ICONS[pack.category]" /></el-icon>
                    {{ EMOJI_CATEGORY_LABELS[pack.category] }}
                  </span>

                  <span
                    v-if="pack.status !== 'published'"
                    class="absolute top-2 right-2 lty-chip bg-amber-500/90 text-white"
                  >
                    {{ EMOJI_PACK_STATUS_LABELS[pack.status] }}
                  </span>
                </div>

                <div class="p-4">
                  <div class="flex items-start justify-between gap-2">
                    <h3 class="truncate font-semibold text-ink-900 dark:text-white">
                      {{ pack.name }}
                    </h3>
                    <span class="shrink-0 text-xs text-ink-400">{{ pack.imageCount }} 张</span>
                  </div>

                  <p v-if="pack.description" class="mt-1.5 line-clamp-2 text-xs text-ink-500 dark:text-ink-400">
                    {{ pack.description }}
                  </p>

                  <div class="mt-3 flex items-center justify-between gap-2">
                    <div class="flex min-w-0 flex-wrap gap-1">
                      <span
                        v-for="tag in pack.tags.slice(0, 3)"
                        :key="tag"
                        class="lty-chip bg-brand-50 text-brand-700 dark:bg-ink-800 dark:text-brand-300"
                      >
                        #{{ tag }}
                      </span>
                    </div>
                    <span class="shrink-0 text-[11px] text-ink-400">{{ formatDate(pack.updatedAt) }}</span>
                  </div>
                </div>
              </button>
            </div>

            <EmptyState
              v-else-if="!loading"
              icon="MagicStick"
              title="还没有匹配的表情包"
              description="换个关键词或分类，也可以上传一张图试试以图搜图。"
            >
              <el-button type="primary" plain @click="reset">重置筛选</el-button>
            </EmptyState>
          </div>

          <div v-if="total > query.pageSize" class="mt-8 flex justify-center">
            <el-pagination
              background
              layout="prev, pager, next"
              :current-page="query.page"
              :page-size="query.pageSize"
              :total="total"
              @current-change="changePage"
            />
          </div>
        </div>

        <!-- 以图搜图 -->
        <aside class="min-w-0 lg:order-none">
          <div class="lty-card p-5">
            <div class="flex items-center gap-2">
              <span
                class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-brand-500 text-white shadow-soft"
              >
                <el-icon :size="18"><Aim /></el-icon>
              </span>
              <div>
                <h3 class="text-sm font-bold text-ink-900 dark:text-white">以图搜图</h3>
                <p class="text-[11px] text-ink-400">上传一张表情，找出相似图片与整个表情包</p>
              </div>
            </div>

            <div
              class="mt-4 cursor-pointer rounded-2xl border-2 border-dashed p-4 text-center transition-colors"
              :class="
                dragActive
                  ? 'border-brand-400 bg-brand-50 dark:bg-ink-800'
                  : 'border-ink-200 hover:border-brand-300 hover:bg-brand-50/40 dark:border-ink-700 dark:hover:bg-ink-800/60'
              "
              @click="pickImage"
              @dragover.prevent="dragActive = true"
              @dragleave.prevent="dragActive = false"
              @drop.prevent="onDrop"
            >
              <img
                v-if="searchPreview"
                :src="searchPreview"
                alt="搜索图片预览"
                class="mx-auto max-h-40 rounded-xl object-contain"
              />
              <template v-else>
                <el-icon :size="30" class="text-ink-300"><UploadFilled /></el-icon>
                <p class="mt-2 text-xs text-ink-500 dark:text-ink-400">
                  点击选择，或把图片拖到这里
                </p>
              </template>
              <p v-if="searchFileName" class="mt-2 truncate text-[11px] text-ink-400">
                {{ searchFileName }}
              </p>
            </div>

            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onFileChange"
            />

            <div v-if="searching" class="mt-4 flex items-center gap-2 text-xs text-brand-600 dark:text-brand-300">
              <el-icon class="animate-spin"><Loading /></el-icon>
              正在计算感知哈希并匹配…
            </div>

            <template v-if="searchResult && !searching">
              <div class="mt-4 flex items-center justify-between">
                <p class="text-xs font-medium text-ink-600 dark:text-ink-300">
                  找到 {{ searchResult.packs.length }} 个相关表情包
                </p>
                <el-button text size="small" @click="clearSearch">清除</el-button>
              </div>

              <div v-if="searchResult.packs.length" class="mt-2 space-y-2">
                <button
                  v-for="hit in searchResult.packs"
                  :key="hit.pack.id"
                  type="button"
                  class="flex w-full items-center gap-3 rounded-xl border border-ink-200/70 p-2 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/60 dark:border-ink-800 dark:hover:bg-ink-800/70"
                  @click="openPack(hit.pack)"
                >
                  <img
                    v-if="hit.image.url"
                    :src="hit.image.url"
                    :alt="hit.image.name"
                    class="h-12 w-12 shrink-0 rounded-lg object-cover"
                    loading="lazy"
                  />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-xs font-semibold text-ink-800 dark:text-ink-100">
                      {{ hit.pack.name }}
                    </span>
                    <span class="mt-0.5 block truncate text-[11px] text-ink-400">
                      最相似：{{ hit.image.name }}
                    </span>
                    <span class="mt-1 flex items-center gap-1.5">
                      <span class="h-1 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                        <span
                          class="block h-full rounded-full bg-gradient-to-r from-brand-400 to-violet-500"
                          :style="{ width: `${Math.round(hit.similarity * 100)}%` }"
                        />
                      </span>
                      <span class="text-[10px] text-ink-400">
                        {{ Math.round(hit.similarity * 100) }}%
                      </span>
                    </span>
                  </span>
                </button>
              </div>

              <p v-else class="mt-3 rounded-xl bg-ink-50 p-3 text-xs text-ink-500 dark:bg-ink-800/60 dark:text-ink-400">
                没有找到足够相似的表情。可以换一张更清晰、无水印的图片再试。
              </p>
            </template>
          </div>

          <div class="mt-4 rounded-2xl border border-dashed border-ink-200 p-4 text-[11px] leading-relaxed text-ink-400 dark:border-ink-800">
            <p class="font-medium text-ink-500 dark:text-ink-400">搜索原理</p>
            <p class="mt-1">
              使用 dHash 感知哈希比较图片结构，无需上传到第三方服务。对裁剪、缩放、轻度调色的表情识别效果较好。
            </p>
          </div>
        </aside>
      </div>
    </section>

    <!-- 表情包详情 -->
    <el-drawer
      v-model="drawerVisible"
      size="94%"
      class="emoji-drawer"
      :with-header="false"
      destroy-on-close
    >
      <div v-loading="detailLoading" class="mx-auto w-full max-w-6xl py-2">
        <template v-if="activePack">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-xl font-bold text-ink-900 dark:text-white">
                  {{ activePack.name }}
                </h2>
                <span class="lty-chip bg-brand-50 text-brand-700 dark:bg-ink-800 dark:text-brand-300">
                  <el-icon><component :is="EMOJI_CATEGORY_ICONS[activePack.category]" /></el-icon>
                  {{ EMOJI_CATEGORY_LABELS[activePack.category] }}
                </span>
                <span class="lty-chip bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300">
                  {{ activePack.imageCount }} 张表情
                </span>
              </div>

              <p v-if="activePack.description" class="mt-2 max-w-2xl text-sm text-ink-500 dark:text-ink-400">
                {{ activePack.description }}
              </p>

              <div class="mt-3 flex flex-wrap gap-1.5">
                <span
                  v-for="tag in activePack.tags"
                  :key="tag"
                  class="lty-chip bg-ink-50 text-ink-500 dark:bg-ink-800 dark:text-ink-300"
                >
                  #{{ tag }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <el-button
                v-if="canUpload"
                text
                @click="drawerVisible = false; $router.push({ name: 'admin-emoji' })"
              >
                <el-icon class="mr-1"><Management /></el-icon>
                管理
              </el-button>
              <el-button circle text @click="drawerVisible = false">
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
          </div>

          <div v-if="activePack.images?.length" class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div
              v-for="(image, index) in activePack.images"
              :key="image.id"
              class="group overflow-hidden rounded-xl border border-ink-200/70 bg-white dark:border-ink-800 dark:bg-ink-900"
            >
              <el-image
                :src="image.url"
                :preview-src-list="previewUrls"
                :initial-index="index"
                :alt="image.name"
                fit="contain"
                lazy
                class="aspect-square w-full bg-ink-50 dark:bg-ink-800"
              />
              <div class="p-2">
                <div class="flex items-center gap-1">
                  <p class="min-w-0 flex-1 truncate text-xs font-medium text-ink-800 dark:text-ink-100">
                    {{ image.name }}
                  </p>
                  <span
                    v-if="image.watermarkText"
                    class="shrink-0 rounded bg-ink-100 px-1 py-0.5 text-[9px] text-ink-400 dark:bg-ink-800"
                  >
                    水印
                  </span>
                </div>
                <p class="mt-0.5 text-[10px] text-ink-400">
                  {{ image.width }}×{{ image.height }} · {{ formatSize(image.fileSize) }}
                </p>
                <div class="mt-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <el-button text size="small" @click="downloadImage(image)">
                    <el-icon><Download /></el-icon>
                  </el-button>
                  <el-button text size="small" @click="copyImageLink(image)">
                    <el-icon><Link /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <EmptyState
            v-else
            icon="Picture"
            title="这个表情包还是空的"
            description="作者还没有上传表情，过一会儿再来看看吧。"
          />
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

:deep(.emoji-drawer .el-drawer__body) {
  padding: 1.25rem;
}
</style>
