<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import EmptyState from '@/components/EmptyState.vue';
import LinkCard from '@/components/LinkCard.vue';
import SectionHeading from '@/components/SectionHeading.vue';
import SongCard from '@/components/SongCard.vue';
import { useLinksStore } from '@/stores/links';
import { useProfileStore } from '@/stores/profile';
import { useSongsStore } from '@/stores/songs';
import { useStatsStore } from '@/stores/stats';
import { formatNumber, renderMarkdown } from '@/utils';

const profileStore = useProfileStore();
const songsStore = useSongsStore();
const linksStore = useLinksStore();
const statsStore = useStatsStore();

const loading = ref(true);

const hero = computed(() => profileStore.hero);
const heroHtml = computed(() => renderMarkdown(hero.value?.content ?? ''));
const heroStats = computed(() => hero.value?.data?.stats ?? []);

const recommendedLinks = computed(() =>
  linksStore.groups
    .flatMap((group) => group.links)
    .filter((link) => link.recommended)
    .slice(0, 6),
);

const overview = computed(() => statsStore.dashboard?.overview ?? null);

const quickEntries = [
  {
    name: 'profile',
    title: '洛天依介绍',
    description: '基础资料、角色历程、音源声库与形象图鉴',
    icon: 'Star',
    accent: 'from-brand-400 to-brand-600',
  },
  {
    name: 'songs',
    title: '歌曲库',
    description: '按年份、P 主、标签检索海量原创曲目',
    icon: 'Headset',
    accent: 'from-violet-400 to-violet-600',
  },
  {
    name: 'emoji',
    title: '表情广场',
    description: '浏览、上传与搜索洛天依表情包，支持以图搜图',
    icon: 'MagicStick',
    accent: 'from-sky-400 to-cyan-600',
  },
  {
    name: 'links',
    title: '同好导航',
    description: '一站跳转到百科、视频、音乐与同人社区',
    icon: 'Connection',
    accent: 'from-emerald-400 to-emerald-600',
  },
  {
    name: 'stats',
    title: '数据统计',
    description: '作品年份分布、标签热度与播放量排行',
    icon: 'DataAnalysis',
    accent: 'from-amber-400 to-orange-500',
  },
] as const;

onMounted(async () => {
  await Promise.allSettled([
    profileStore.fetchSections(),
    songsStore.fetchFeatured(8),
    linksStore.fetchGrouped(),
    statsStore.fetchDashboard(),
  ]);
  loading.value = false;
});
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden">
      <div
        class="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-brand-100 via-white to-violet-100 dark:from-ink-900 dark:via-ink-950 dark:to-ink-900"
      />
      <div
        class="pointer-events-none absolute -top-24 -right-16 -z-10 h-80 w-80 rounded-full bg-brand-300/40 blur-3xl dark:bg-brand-700/20"
      />
      <div
        class="pointer-events-none absolute -bottom-32 -left-20 -z-10 h-96 w-96 rounded-full bg-violet-300/35 blur-3xl dark:bg-violet-700/15"
      />

      <div class="lty-container grid gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
        <div class="flex flex-col justify-center">
          <span
            class="lty-chip w-fit bg-white/70 text-brand-700 backdrop-blur dark:bg-ink-800/70 dark:text-brand-300"
          >
            <el-icon><MagicStick /></el-icon>
            中文虚拟歌手的起点
          </span>

          <h1 class="mt-5 text-4xl leading-tight font-black tracking-tight sm:text-5xl lg:text-6xl">
            <span class="text-ink-900 dark:text-white">{{ hero?.title ?? '洛天依' }}</span>
            <span class="mt-2 block lty-gradient-text">
              {{ hero?.subtitle ?? 'Luo Tianyi · 中国首位中文 VOCALOID 虚拟歌手' }}
            </span>
          </h1>

          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-if="heroHtml" class="lty-prose mt-6 max-w-2xl" v-html="heroHtml" />
          <p v-else class="mt-6 max-w-2xl text-sm text-ink-500">
            正在加载介绍内容…
          </p>

          <div class="mt-8 flex flex-wrap gap-3">
            <el-button type="primary" size="large" round @click="$router.push({ name: 'songs' })">
              <el-icon class="mr-1.5"><Headset /></el-icon>
              浏览歌曲库
            </el-button>
            <el-button size="large" round @click="$router.push({ name: 'profile' })">
              <el-icon class="mr-1.5"><Reading /></el-icon>
              了解洛天依
            </el-button>
            <el-button size="large" round plain @click="$router.push({ name: 'links' })">
              <el-icon class="mr-1.5"><Connection /></el-icon>
              同好导航
            </el-button>
          </div>
        </div>

        <!-- 资料卡片 -->
        <div class="flex items-center">
          <div class="lty-card w-full p-6">
            <div class="flex items-center gap-4">
              <div
                class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-glow"
              >
                <el-icon :size="30"><Headset /></el-icon>
              </div>
              <div>
                <p class="text-lg font-bold text-ink-900 dark:text-white">角色速览</p>
                <p class="text-xs text-ink-500 dark:text-ink-400">
                  数据可在后台「介绍页管理」中随时修改
                </p>
              </div>
            </div>

            <dl class="mt-6 grid grid-cols-2 gap-4">
              <div
                v-for="item in heroStats"
                :key="item.label"
                class="rounded-xl bg-ink-50 p-3 dark:bg-ink-800/60"
              >
                <dt class="text-[11px] tracking-wide text-ink-500 uppercase dark:text-ink-400">
                  {{ item.label }}
                </dt>
                <dd class="mt-1 text-base font-semibold text-ink-900 dark:text-white">
                  {{ item.value }}
                </dd>
              </div>

              <div v-if="!heroStats.length" class="col-span-2 text-sm text-ink-400">
                暂无资料，请先在后端执行 <code class="rounded bg-ink-100 px-1">pnpm seed</code>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>

    <!-- 数据总览 -->
    <section v-if="overview" class="lty-container -mt-6">
      <div class="lty-card grid grid-cols-2 divide-ink-100 lg:grid-cols-4 lg:divide-x dark:divide-ink-800">
        <div class="p-5 text-center">
          <p class="text-2xl font-bold text-ink-900 dark:text-white">
            {{ formatNumber(overview.songCount) }}
          </p>
          <p class="mt-1 text-xs text-ink-500 dark:text-ink-400">收录歌曲</p>
        </div>
        <div class="p-5 text-center">
          <p class="text-2xl font-bold text-ink-900 dark:text-white">
            {{ formatNumber(overview.totalPlayCount) }}
          </p>
          <p class="mt-1 text-xs text-ink-500 dark:text-ink-400">累计播放量</p>
        </div>
        <div class="p-5 text-center">
          <p class="text-2xl font-bold text-ink-900 dark:text-white">
            {{ formatNumber(overview.tagCount) }}
          </p>
          <p class="mt-1 text-xs text-ink-500 dark:text-ink-400">曲风标签</p>
        </div>
        <div class="p-5 text-center">
          <p class="text-2xl font-bold text-ink-900 dark:text-white">
            {{ formatNumber(overview.linkCount) }}
          </p>
          <p class="mt-1 text-xs text-ink-500 dark:text-ink-400">同好站点</p>
        </div>
      </div>
    </section>

    <!-- 快捷入口 -->
    <section class="lty-container mt-14">
      <SectionHeading title="快速入口" subtitle="五个板块，覆盖资料、作品、表情与同好站点" icon="Grid" />

      <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <router-link
          v-for="entry in quickEntries"
          :key="entry.name"
          :to="{ name: entry.name }"
          class="lty-card lty-card-hover group flex flex-col gap-3 p-5"
        >
          <span
            class="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-soft"
            :class="entry.accent"
          >
            <el-icon :size="22"><component :is="entry.icon" /></el-icon>
          </span>

          <span class="font-semibold text-ink-900 dark:text-white">{{ entry.title }}</span>

          <span class="text-xs leading-relaxed text-ink-500 dark:text-ink-400">
            {{ entry.description }}
          </span>

          <span
            class="mt-auto inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-300"
          >
            进入
            <el-icon class="transition-transform group-hover:translate-x-0.5"><Right /></el-icon>
          </span>
        </router-link>
      </div>
    </section>

    <!-- 精选歌曲 -->
    <section class="lty-container mt-14">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          title="代表作精选"
          subtitle="那些让洛天依被更多人听见的曲目"
          icon="Star"
        />
        <el-button text @click="$router.push({ name: 'songs' })">
          全部歌曲
          <el-icon class="ml-1"><Right /></el-icon>
        </el-button>
      </div>

      <div v-loading="loading" class="mt-6">
        <div v-if="songsStore.featured.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SongCard v-for="song in songsStore.featured" :key="song.id" :song="song" />
        </div>

        <EmptyState
          v-else-if="!loading"
          icon="Headset"
          title="还没有精选歌曲"
          description="执行 pnpm seed 写入示例数据，或登录后台添加歌曲并勾选「代表作」。"
        />
      </div>
    </section>

    <!-- 推荐站点 -->
    <section v-if="recommendedLinks.length" class="lty-container mt-14">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          title="同好站点速览"
          subtitle="由同好维护的资料、视频与社区站点，点击直接新窗口跳转"
          icon="Connection"
        />
        <el-button text @click="$router.push({ name: 'links' })">
          全部站点
          <el-icon class="ml-1"><Right /></el-icon>
        </el-button>
      </div>

      <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <LinkCard v-for="link in recommendedLinks" :key="link.id" :link="link" />
      </div>
    </section>
  </div>
</template>
