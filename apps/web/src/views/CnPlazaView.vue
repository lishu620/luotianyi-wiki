<script setup lang="ts">
import {
  CN_GENDERS,
  CN_GENDER_LABELS,
  CN_PURPOSES,
  CN_PURPOSE_LABELS,
  CN_SORTS,
  CN_SORT_LABELS,
  type CnFilters,
  type CnGender,
  type CnProfile,
  type CnPurpose,
  type CnSort,
} from '@luotianyi/shared';
import { ElMessage } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { cnApi } from '@/api';
import CnCard from '@/components/CnCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import SectionHeading from '@/components/SectionHeading.vue';
import { useAuthStore } from '@/stores/auth';
import { compact } from '@/utils';

const router = useRouter();
const auth = useAuthStore();

const loading = ref(false);
const list = ref<CnProfile[]>([]);
const total = ref(0);
const filters = ref<CnFilters>({ interests: [], regions: [] });

const query = reactive({
  keyword: '',
  interest: undefined as string | undefined,
  region: undefined as string | undefined,
  gender: undefined as CnGender | undefined,
  purpose: undefined as CnPurpose | undefined,
  sort: 'latest' as CnSort,
  page: 1,
  pageSize: 12,
});

async function load(): Promise<void> {
  loading.value = true;
  try {
    if (query.sort === 'heart') {
      list.value = await cnApi.heart(24);
      total.value = list.value.length;
    } else {
      const result = await cnApi.list(compact({ ...query }));
      list.value = result.items;
      total.value = result.total;
    }
  } catch {
    list.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function changeSort(sort: CnSort): void {
  query.sort = sort;
  query.page = 1;
  void load();
}

function search(): void {
  query.page = 1;
  void load();
}

function reset(): void {
  query.keyword = '';
  query.interest = undefined;
  query.region = undefined;
  query.gender = undefined;
  query.purpose = undefined;
  query.page = 1;
  void load();
}

async function like(profile: CnProfile): Promise<void> {
  if (!auth.isLoggedIn) {
    await router.push({ path: '/login', query: { redirect: '/cn' } });
    return;
  }

  const result = await cnApi.like(profile.id);
  profile.likedByMe = result.liked;
  profile.mutualWithMe = result.mutual;
  profile.likeCount = result.likeCount;

  if (result.mutual) ElMessage.success('互相心动！联系方式已解锁 🎉');
  else ElMessage.success(result.liked ? '已心动' : '已取消心动');
}

function open(profile: CnProfile): void {
  void router.push(`/cn/${profile.id}`);
}

onMounted(async () => {
  filters.value = await cnApi.filters().catch(() => ({ interests: [], regions: [] }));
  await load();
});
</script>

<template>
  <div>
    <section
      class="border-b border-ink-200/60 bg-gradient-to-br from-brand-50 to-white dark:border-ink-800 dark:from-ink-900 dark:to-ink-950"
    >
      <div class="lty-container py-10 sm:py-12">
        <SectionHeading
          title="同好广场"
          subtitle="看看大家的个人介绍，遇到感兴趣的再互相心动"
          icon="Postcard"
        />

        <div class="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <el-input
            v-model="query.keyword"
            size="large"
            class="lg:max-w-xs"
            placeholder="搜索圈名 / 宣言 / 兴趣"
            clearable
            @keyup.enter="search"
            @clear="search"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <div class="flex flex-1 flex-wrap gap-2">
            <el-select
              v-model="query.interest"
              placeholder="兴趣"
              clearable
              class="!w-36"
              @change="search"
            >
              <el-option
                v-for="item in filters.interests"
                :key="item.value"
                :label="`${item.value} (${item.count})`"
                :value="item.value"
              />
            </el-select>

            <el-select
              v-model="query.region"
              placeholder="地区"
              clearable
              filterable
              allow-create
              class="!w-32"
              @change="search"
            >
              <el-option v-for="region in filters.regions" :key="region" :label="region" :value="region" />
            </el-select>

            <el-select v-model="query.gender" placeholder="性别" clearable class="!w-28" @change="search">
              <el-option
                v-for="gender in CN_GENDERS"
                :key="gender"
                :label="CN_GENDER_LABELS[gender]"
                :value="gender"
              />
            </el-select>

            <el-select v-model="query.purpose" placeholder="用途" clearable class="!w-28" @change="search">
              <el-option
                v-for="purpose in CN_PURPOSES"
                :key="purpose"
                :label="CN_PURPOSE_LABELS[purpose]"
                :value="purpose"
              />
            </el-select>

            <el-button @click="reset">重置</el-button>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            v-for="sort in CN_SORTS"
            :key="sort"
            type="button"
            class="lty-chip transition-colors"
            :class="
              query.sort === sort
                ? 'bg-brand-500 text-white'
                : 'bg-white text-ink-600 hover:bg-brand-50 dark:bg-ink-800 dark:text-ink-300'
            "
            @click="changeSort(sort)"
          >
            <el-icon><component :is="sort === 'heart' ? 'Star' : sort === 'random' ? 'Refresh' : 'Clock'" /></el-icon>
            {{ CN_SORT_LABELS[sort] }}
          </button>

          <div class="ml-auto flex gap-2">
            <el-button type="primary" plain @click="router.push('/cn/me')">
              <el-icon class="mr-1"><EditPen /></el-icon>
              我的个人介绍
            </el-button>
          </div>
        </div>
      </div>
    </section>

    <section v-loading="loading" class="lty-container py-8">
      <p class="mb-5 text-sm text-ink-500 dark:text-ink-400">
        共 {{ total }} 张介绍卡
        <span v-if="query.sort === 'heart'" class="ml-1 text-brand-600 dark:text-brand-300">
          · 按与你的兴趣重合度推荐
        </span>
      </p>

      <div v-if="list.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <CnCard
          v-for="profile in list"
          :key="profile.id"
          :profile="profile"
          show-like
          @like="like"
          @open="open"
        />
      </div>

      <EmptyState
        v-else-if="!loading"
        icon="Postcard"
        title="还没有匹配的扩列条"
        description="换个条件试试，或者先制作属于你自己的扩列条～"
      >
        <el-button type="primary" @click="router.push('/cn/me')">制作我的扩列条</el-button>
      </EmptyState>

      <div
        v-if="query.sort !== 'heart' && total > query.pageSize"
        class="mt-8 flex justify-center"
      >
        <el-pagination
          background
          layout="prev, pager, next"
          :current-page="query.page"
          :page-size="query.pageSize"
          :total="total"
          @current-change="(page: number) => { query.page = page; load(); }"
        />
      </div>
    </section>
  </div>
</template>
