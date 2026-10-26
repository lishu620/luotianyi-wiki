<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useGlobalSearch } from '@/composables/useGlobalSearch';
import { useTheme } from '@/composables/useTheme';
import { useAuthStore } from '@/stores/auth';

const navItems = [
  { name: 'home', label: '首页', icon: 'HomeFilled' },
  { name: 'profile', label: '洛天依介绍', icon: 'Star' },
  { name: 'songs', label: '歌曲库', icon: 'Headset' },
  { name: 'links', label: '同好导航', icon: 'Connection' },
  { name: 'groups', label: '群聊导航', icon: 'ChatDotRound' },
  { name: 'emoji', label: '表情广场', icon: 'MagicStick' },
  { name: 'cn', label: '同好广场', icon: 'Postcard' },
  { name: 'stats', label: '数据统计', icon: 'DataAnalysis' },
];

const route = useRoute();
const auth = useAuthStore();
const { mode, toggleTheme, initTheme } = useTheme();
const { open: openSearch } = useGlobalSearch();

initTheme();

const mobileOpen = ref(false);
const scrolled = ref(false);

const activeName = computed(() => String(route.name ?? ''));

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false;
  },
);

function onScroll(): void {
  scrolled.value = window.scrollY > 12;
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }));
onUnmounted(() => window.removeEventListener('scroll', onScroll));
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b transition-all duration-300"
    :class="
      scrolled
        ? 'lty-glass border-ink-200/60 shadow-soft dark:border-ink-800'
        : 'border-transparent bg-transparent'
    "
  >
    <div class="lty-container flex h-16 items-center gap-4">
      <!-- Logo -->
      <router-link :to="{ name: 'home' }" class="group flex items-center gap-2.5">
        <span
          class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-glow transition-transform group-hover:scale-105"
        >
          <el-icon :size="18"><Headset /></el-icon>
        </span>
        <span class="flex flex-col leading-none">
          <span class="text-base font-bold tracking-tight text-ink-900 dark:text-white">洛天依 Wiki</span>
          <span class="mt-0.5 text-[10px] tracking-[0.16em] text-ink-400 uppercase">Luo Tianyi</span>
        </span>
      </router-link>

      <!-- 桌面导航 -->
      <nav class="ml-4 hidden items-center gap-1 xl:flex">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="relative rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          :class="
            activeName === item.name
              ? 'bg-brand-50 text-brand-700 dark:bg-ink-800 dark:text-brand-300'
              : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white'
          "
        >
          {{ item.label }}
        </router-link>
      </nav>

      <div class="ml-auto flex items-center gap-1.5">
        <el-tooltip content="搜索（Ctrl + K）" placement="bottom">
          <el-button text circle @click="openSearch()">
            <el-icon :size="18"><Search /></el-icon>
          </el-button>
        </el-tooltip>

        <el-tooltip :content="mode === 'dark' ? '切换到浅色' : '切换到深色'" placement="bottom">
          <el-button text circle @click="toggleTheme">
            <el-icon :size="18"><component :is="mode === 'dark' ? 'Sunny' : 'Moon'" /></el-icon>
          </el-button>
        </el-tooltip>

        <el-button
          v-if="!auth.isLoggedIn"
          text
          class="hidden sm:inline-flex"
          @click="$router.push({ name: 'login' })"
        >
          <el-icon class="mr-1"><User /></el-icon>
          登录
        </el-button>

        <el-button
          v-if="!auth.isLoggedIn"
          text
          class="hidden sm:inline-flex"
          @click="$router.push({ name: 'admin-login' })"
        >
          <el-icon class="mr-1"><Setting /></el-icon>
          后台
        </el-button>

        <el-button
          v-else
          text
          class="hidden sm:inline-flex"
          @click="$router.push({ name: 'admin-dashboard' })"
        >
          <el-icon class="mr-1"><Avatar /></el-icon>
          {{ auth.user?.username ?? '管理' }}
        </el-button>

        <el-button class="xl:hidden" text circle @click="mobileOpen = !mobileOpen">
          <el-icon :size="18"><component :is="mobileOpen ? 'Close' : 'Menu'" /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 移动端导航 -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="-translate-y-2 opacity-0"
    >
      <nav
        v-if="mobileOpen"
        class="lty-glass border-t border-ink-200/60 xl:hidden dark:border-ink-800"
      >
        <div class="lty-container grid gap-1 py-3">
          <router-link
            v-for="item in navItems"
            :key="item.name"
            :to="{ name: item.name }"
            class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
            :class="
              activeName === item.name
                ? 'bg-brand-50 text-brand-700 dark:bg-ink-800 dark:text-brand-300'
                : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'
            "
          >
            <el-icon><component :is="item.icon" /></el-icon>
            {{ item.label }}
          </router-link>

          <router-link
            :to="{ name: auth.isLoggedIn ? 'admin-dashboard' : 'admin-login' }"
            class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
          >
            <el-icon><Setting /></el-icon>
            {{ auth.isLoggedIn ? '管理后台' : '后台登录' }}
          </router-link>
        </div>
      </nav>
    </transition>
  </header>
</template>
