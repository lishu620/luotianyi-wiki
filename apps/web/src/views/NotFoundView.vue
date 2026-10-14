<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <div class="lty-container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
    <p class="text-7xl font-black lty-gradient-text">404</p>

    <h1 class="mt-4 text-2xl font-bold text-ink-900 dark:text-white">页面走丢了</h1>

    <p class="mt-2 max-w-md text-sm text-ink-500 dark:text-ink-400">
      你要找的页面可能已被移动或删除。不妨回到首页，或者去歌曲库里逛逛。
    </p>

    <div class="mt-8 flex flex-wrap justify-center gap-3">
      <el-button type="primary" round @click="router.push({ name: 'home' })">返回首页</el-button>
      <el-button round plain @click="router.push({ name: 'songs' })">浏览歌曲库</el-button>
    </div>
  </div>
</template>
