<script setup lang="ts">
import { SONG_STATUSES, SONG_STATUS_LABELS, VOCAL_TYPE_LABELS, type Song, type SongSortField } from '@luotianyi/shared';
import { ElMessage, ElMessageBox } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';

import { songApi } from '@/api';
import SongFormDialog from '@/components/SongFormDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { compact, formatDate, formatNumber } from '@/utils';

const loading = ref(false);
const list = ref<Song[]>([]);
const total = ref(0);

const query = reactive({
  keyword: '',
  status: undefined as string | undefined,
  sortBy: 'createdAt' as SongSortField,
  order: 'DESC' as 'ASC' | 'DESC',
  page: 1,
  pageSize: 15,
});

const dialogVisible = ref(false);
const editing = ref<Song | null>(null);

const auth = useAuthStore();

/** 能否直接写回歌曲；否则编辑会转为「修改申请」等待审批 */
function canEditDirectly(row: Song): boolean {
  return (
    auth.isSuper ||
    auth.permissions.includes('song.update.any') ||
    (auth.permissions.includes('song.update.own') && row.ownerId === auth.user?.id)
  );
}
const selection = ref<Song[]>([]);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const result = await songApi.adminList(compact({ ...query }));
    list.value = result.items;
    total.value = result.total;
  } catch {
    list.value = [];
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  editing.value = null;
  dialogVisible.value = true;
}

function openEdit(row: Song): void {
  editing.value = row;
  dialogVisible.value = true;
}

function search(): void {
  query.page = 1;
  void load();
}

function reset(): void {
  query.keyword = '';
  query.status = undefined;
  query.page = 1;
  void load();
}

async function remove(row: Song): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除《${row.title}》吗？该操作不可撤销。`, '删除歌曲', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  await songApi.remove(row.id);
  ElMessage.success('已删除');
  await load();
}

async function removeSelected(): Promise<void> {
  if (selection.value.length === 0) return;

  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selection.value.length} 首歌曲吗？`, '批量删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  const result = await songApi.bulkRemove(selection.value.map((item) => item.id));
  ElMessage.success(`已删除 ${result.deleted} 首`);
  selection.value = [];
  await load();
}

async function toggleFeatured(row: Song): Promise<void> {
  await songApi.update(row.id, { title: row.title, isFeatured: row.isFeatured });
  ElMessage.success(row.isFeatured ? '已标记为代表作' : '已取消代表作');
}

onMounted(() => void load());
</script>

<template>
  <div class="space-y-4">
    <!-- 工具栏 -->
    <div class="lty-card flex flex-wrap items-center gap-3 p-4">
      <el-input
        v-model="query.keyword"
        placeholder="搜索标题 / 拼音 / P 主 / 标签"
        clearable
        class="!w-64"
        @keyup.enter="search"
        @clear="search"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-select v-model="query.status" placeholder="状态" clearable class="!w-32" @change="search">
        <el-option
          v-for="status in SONG_STATUSES"
          :key="status"
          :label="SONG_STATUS_LABELS[status]"
          :value="status"
        />
      </el-select>

      <el-select v-model="query.sortBy" class="!w-36" @change="search">
        <el-option label="最新收录" value="createdAt" />
        <el-option label="发行时间" value="releaseDate" />
        <el-option label="播放量" value="playCount" />
        <el-option label="标题" value="title" />
      </el-select>

      <el-button @click="reset">重置</el-button>

      <div class="ml-auto flex gap-2">
        <el-button v-if="auth.can('song.delete')" :disabled="selection.length === 0" @click="removeSelected">
          <el-icon class="mr-1"><Delete /></el-icon>
          批量删除
        </el-button>
        <el-button v-if="auth.can('song.create')" type="primary" @click="openCreate">
          <el-icon class="mr-1"><Plus /></el-icon>
          新增歌曲
        </el-button>
      </div>
    </div>

    <!-- 表格 -->
    <div class="lty-card overflow-hidden">
      <el-table
        v-loading="loading"
        :data="list"
        row-key="id"
        stripe
        @selection-change="(rows: Song[]) => (selection = rows)"
      >
        <el-table-column type="selection" width="46" />

        <el-table-column label="歌曲" min-width="240">
          <template #default="{ row }">
            <div class="flex flex-col">
              <span class="font-medium text-ink-900 dark:text-white">{{ row.title }}</span>
              <span class="text-xs text-ink-400">
                {{ row.titlePinyin || '—' }}
                <template v-if="row.aliases?.length"> · {{ row.aliases.join(' / ') }}</template>
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="P 主" prop="producer" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row.producer || '—' }}</template>
        </el-table-column>

        <el-table-column label="年份" width="80" align="center">
          <template #default="{ row }">{{ row.releaseYear ?? '—' }}</template>
        </el-table-column>

        <el-table-column label="形式" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">
              {{ VOCAL_TYPE_LABELS[(row as Song).vocalType] ?? '独唱' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="播放量" width="110" align="right">
          <template #default="{ row }">{{ formatNumber(row.playCount) }}</template>
        </el-table-column>

        <el-table-column label="标签" min-width="150">
          <template #default="{ row }">
            <div class="flex flex-wrap gap-1">
              <el-tag v-for="tag in (row.tags ?? []).slice(0, 3)" :key="tag" size="small" type="info" effect="light">
                {{ tag }}
              </el-tag>
              <span v-if="(row.tags ?? []).length > 3" class="text-xs text-ink-400">
                +{{ row.tags.length - 3 }}
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="代表作" width="90" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.isFeatured" size="small" @change="toggleFeatured(row)" />
          </template>
        </el-table-column>

        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'published' ? 'success' : 'warning'" size="small" effect="light">
              {{ SONG_STATUS_LABELS[(row as Song).status] }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="收录时间" width="110" align="center">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>

        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">
              {{ canEditDirectly(row) ? '编辑' : '申请修改' }}
            </el-button>
            <el-button v-if="auth.can('song.delete')" link type="danger" size="small" @click="remove(row)">
              删除
            </el-button>
          </template>
        </el-table-column>

        <template #empty>
          <p class="py-10 text-sm text-ink-400">暂无歌曲，点击右上角「新增歌曲」开始整理。</p>
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
      v-model="dialogVisible"
      :song="editing"
      :mode="editing && !canEditDirectly(editing) ? 'request' : 'direct'"
      @saved="load"
   
      </div>
    </div>

    <SongFormDialog v-model="dialogVisible" :song="editing" @saved="load" />
  </div>
</template>
