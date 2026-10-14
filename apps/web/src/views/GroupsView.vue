<script setup lang="ts">
import {
  COMMUNITY_GROUP_SECTION_HINTS,
  COMMUNITY_GROUP_SECTION_ICONS,
  COMMUNITY_GROUP_SECTION_LABELS,
  COMMUNITY_GROUP_SECTIONS,
  type CommunityGroup,
  type CommunityGroupSection,
} from '@luotianyi/shared';
import { ElMessage } from 'element-plus';
import { computed, onMounted, ref } from 'vue';

import EmptyState from '@/components/EmptyState.vue';
import SectionHeading from '@/components/SectionHeading.vue';
import { useGroupsStore } from '@/stores/groups';

const store = useGroupsStore();

const META = {
  intro:
    '这里是汇总的全国中V（中文 VOCALOID）QQ 群、同人展与同人谷子群，帮助中V小伙伴们找到组织。地方同好群已确保每个省市自治区特别行政区都至少有一个群。欢迎向整理者提供更多群聊（提供前请先征得群管理员同意，或由群管理直接提供）。',
  levelNote: '群聊活跃度：★ > 1000，① 700~1000，② 400~700，③ 100~400，④ < 100',
  editor: '孤看遍这世间',
  editorQq: '3034108156',
  updatedAt: '2026-08-24',
};

const keyword = ref('');
const activeSection = ref<CommunityGroupSection | 'all'>('all');

const totalCount = computed(() => store.counts.reduce((sum, item) => sum + item.count, 0));

const visibleSections = computed(() =>
  store.sections
    .filter((item) => activeSection.value === 'all' || item.section === activeSection.value)
    .map((item) => {
      const query = keyword.value.trim().toLowerCase();
      return {
        ...item,
        groups: query
          ? item.groups.filter(
              (group) =>
                group.name.toLowerCase().includes(query) ||
                group.number.includes(query) ||
                (group.note ?? '').toLowerCase().includes(query),
            )
          : item.groups,
      };
    })
    .filter((item) => item.groups.length > 0),
);

const visibleCount = computed(() =>
  visibleSections.value.reduce((sum, item) => sum + item.groups.length, 0),
);

function countOf(section: CommunityGroupSection): number {
  return store.counts.find((item) => item.section === section)?.count ?? 0;
}

function levelClass(level?: string | null): string {
  switch (level) {
    case '★★':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300';
    case '★':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
    case '①':
      return 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300';
    default:
      return 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400';
  }
}

async function copyNumber(group: CommunityGroup): Promise<void> {
  const text = group.number;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // 内网 http 等非安全上下文没有 clipboard API，用临时 textarea 兜底
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    ElMessage.success(`已复制群号 ${text}，去 QQ 搜索加群吧`);
  } catch {
    ElMessage.warning('复制失败，请手动选择群号');
  }
}

function resetFilters(): void {
  keyword.value = '';
  activeSection.value = 'all';
}

onMounted(() => void store.fetchGrouped().catch(() => undefined));
</script>

<template>
  <div>
    <section
      class="border-b border-ink-200/60 bg-gradient-to-br from-brand-50 to-white dark:border-ink-800 dark:from-ink-900 dark:to-ink-950"
    >
      <div class="lty-container py-12">
        <SectionHeading
          title="中V群聊导航"
          subtitle="汇总全国中V（中文 VOCALOID）QQ 群、同人展与同人谷子群，点一下即可复制群号"
          icon="ChatDotRound"
        />

        <div class="lty-card mt-6 p-4 sm:p-5">
          <p class="text-sm leading-relaxed text-ink-600 dark:text-ink-300">
            {{ META.intro }}
          </p>
          <p class="mt-3 flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
            <el-icon><InfoFilled /></el-icon>
            {{ META.levelNote }}
          </p>
        </div>

        <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <el-input
            v-model="keyword"
            size="large"
            class="sm:max-w-sm"
            placeholder="搜索群名、地区或群号"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="lty-chip transition-colors"
              :class="
                activeSection === 'all'
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-ink-600 hover:bg-brand-50 dark:bg-ink-800 dark:text-ink-300'
              "
              @click="activeSection = 'all'"
            >
              <el-icon><Menu /></el-icon>
              全部
              <span class="opacity-70">{{ totalCount }}</span>
            </button>

            <button
              v-for="section in COMMUNITY_GROUP_SECTIONS"
              :key="section"
              type="button"
              class="lty-chip transition-colors"
              :class="
                activeSection === section
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-ink-600 hover:bg-brand-50 dark:bg-ink-800 dark:text-ink-300'
              "
              @click="activeSection = section"
            >
              <el-icon><component :is="COMMUNITY_GROUP_SECTION_ICONS[section]" /></el-icon>
              {{ COMMUNITY_GROUP_SECTION_LABELS[section] }}
              <span class="opacity-70">{{ countOf(section) }}</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <section v-loading="store.loading" class="lty-container py-10">
      <p class="mb-6 text-sm text-ink-500 dark:text-ink-400">共 {{ visibleCount }} 个群聊</p>

      <div v-if="visibleSections.length" class="space-y-10">
        <div v-for="item in visibleSections" :key="item.section">
          <div class="flex items-center gap-2.5">
            <span
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white"
            >
              <el-icon :size="18">
                <component :is="COMMUNITY_GROUP_SECTION_ICONS[item.section]" />
              </el-icon>
            </span>
            <h2 class="text-lg font-bold text-ink-900 dark:text-white">
              {{ COMMUNITY_GROUP_SECTION_LABELS[item.section] }}
            </h2>
            <span class="text-xs text-ink-400">{{ item.groups.length }} 个</span>
          </div>
          <p class="mt-1 mb-4 ml-11 text-xs text-ink-500 dark:text-ink-400">
            {{ COMMUNITY_GROUP_SECTION_HINTS[item.section] }}
          </p>

          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <button
              v-for="group in item.groups"
              :key="group.id"
              type="button"
              class="lty-card lty-card-hover group flex w-full items-center gap-3 p-3.5 text-left"
              @click="copyNumber(group)"
            >
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-ink-800 dark:text-brand-300"
              >
                <el-icon><ChatDotRound /></el-icon>
              </span>

              <span class="min-w-0 flex-1">
                <span class="flex items-center gap-2">
                  <span
                    class="truncate font-semibold text-ink-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300"
                  >
                    {{ group.name }}
                  </span>
                  <span
                    v-if="group.level"
                    class="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                    :class="levelClass(group.level)"
                  >
                    {{ group.level }}
                  </span>
                </span>
                <span class="mt-0.5 flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
                  <span class="font-mono tracking-wide">{{ group.number }}</span>
                  <span v-if="group.note" class="text-ink-400">· {{ group.note }}</span>
                </span>
              </span>

              <el-icon class="shrink-0 text-ink-300 transition-colors group-hover:text-brand-500">
                <CopyDocument />
              </el-icon>
            </button>
          </div>
        </div>
      </div>

      <EmptyState
        v-else-if="!store.loading"
        icon="ChatDotRound"
        title="没有匹配的群聊"
        description="换个关键词，或向整理者提供更多群聊。"
      >
        <el-button type="primary" plain @click="resetFilters">重置筛选</el-button>
      </EmptyState>

      <div class="lty-card mt-12 flex flex-col gap-2 p-5 text-sm text-ink-500 dark:text-ink-400">
        <p>
          整理：{{ META.editor }}（QQ {{ META.editorQq }}） · 更新于 {{ META.updatedAt }}
        </p>
        <p>中V的发展任重道远，希望能陪着所有虚拟歌姬一直走下去，一直唱下去……</p>
        <p class="text-xs text-ink-400">
          本站仅作整理汇总，群聊内容与秩序由各群管理员负责；加入前请先阅读群规。
        </p>
      </div>
    </section>
  </div>
</template>
