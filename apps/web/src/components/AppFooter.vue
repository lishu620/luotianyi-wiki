<script setup lang="ts">
import { LINK_CATEGORY_LABELS } from '@luotianyi/shared';

const quickLinks = [
  { name: 'profile', label: '洛天依介绍' },
  { name: 'songs', label: '歌曲库' },
  { name: 'links', label: '同好导航' },
  { name: 'stats', label: '数据统计' },
] as const;

const year = new Date().getFullYear();
</script>

<template>
  <footer class="mt-20 border-t border-ink-200/70 bg-white/60 dark:border-ink-800 dark:bg-ink-950/60">
    <div class="lty-container grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
      <div class="sm:col-span-2">
        <div class="flex items-center gap-2.5">
          <span
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white"
          >
            <el-icon :size="18"><Headset /></el-icon>
          </span>
          <span class="text-base font-bold text-ink-900 dark:text-white">洛天依 Wiki</span>
        </div>

        <p class="mt-3 max-w-md text-sm leading-relaxed text-ink-500 dark:text-ink-400">
          一个由同好维护的资料站，用于整理虚拟歌手洛天依的角色资料、原创歌曲与同好站点导航。
          本站内容仅供参考，官方设定请以官方发布为准。
        </p>

        <div class="mt-4 flex flex-wrap gap-2">
          <span class="lty-chip bg-brand-50 text-brand-700 dark:bg-ink-800 dark:text-brand-300">
            非官方站点
          </span>
          <span class="lty-chip bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
            资料来自公开信息
          </span>
        </div>
      </div>

      <div>
        <p class="text-sm font-semibold text-ink-900 dark:text-white">快速入口</p>
        <ul class="mt-3 space-y-2 text-sm">
          <li v-for="item in quickLinks" :key="item.name">
            <router-link
              :to="{ name: item.name }"
              class="text-ink-500 transition-colors hover:text-brand-600 dark:text-ink-400 dark:hover:text-brand-300"
            >
              {{ item.label }}
            </router-link>
          </li>
        </ul>
      </div>

      <div>
        <p class="text-sm font-semibold text-ink-900 dark:text-white">外链分类</p>
        <ul class="mt-3 space-y-2 text-sm">
          <li v-for="(label, key) in LINK_CATEGORY_LABELS" :key="key">
            <router-link
              :to="{ name: 'links', query: { category: key } }"
              class="text-ink-500 transition-colors hover:text-brand-600 dark:text-ink-400 dark:hover:text-brand-300"
            >
              {{ label }}
            </router-link>
          </li>
        </ul>
      </div>
    </div>

    <div
      class="border-t border-ink-200/70 py-5 text-center text-xs text-ink-400 dark:border-ink-800"
    >
      © {{ year }} 洛天依 Wiki · 同好制作 · 与官方无隶属关系
    </div>
  </footer>
</template>
