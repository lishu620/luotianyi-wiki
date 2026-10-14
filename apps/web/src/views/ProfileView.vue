<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import EmptyState from '@/components/EmptyState.vue';
import SectionHeading from '@/components/SectionHeading.vue';
import { useProfileStore } from '@/stores/profile';
import { gradientFromText, initialFromText, renderMarkdown } from '@/utils';

const profileStore = useProfileStore();
const loading = ref(true);

const sections = computed(() => profileStore.sections.filter((section) => section.slug !== 'hero'));
const hero = computed(() => profileStore.hero);

const navItems = computed(() =>
  sections.value.map((section) => ({
    slug: section.slug,
    title: section.title,
    icon: section.icon ?? 'Document',
  })),
);

const activeSlug = ref<string>('');

function scrollTo(slug: string): void {
  activeSlug.value = slug;
  const element = document.getElementById(`section-${slug}`);
  if (!element) return;

  const top = element.getBoundingClientRect().top + window.scrollY - 88;
  window.scrollTo({ top, behavior: 'smooth' });
}

onMounted(async () => {
  await profileStore.fetchSections().catch(() => undefined);
  loading.value = false;
  activeSlug.value = sections.value[0]?.slug ?? '';
});
</script>

<template>
  <div>
    <!-- 页头 -->
    <section class="relative overflow-hidden border-b border-ink-200/60 dark:border-ink-800">
      <div
        class="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-brand-100 via-white to-violet-100 dark:from-ink-900 dark:via-ink-950 dark:to-ink-900"
      />
      <div class="lty-container py-14">
        <SectionHeading
          :title="hero?.title ?? '洛天依'"
          :subtitle="hero?.subtitle ?? '资料整理自公开信息，欢迎在后台补充修正'"
          icon="Star"
        />

        <div v-if="hero?.content" class="lty-prose mt-6 max-w-4xl">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-html="renderMarkdown(hero.content)" />
        </div>
      </div>
    </section>

    <div v-loading="loading" class="lty-container grid gap-10 py-12 lg:grid-cols-[200px_1fr]">
      <!-- 侧边目录 -->
      <aside class="hidden lg:block">
        <div class="sticky top-24">
          <p class="mb-3 text-xs font-semibold tracking-wide text-ink-400 uppercase">目录</p>
          <nav class="space-y-1">
            <button
              v-for="item in navItems"
              :key="item.slug"
              type="button"
              class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors"
              :class="
                activeSlug === item.slug
                  ? 'bg-brand-50 font-medium text-brand-700 dark:bg-ink-800 dark:text-brand-300'
                  : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800'
              "
              @click="scrollTo(item.slug)"
            >
              <el-icon><component :is="item.icon" /></el-icon>
              {{ item.title }}
            </button>
          </nav>
        </div>
      </aside>

      <!-- 内容区 -->
      <div class="min-w-0 space-y-10">
        <template v-if="sections.length">
          <section
            v-for="section in sections"
            :id="`section-${section.slug}`"
            :key="section.id"
            class="lty-card scroll-mt-24 p-6 sm:p-8"
          >
            <SectionHeading
              :title="section.title"
              :subtitle="section.subtitle"
              :icon="section.icon"
            />

            <!-- 基础资料 / 结构化事实 -->
            <dl
              v-if="section.data?.facts?.length"
              class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              <div
                v-for="fact in section.data.facts"
                :key="fact.label"
                class="rounded-xl border border-ink-200/70 bg-ink-50/60 px-4 py-3 dark:border-ink-800 dark:bg-ink-800/40"
              >
                <dt class="text-[11px] tracking-wide text-ink-500 uppercase dark:text-ink-400">
                  {{ fact.label }}
                </dt>
                <dd class="mt-1 text-sm font-medium text-ink-900 dark:text-white">
                  {{ fact.value }}
                </dd>
              </div>
            </dl>

            <!-- 历程时间线 -->
            <ol v-if="section.data?.timeline?.length" class="mt-8 space-y-0">
              <li
                v-for="(node, index) in section.data.timeline"
                :key="node.year + node.title"
                class="relative flex gap-5 pb-7 last:pb-0"
              >
                <div class="flex flex-col items-center">
                  <span
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white"
                  >
                    {{ node.year.replace(/[^0-9]/g, '').slice(-2) || '—' }}
                  </span>
                  <span
                    v-if="index !== (section.data.timeline?.length ?? 0) - 1"
                    class="mt-1 w-px flex-1 bg-gradient-to-b from-brand-300 to-transparent"
                  />
                </div>

                <div class="pt-1.5">
                  <p class="text-xs font-semibold tracking-wide text-brand-600 dark:text-brand-300">
                    {{ node.year }}
                  </p>
                  <p class="mt-0.5 font-semibold text-ink-900 dark:text-white">{{ node.title }}</p>
                  <p v-if="node.description" class="mt-1 text-sm text-ink-500 dark:text-ink-400">
                    {{ node.description }}
                  </p>
                </div>
              </li>
            </ol>

            <!-- 形象图鉴 -->
            <div v-if="section.data?.gallery?.length" class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <figure
                v-for="item in section.data.gallery"
                :key="item.name"
                class="overflow-hidden rounded-2xl border border-ink-200/70 dark:border-ink-800"
              >
                <div
                  class="flex h-40 items-center justify-center"
                  :style="{ background: item.imageUrl ? undefined : gradientFromText(item.name) }"
                >
                  <img
                    v-if="item.imageUrl"
                    :src="item.imageUrl"
                    :alt="item.name"
                    class="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <span v-else class="text-3xl font-black text-white/80">
                    {{ initialFromText(item.name) }}
                  </span>
                </div>
                <figcaption class="p-4">
                  <p class="text-sm font-semibold text-ink-900 dark:text-white">{{ item.name }}</p>
                  <p v-if="item.description" class="mt-1 text-xs text-ink-500 dark:text-ink-400">
                    {{ item.description }}
                  </p>
                </figcaption>
              </figure>
            </div>

            <!-- 正文 -->
            <div v-if="section.content" class="mt-6">
              <div class="lty-prose">
                <!-- eslint-disable-next-line vue/no-v-html -->
                <div v-html="renderMarkdown(section.content)" />
              </div>
            </div>
          </section>
        </template>

        <EmptyState
          v-else-if="!loading"
          icon="Document"
          title="介绍页还没有内容"
          description="请在后端执行 pnpm seed 写入示例内容，或登录后台「介绍页管理」添加分节。"
        />
      </div>
    </div>
  </div>
</template>
