<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { computed, onMounted, ref } from 'vue';

import { searchApi, type SearchStatus } from '@/api';
import StatCard from '@/components/StatCard.vue';
import { useAuthStore } from '@/stores/auth';
import { useStatsStore } from '@/stores/stats';
import { formatNumber } from '@/utils';

const auth = useAuthStore();
const statsStore = useStatsStore();

const searchStatus = ref<SearchStatus | null>(null);
const reindexing = ref(false);

const overview = computed(() => statsStore.dashboard?.overview ?? null);
const topSongs = computed(() => statsStore.dashboard?.topSongs ?? []);

const shortcuts = [
  { name: 'admin-songs', label: '管理歌曲', description: '新增、编辑与批量删除曲目', icon: 'Headset' },
  { name: 'admin-links', label: '管理外链', description: '维护同好站点与分类排序', icon: 'Connection' },
  { name: 'admin-profile', label: '介绍页内容', description: '编辑角色资料与图鉴', icon: 'Document' },
  { name: 'home', label: '查看前台', description: '预览访客看到的页面', icon: 'View' },
] as const;

async function loadSearchStatus(): Promise<void> {
  searchStatus.value = await searchApi.status().catch(() => null);
}

async function handleReindex(): Promise<void> {
  reindexing.value = true;
  try {
    const result = await searchApi.reindex();
    if (result.meilisearchReady) {
      ElMessage.success(`索引重建完成：歌曲 ${result.songs} 首，外链 ${result.links} 个`);
    } else {
      ElMessage.warning('Meilisearch 未就绪，未写入索引（检索会自动降级到数据库）');
    }
    await loadSearchStatus();
  } finally {
    reindexing.value = false;
  }
}

onMounted(async () => {
  await Promise.allSettled([statsStore.fetchDashboard(), loadSearchStatus()]);
});
</script>

<template>
  <div class="space-y-6">
    <!-- 欢迎 -->
    <section class="lty-card overflow-hidden">
      <div
        class="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-brand-50 to-violet-50 p-6 dark:from-ink-900 dark:to-ink-900"
      >
        <div>
          <h2 class="text-xl font-bold text-ink-900 dark:text-white">
            欢迎回来，{{ auth.user?.username ?? '管理员' }}
          </h2>
          <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">
            在这里维护洛天依的资料、歌曲库与同好站点导航。
          </p>
        </div>

        <el-button type="primary" @click="$router.push({ name: 'home' })">
          <el-icon class="mr-1"><View /></el-icon>
          查看前台
        </el-button>
      </div>
    </section>

    <!-- 指标 -->
    <section v-if="overview" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="收录歌曲" :value="overview.songCount" icon="Headset" :hint="`已发布 ${overview.publishedSongCount} 首`" />
      <StatCard label="草稿" :value="overview.songCount - overview.publishedSongCount" icon="EditPen" suffix="首" :compact-value="false" />
      <StatCard label="代表作" :value="overview.featuredCount" icon="Star" suffix="首" :compact-value="false" />
      <StatCard label="同好站点" :value="overview.linkCount" icon="Connection" suffix="个" :compact-value="false" />
    </section>

    <div class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <!-- 搜索服务状态 -->
      <section class="lty-card p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-base font-bold text-ink-900 dark:text-white">搜索引擎状态</h3>
            <p class="mt-1 text-xs text-ink-500 dark:text-ink-400">
              歌曲与外链使用 Meilisearch 检索；服务不可用时自动降级为数据库模糊查询。
            </p>
          </div>

          <el-button :loading="reindexing" @click="handleReindex">
            <el-icon class="mr-1"><Refresh /></el-icon>
            重建索引
          </el-button>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          <div class="rounded-xl border border-ink-200/70 p-4 dark:border-ink-800">
            <p class="text-xs text-ink-500 dark:text-ink-400">当前引擎</p>
            <p class="mt-1.5">
              <el-tag
                :type="searchStatus?.meilisearchReady ? 'success' : 'warning'"
                effect="light"
                round
              >
                {{ searchStatus?.meilisearchReady ? 'Meilisearch' : 'PostgreSQL 降级' }}
              </el-tag>
            </p>
          </div>

          <div class="rounded-xl border border-ink-200/70 p-4 dark:border-ink-800">
            <p class="text-xs text-ink-500 dark:text-ink-400">歌曲索引</p>
            <p class="mt-1 text-lg font-bold text-ink-900 dark:text-white">
              {{ formatNumber(searchStatus?.songsIndexed ?? 0) }}
            </p>
          </div>

          <div class="rounded-xl border border-ink-200/70 p-4 dark:border-ink-800">
            <p class="text-xs text-ink-500 dark:text-ink-400">外链索引</p>
            <p class="mt-1 text-lg font-bold text-ink-900 dark:text-white">
              {{ formatNumber(searchStatus?.linksIndexed ?? 0) }}
            </p>
          </div>
        </div>

        <el-alert
          v-if="searchStatus && !searchStatus.meilisearchReady"
          class="mt-4"
          type="info"
          :closable="false"
          show-icon
          title="Meilisearch 尚未连接"
          description="请先启动 Meilisearch（docker compose up -d meilisearch），然后点击「重建索引」。"
        />
      </section>

      <!-- 播放量排行 -->
      <section class="lty-card p-6">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-ink-900 dark:text-white">播放量 Top 5</h3>
          <el-button text size="small" @click="$router.push({ name: 'stats' })">详细统计</el-button>
        </div>

        <ol v-if="topSongs.length" class="mt-4 space-y-2.5">
          <li
            v-for="(item, index) in topSongs.slice(0, 5)"
            :key="item.id"
            class="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-ink-50 dark:hover:bg-ink-800/60"
          >
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold"
              :class="
                index < 3
                  ? 'bg-brand-500 text-white'
                  : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400'
              "
            >
              {{ index + 1 }}
            </span>
            <span class="min-w-0 flex-1 truncate text-sm text-ink-700 dark:text-ink-200">
              {{ item.title }}
            </span>
            <span class="shrink-0 text-xs font-semibold text-ink-500 dark:text-ink-400">
              {{ formatNumber(item.playCount) }}
            </span>
          </li>
        </ol>

        <p v-else class="py-10 text-center text-sm text-ink-400">暂无数据</p>
      </section>
    </div>

    <!-- 快捷入口 -->
    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <router-link
        v-for="item in shortcuts"
        :key="item.name"
        :to="{ name: item.name }"
        class="lty-card lty-card-hover group flex items-center gap-3 p-5"
      >
        <span
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-ink-800 dark:text-brand-300"
        >
          <el-icon :size="20"><component :is="item.icon" /></el-icon>
        </span>
        <span class="min-w-0">
          <span class="block text-sm font-semibold text-ink-900 dark:text-white">{{ item.label }}</span>
          <span class="block truncate text-xs text-ink-500 dark:text-ink-400">
            {{ item.description }}
          </span>
        </span>
      </router-link>
    </section>
  </div>
</template>
