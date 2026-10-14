<script setup lang="ts">
import {
  LINK_CATEGORIES,
  LINK_CATEGORY_LABELS,
  SONG_STATUS_LABELS,
  type ExternalLink,
  type LinkCategory,
} from '@luotianyi/shared';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';

import { linkApi } from '@/api';
import LinkFormDialog from '@/components/LinkFormDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { compact, formatDate, formatNumber } from '@/utils';

const loading = ref(false);
const list = ref<ExternalLink[]>([]);
const total = ref(0);

const query = reactive({
  keyword: '',
  category: undefined as LinkCategory | undefined,
  recommended: undefined as boolean | undefined,
  page: 1,
  pageSize: 15,
});

const dialogVisible = ref(false);
const editing = ref<ExternalLink | null>(null);
const selection = ref<ExternalLink[]>([]);

const auth = useAuthStore();

const categoryCounts = computed(() => {
  const map = new Map<LinkCategory, number>();
  for (const item of list.value) {
    map.set(item.category, (map.get(item.category) ?? 0) + 1);
  }
  return map;
});

async function load(): Promise<void> {
  loading.value = true;
  try {
    const result = await linkApi.adminList(compact({ ...query }));
    list.value = result.items;
    total.value = result.total;
  } catch {
    list.value = [];
  } finally {
    loading.value = false;
  }
}

function search(): void {
  query.page = 1;
  void load();
}

function reset(): void {
  query.keyword = '';
  query.category = undefined;
  query.recommended = undefined;
  query.page = 1;
  void load();
}

function openCreate(): void {
  editing.value = null;
  dialogVisible.value = true;
}

function openEdit(row: ExternalLink): void {
  editing.value = row;
  dialogVisible.value = true;
}

async function remove(row: ExternalLink): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除站点「${row.title}」吗？`, '删除站点', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  await linkApi.remove(row.id);
  ElMessage.success('已删除');
  await load();
}

async function removeSelected(): Promise<void> {
  if (selection.value.length === 0) return;

  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selection.value.length} 个站点吗？`, '批量删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  const result = await linkApi.bulkRemove(selection.value.map((item) => item.id));
  ElMessage.success(`已删除 ${result.deleted} 个站点`);
  selection.value = [];
  await load();
}

async function toggleRecommended(row: ExternalLink): Promise<void> {
  await linkApi.update(row.id, { title: row.title, url: row.url, recommended: row.recommended });
  ElMessage.success(row.recommended ? '已设为推荐' : '已取消推荐');
}

onMounted(() => void load());
</script>

<template>
  <div class="space-y-4">
    <div class="lty-card flex flex-wrap items-center gap-3 p-4">
      <el-input
        v-model="query.keyword"
        placeholder="搜索站点名称 / 简介 / 标签"
        clearable
        class="!w-64"
        @keyup.enter="search"
        @clear="search"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-select v-model="query.category" placeholder="分类" clearable class="!w-36" @change="search">
        <el-option
          v-for="category in LINK_CATEGORIES"
          :key="category"
          :label="LINK_CATEGORY_LABELS[category]"
          :value="category"
        />
      </el-select>

      <el-select v-model="query.recommended" placeholder="推荐" clearable class="!w-28" @change="search">
        <el-option label="仅推荐" :value="true" />
        <el-option label="非推荐" :value="false" />
      </el-select>

      <el-button @click="reset">重置</el-button>

      <div class="ml-auto flex gap-2">
        <el-button v-if="auth.can('link.delete')" :disabled="selection.length === 0" @click="removeSelected">
          <el-icon class="mr-1"><Delete /></el-icon>
          批量删除
        </el-button>
        <el-button v-if="auth.can('link.create')" type="primary" @click="openCreate">
          <el-icon class="mr-1"><Plus /></el-icon>
          新增站点
        </el-button>
      </div>
    </div>

    <div class="lty-card overflow-hidden">
      <el-table
        v-loading="loading"
        :data="list"
        row-key="id"
        stripe
        @selection-change="(rows: ExternalLink[]) => (selection = rows)"
      >
        <el-table-column type="selection" width="46" />

        <el-table-column label="站点" min-width="240">
          <template #default="{ row }">
            <div class="flex flex-col">
              <span class="font-medium text-ink-900 dark:text-white">{{ row.title }}</span>
              <a
                :href="row.url"
                target="_blank"
                rel="noopener noreferrer"
                class="truncate text-xs text-brand-600 hover:underline dark:text-brand-300"
              >
                {{ row.url }}
              </a>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="分类" width="110" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">
              {{ LINK_CATEGORY_LABELS[row.category as LinkCategory] }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="标签" min-width="140">
          <template #default="{ row }">
            <div class="flex flex-wrap gap-1">
              <el-tag v-for="tag in (row.tags ?? []).slice(0, 3)" :key="tag" size="small" type="info" effect="light">
                {{ tag }}
              </el-tag>
              <span v-if="!(row.tags ?? []).length" class="text-xs text-ink-400">—</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="推荐" width="80" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.recommended" size="small" @change="toggleRecommended(row)" />
          </template>
        </el-table-column>

        <el-table-column label="排序" prop="sortOrder" width="70" align="center" />

        <el-table-column label="点击" width="90" align="right">
          <template #default="{ row }">{{ formatNumber(row.clicks) }}</template>
        </el-table-column>

        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'published' ? 'success' : 'warning'" size="small" effect="light">
              {{ SONG_STATUS_LABELS[(row as ExternalLink).status] }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="110" align="center">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>

        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-if="auth.can('link.update.any', 'link.update.own')"
              link
              type="primary"
              size="small"
              @click="openEdit(row)"
            >
              编辑
            </el-button>
            <el-button v-if="auth.can('link.delete')" link type="danger" size="small" @click="remove(row)">
              删除
            </el-button>
          </template>
        </el-table-column>

        <template #empty>
          <p class="py-10 text-sm text-ink-400">暂无外链站点，点击「新增站点」开始整理。</p>
        </template>
      </el-table>

      <div v-if="total > query.pageSize" class="flex justify-end border-t border-ink-200/70 p-4 dark:border-ink-800">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :current-page="query.page"
          :page-size="query.pageSize"
          :total="total"
          @current-change="(page: number) => { query.page = page; load(); }"
        />
      </div>
    </div>

    <p v-if="categoryCounts.size" class="text-xs text-ink-400">
      当前页分类分布：
      <span v-for="[category, count] in [...categoryCounts.entries()]" :key="category" class="mr-2">
        {{ LINK_CATEGORY_LABELS[category] }} {{ count }}
      </span>
    </p>

    <LinkFormDialog v-model="dialogVisible" :link="editing" @saved="load" />
  </div>
</template>
