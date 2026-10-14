<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

import AppFooter from '@/components/AppFooter.vue';
import AppHeader from '@/components/AppHeader.vue';
import GlobalSearch from '@/components/GlobalSearch.vue';
import { useGlobalSearch } from '@/composables/useGlobalSearch';

const { visible } = useGlobalSearch();

function onKeydown(event: KeyboardEvent): void {
  const isSearchShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
  if (!isSearchShortcut) return;

  event.preventDefault();
  visible.value = true;
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />

    <main class="flex-1">
      <router-view v-slot="{ Component, route }">
        <transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </main>

    <AppFooter />

    <!-- 全局搜索：Ctrl / Cmd + K -->
    <GlobalSearch v-model="visible" />
  </div>
</template>
