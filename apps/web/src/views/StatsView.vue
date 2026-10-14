<script setup lang="ts">
import { LINK_CATEGORY_LABELS } from '@luotianyi/shared';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { computed, onMounted } from 'vue';
import VChart from 'vue-echarts';

import EmptyState from '@/components/EmptyState.vue';
import SectionHeading from '@/components/SectionHeading.vue';
import StatCard from '@/components/StatCard.vue';
import { useStatsStore } from '@/stores/stats';
import { formatNumber } from '@/utils';

use([CanvasRenderer, BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent]);

const store = useStatsStore();

const overview = computed(() => store.dashboard?.overview ?? null);
const byYear = computed(() => store.dashboard?.byYear ?? []);
const tags = computed(() => store.dashboard?.tags ?? []);
const topSongs = computed(() => store.dashboard?.topSongs ?? []);
const linkCategories = computed(() => store.dashboard?.linkCategories ?? []);

const BRAND = '#66ccff';

const yearOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['歌曲数', '播放量'], bottom: 0, icon: 'roundRect' },
  grid: { left: 12, right: 12, top: 24, bottom: 40, containLabel: true },
  xAxis: {
    type: 'category',
    data: byYear.value.map((item) => `${item.year}`),
    axisLine: { lineStyle: { color: '#cbd5e1' } },
    axisLabel: { color: '#94a3b8' },
  },
  yAxis: [
    {
      type: 'value',
      name: '歌曲数',
      nameTextStyle: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.18)' } },
      axisLabel: { color: '#94a3b8' },
    },
    {
      type: 'value',
      name: '播放量',
      nameTextStyle: { color: '#94a3b8' },
      splitLine: { show: false },
      axisLabel: {
        color: '#94a3b8',
        formatter: (value: number) => formatNumber(value),
      },
    },
  ],
  series: [
    {
      name: '歌曲数',
      type: 'bar',
      barMaxWidth: 26,
      data: byYear.value.map((item) => item.songCount),
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: BRAND },
            { offset: 1, color: 'rgba(102,204,255,0.25)' },
          ],
        },
      },
    },
    {
      name: '播放量',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      symbolSize: 7,
      data: byYear.value.map((item) => item.playCount),
      lineStyle: { width: 3, color: '#a78bfa' },
      itemStyle: { color: '#a78bfa' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(167,139,250,0.35)' },
            { offset: 1, color: 'rgba(167,139,250,0)' },
          ],
        },
      },
    },
  ],
}));

const tagOption = computed(() => {
  const items = [...tags.value].slice(0, 10).reverse();

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 12, right: 24, top: 12, bottom: 12, containLabel: true },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.18)' } },
      axisLabel: { color: '#94a3b8' },
    },
    yAxis: {
      type: 'category',
      data: items.map((item) => item.tag),
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#94a3b8' },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 16,
        data: items.map((item) => item.count),
        itemStyle: {
          borderRadius: [0, 8, 8, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#7ad4ff' },
              { offset: 1, color: '#a78bfa' },
            ],
          },
        },
      },
    ],
  };
});

const linkOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { bottom: 0, icon: 'circle' },
  series: [
    {
      type: 'pie',
      radius: ['48%', '72%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 8, borderColor: 'transparent', borderWidth: 2 },
      label: { show: false },
      data: linkCategories.value.map((item) => ({
        name: LINK_CATEGORY_LABELS[item.category] ?? item.category,
        value: item.count,
      })),
      color: ['#66ccff', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#38bdf8', '#c084fc'],
    },
  ],
}));

const maxPlay = computed(() => Math.max(...topSongs.value.map((item) => item.playCount), 1));

onMounted(() => {
  void store.fetchDashboard().catch(() => undefined);
});
</script>

<template>
  <div>
    <section
      class="border-b border-ink-200/60 bg-gradient-to-br from-brand-50 to-white dark:border-ink-800 dark:from-ink-900 dark:to-ink-950"
    >
      <div class="lty-container py-12">
        <SectionHeading
          title="数据统计"
          subtitle="基于站内收录数据的可视化概览，数据随后台改动实时更新"
          icon="DataAnalysis"
        />
      </div>
    </section>

    <div v-loading="store.loading" class="lty-container space-y-12 py-10">
      <!-- 概览卡片 -->
      <section v-if="overview" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="收录歌曲"
          :value="overview.songCount"
          icon="Headset"
          :hint="`已发布 ${overview.publishedSongCount} 首`"
        />
        <StatCard
          label="累计播放量"
          :value="overview.totalPlayCount"
          icon="View"
          :hint="overview.earliestYear ? `${overview.earliestYear} - ${overview.latestYear} 年作品` : ''"
        />
        <StatCard label="曲风标签" :value="overview.tagCount" icon="CollectionTag" suffix="种" :compact-value="false" />
        <StatCard
          label="同好站点"
          :value="overview.linkCount"
          icon="Connection"
          suffix="个"
          :compact-value="false"
          :hint="`代表作 ${overview.featuredCount} 首`"
        />
      </section>

      <!-- 年份分布 -->
      <section class="lty-card p-6">
        <h2 class="text-lg font-bold text-ink-900 dark:text-white">作品年份分布</h2>
        <p class="mt-1 text-xs text-ink-500 dark:text-ink-400">
          柱状为每年收录歌曲数量，折线为该年度作品的总播放量
        </p>

        <div v-if="byYear.length" class="mt-4 h-80 w-full">
          <VChart :option="yearOption" autoresize class="h-full w-full" />
        </div>
        <EmptyState v-else icon="TrendCharts" title="暂无年份数据" />
      </section>

      <!-- 标签 + 外链分类 -->
      <section class="grid gap-6 lg:grid-cols-2">
        <div class="lty-card p-6">
          <h2 class="text-lg font-bold text-ink-900 dark:text-white">标签热度 Top 10</h2>
          <p class="mt-1 text-xs text-ink-500 dark:text-ink-400">按使用该标签的歌曲数量排序</p>

          <div v-if="tags.length" class="mt-4 h-80 w-full">
            <VChart :option="tagOption" autoresize class="h-full w-full" />
          </div>
          <EmptyState v-else icon="CollectionTag" title="暂无标签数据" />
        </div>

        <div class="lty-card p-6">
          <h2 class="text-lg font-bold text-ink-900 dark:text-white">同好站点构成</h2>
          <div v-if="linkCategories.length" class="mt-4 h-80 w-full">
            <VChart :option="linkOption" autoresize class="h-full w-full" />
          </div autoresize
            class="mt-4 h-80 w-full"
          />
          <EmptyState v-else icon="Connection" title="暂无外链数据" />
        </div>
      </section>

      <!-- 播放量排行 -->
      <section class="lty-card p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-ink-900 dark:text-white">播放量排行</h2>
            <p class="mt-1 text-xs text-ink-500 dark:text-ink-400">
              站内记录的作品播放量 Top 10
            </p>
          </div>
          <el-button text @click="$router.push({ name: 'songs' })">
            歌曲库
            <el-icon class="ml-1"><Right /></el-icon>
          </el-button>
        </div>

        <ol v-if="topSongs.length" class="mt-6 space-y-3">
          <li
            v-for="(item, index) in topSongs"
            :key="item.id"
            class="group flex items-center gap-4"
          >
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
              :class="
                index < 3
                  ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-white'
                  : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400'
              "
            >
              {{ index + 1 }}
            </span>

            <router-link
              :to="{ name: 'song-detail', params: { id: item.id } }"
              class="min-w-0 flex-1"
            >
              <span class="flex items-baseline justify-between gap-4">
                <span class="truncate text-sm font-medium text-ink-800 group-hover:text-brand-600 dark:text-ink-100">
                  {{ item.title }}
                </span>
                <span class="shrink-0 text-xs font-semibold text-ink-500 dark:text-ink-400">
                  {{ formatNumber(item.playCount) }}
                </span>
              </span>

              <span class="mt-1.5 mb-1 block h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                <span
                  class="block h-full rounded-full bg-gradient-to-r from-brand-400 to-violet-400 transition-all duration-700"
                  :style="{ width: `${Math.max((item.playCount / maxPlay) * 100, 3)}%` }"
                />
              </span>

              <span class="text-[11px] text-ink-400">
                {{ item.producer || 'P 主待补充' }} · {{ item.releaseYear ?? '—' }}
              </span>
            </router-link>
          </li>
        </ol>

        <EmptyState v-else icon="Trophy" title="暂无排行数据" />
      </section>
    </div>
  </div>
</template>
