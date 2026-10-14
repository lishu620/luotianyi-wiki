<script setup lang="ts">
import type { CnProfile } from '@luotianyi/shared';
import { ElMessage } from 'element-plus';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { cnApi } from '@/api';
import CnCard from '@/components/CnCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import { useAuthStore } from '@/stores/auth';
import { exportCnCard } from '@/utils/exportCnCard';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const loading = ref(true);
const exporting = ref(false);
const profile = ref<CnProfile | null>(null);

async function load(): Promise<void> {
  loading.value = true;
  try {
    profile.value = await cnApi.detail(String(route.params.id));
  } catch {
    profile.value = null;
  } finally {
    loading.value = false;
  }
}

async function like(): Promise<void> {
  if (!profile.value) return;
  if (!auth.isLoggedIn) {
    await router.push({ path: '/login', query: { redirect: route.fullPath } });
    return;
  }

  const result = await cnApi.like(profile.value.id);
  profile.value.likedByMe = result.liked;
  profile.value.mutualWithMe = result.mutual;
  profile.value.likeCount = result.likeCount;

  if (result.mutual) {
    ElMessage.success('互相心动！联系方式已解锁 🎉');
    await load();
  } else {
    ElMessage.success(result.liked ? '已心动' : '已取消心动');
  }
}

async function doExport(): Promise<void> {
  if (!profile.value) return;
  exporting.value = true;
  try {
    await exportCnCard(profile.value);
    ElMessage.success('扩列条已导出为图片');
  } finally {
    exporting.value = false;
  }
}

onMounted(() => void load());
</script>

<template>
  <div class="lty-container max-w-3xl py-8">
    <button
      type="button"
      class="mb-5 text-sm text-ink-500 hover:text-brand-600 dark:text-ink-400"
      @click="router.back()"
    >
      ‹ 返回
    </button>

    <div v-loading="loading">
      <template v-if="profile">
        <CnCard :profile="profile" show-like @like="like" />

        <div class="mt-4 flex flex-wrap gap-2">
          <el-button @click="doExport" :loading="exporting">
            <el-icon class="mr-1"><Download /></el-icon>
            导出为图片
          </el-button>
          <el-button v-if="profile.purpose === 'friends'" type="danger" plain @click="like">
            <el-icon class="mr-1"><Star /></el-icon>
            {{ profile.likedByMe ? '取消心动' : '心动' }}
          </el-button>
        </div>

        <p v-if="!profile.contactsVisible" class="mt-4 text-xs text-ink-400">
          <template v-if="profile.purpose === 'friends'">
            互相心动后即可看到对方联系方式；对方也能看到你的。
          </template>
          <template v-else> 该用户仅展示个人介绍，未开放扩列。 </template>
        </p>
      </template>

      <EmptyState
        v-else-if="!loading"
        icon="Postcard"
        title="没有找到这张扩列条"
        description="它可能已被主人隐藏或删除。"
      >
        <el-button type="primary" @click="router.push('/cn')">去扩列广场</el-button>
      </EmptyState>
    </div>
  </div>
</template>
