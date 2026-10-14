<script setup lang="ts">
import {
  CN_CONTACT_LABELS,
  CN_GENDER_LABELS,
  CN_PURPOSE_LABELS,
  type CnContactKey,
  type CnProfile,
} from '@luotianyi/shared';
import { computed } from 'vue';

import { cnCardVars } from '@/utils/cnCardThemes';

const props = defineProps<{ profile: CnProfile; showLike?: boolean }>();
const emit = defineEmits<{ like: [CnProfile]; open: [CnProfile] }>();

const themeVars = computed(() => cnCardVars(props.profile.cardStyle));

const contacts = computed(() =>
  Object.entries(props.profile.contacts ?? {}).map(([key, value]) => ({
    label: CN_CONTACT_LABELS[key as CnContactKey] ?? key,
    value: String(value),
  })),
);

const basics = computed(() =>
  [
    CN_GENDER_LABELS[props.profile.gender],
    props.profile.age ? `${props.profile.age} 岁` : null,
    props.profile.region,
  ].filter(Boolean) as string[],
);

const initial = computed(() => props.profile.cn.slice(0, 1));
</script>

<template>
  <article
    class="lty-card relative flex h-full flex-col gap-4 overflow-hidden border-[var(--cn-border)] bg-[var(--cn-surface)] p-5 dark:border-[var(--cn-border-dark)] dark:bg-[var(--cn-surface-dark)]"
    :style="themeVars"
  >
    <!-- 款式渐变头 -->
    <span
      aria-hidden="true"
      class="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-[var(--cn-header-from)] to-[var(--cn-header-to)] opacity-80"
    />

    <!-- 头部 -->
    <header class="relative flex items-start gap-4">
      <span
        class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--cn-accent-soft)] text-lg font-bold text-[var(--cn-ink)] ring-2 ring-[var(--cn-accent)] dark:text-[var(--cn-ink-dark)]"
      >
        <img
          v-if="profile.avatarUrl"
          :src="profile.avatarUrl"
          :alt="profile.cn"
          class="h-full w-full object-cover"
          loading="lazy"
          referrerpolicy="no-referrer"
        />
        <span v-else>{{ initial }}</span>
      </span>

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h3
            class="truncate text-lg font-bold text-[var(--cn-ink)] dark:text-[var(--cn-ink-dark)]"
          >
            {{ profile.cn }}
          </h3>
          <span
            class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            :class="
              profile.purpose === 'friends'
                ? 'bg-[var(--cn-accent-soft)] text-[var(--cn-accent-ink)] dark:text-[var(--cn-accent-ink-dark)]'
                : 'bg-black/5 text-[var(--cn-muted)] dark:bg-white/10 dark:text-[var(--cn-muted-dark)]'
            "
          >
            {{ CN_PURPOSE_LABELS[profile.purpose] }}
          </span>
          <span
            v-if="profile.mutualWithMe"
            class="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:bg-rose-500/20 dark:text-rose-300"
          >
            互相心动
          </span>
        </div>
        <p class="mt-0.5 text-xs text-[var(--cn-muted)] dark:text-[var(--cn-muted-dark)]">
          {{ basics.join(' · ') || '资料保密' }}
          <span v-if="profile.authorUsername" class="ml-1 opacity-80">
            @{{ profile.authorUsername }}
          </span>
        </p>
      </div>
    </header>

    <!-- 性格 -->
    <p
      v-if="profile.personality"
      class="relative text-sm text-[var(--cn-ink)] dark:text-[var(--cn-ink-dark)]"
    >
      <span class="text-[var(--cn-muted)] dark:text-[var(--cn-muted-dark)]">性格：</span>
      {{ profile.personality }}
    </p>

    <!-- 兴趣 -->
    <div v-if="profile.interests.length" class="relative flex flex-wrap gap-1.5">
      <span
        v-for="tag in profile.interests"
        :key="tag"
        class="rounded-full bg-[var(--cn-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--cn-accent-ink)] dark:text-[var(--cn-accent-ink-dark)]"
      >
        {{ tag }}
      </span>
    </div>

    <!-- 想找 -->
    <div
      v-if="profile.purpose === 'friends' && profile.lookingFor.length"
      class="relative flex flex-wrap items-center gap-1.5"
    >
      <span class="text-xs text-[var(--cn-muted)] dark:text-[var(--cn-muted-dark)]">想找：</span>
      <span
        v-for="tag in profile.lookingFor"
        :key="tag"
        class="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
      >
        {{ tag }}
      </span>
    </div>

    <!-- 宣言 -->
    <p
      v-if="profile.declaration"
      class="relative line-clamp-3 text-sm leading-relaxed text-[var(--cn-ink)] dark:text-[var(--cn-ink-dark)]"
    >
      {{ profile.declaration }}
    </p>

    <!-- 联系方式 -->
    <div class="relative rounded-xl bg-[var(--cn-panel)] p-3 dark:bg-[var(--cn-panel-dark)]">
      <template v-if="profile.contactsVisible && contacts.length">
        <p class="mb-1 text-xs text-[var(--cn-muted)] dark:text-[var(--cn-muted-dark)]">
          联系方式
        </p>
        <div
          class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--cn-ink)] dark:text-[var(--cn-ink-dark)]"
        >
          <span v-for="item in contacts" :key="item.label">
            <span class="text-[var(--cn-muted)] dark:text-[var(--cn-muted-dark)]">
              {{ item.label }}：
            </span>
            {{ item.value }}
          </span>
        </div>
      </template>
      <p v-else-if="profile.purpose === 'friends'" class="text-xs text-amber-600 dark:text-amber-400">
        🔒 联系方式需「互相心动」后解锁
      </p>
      <p v-else class="text-xs text-[var(--cn-muted)] dark:text-[var(--cn-muted-dark)]">
        仅展示个人介绍，未开放扩列
      </p>
    </div>

    <!-- 操作 -->
    <div class="relative mt-auto flex items-center gap-2 pt-1">
      <button v-if="showLike && profile.purpose === 'friends'" type="button" class="lty-chip transition-colors"
        :class="
          profile.likedByMe
            ? 'bg-rose-500 text-white'
            : 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300'
        "
        @click="emit('like', profile)"
      >
        <el-icon><Star /></el-icon>
        {{ profile.likedByMe ? '已心动' : '心动' }}
      </button>

      <span class="text-xs text-[var(--cn-muted)] dark:text-[var(--cn-muted-dark)]">
        心动 {{ profile.likeCount }} · 浏览 {{ profile.viewCount }}
      </span>

      <button
        type="button"
        class="ml-auto text-xs font-medium text-[var(--cn-accent)] hover:underline"
        @click="emit('open', profile)"
      >
        查看详情 ›
      </button>
    </div>
  </article>
</template>
