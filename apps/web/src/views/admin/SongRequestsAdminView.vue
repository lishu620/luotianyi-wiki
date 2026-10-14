<script setup lang="ts">
import {
  CHANGE_REQUEST_STATUSES,
  CHANGE_REQUEST_STATUS_LABELS,
  type ChangeRequestStatus,
  type SongChangeRequest,
} from '@luotianyi/shared';
import { ElMessage, ElMessageBox } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';

import { songRequestApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { compact, formatDate } from '@/utils';

const auth = useAuthStore();

const loading = ref(false);
const list = ref<SongChangeRequest[]>([]);
const total = ref(0);

const query = reactive({
  status: 'pending' as ChangeRequestStatus | undefined,
  page: 1,
  pageSize: 10,
});

const detailVisible = ref(false);
const current = ref<SongChangeRequest | null>(null);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const result = await songRequestApi.list(compact({ ...query }));
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

function openDetail(row: SongChangeRequest): void {
  current.value = row;
  detailVisible.value = true;
}

/** 待处理且不是自己提交的，才显示审批按钮 */
function canReview(row: SongChangeRequest): boolean {
  return row.status === 'pending' && row.requesterId !== auth.user?.id;
}

async function approve(row: SongChangeRequest): Promise<void> {
  let note = '';
  try {
    const result = await ElMessageBox.prompt(`通过「${row.songTitle ?? ''}」的修改申请？`, '通过申请', {
      inputPlaceholder: '审批备注（可选）',
      confirmButtonText: '通过',
      cancelButtonText: '取消',
    });
    note = result.value ?? '';
  } catch {
    return;
  }

  await songRequestApi.approve(row.id, note);
  ElMessage.success('已通过并写回歌曲');
  await load();
}

async function reject(row: SongChangeRequest): Promise<void> {
  let note = '';
  try {
    const result = await ElMessageBox.prompt(`驳回「${row.songTitle ?? ''}」的修改申请？`, '驳回申请', {
      inputPlaceholder: '驳回理由（可选）',
      confirmButtonText: '驳回',
      cancelButtonText: '取消',
    });
    note = result.value ?? '';
  } catch {
    return;
  }

  await songRequestApi.reject(row.id, note);
  ElMessage.success('已驳回');
  await load();
}

function changeEntries(row: SongChangeRequest | null): Array<[string, unknown]> {
  return Object.entries(row?.changes ?? {});
}

function stringify(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(' / ') : '—';
  if (typeof value === 'boolean') return value ? '是' : '否';
  return String(value);
}

onMounted(() => void load());
</script>

<template>
  <div class="space-y-4">
    <div class="lty-card flex flex-wrap items-center gap-3 p-4">
      <el-select v-model="query.status" placeholder="全部状态" clearable class="!w-40" @change="search">
        <el-option
          v-for="status in CHANGE_REQUEST_STATUSES"
          :key="status"
          :label="CHANGE_REQUEST_STATUS_LABELS[status]"
          :value="status"
        />
      </el-select>

      <el-button @click="search">刷新</el-button>

      <p class="ml-auto text-xs text-ink-400">
        非本人编辑歌曲会生成申请，由原投稿人或拥有「审批」权限的管理员处理。
      </p>
    </div>

    <div class="lty-card overflow-hidden">
      <el-table v-loading="loading" :data="list" row-key="id" stripe>
        <el-table-column label="歌曲" min-width="200">
          <template #default="{ row }">
            <span class="font-medium text-ink-900 dark:text-white">{{ row.songTitle ?? '（已删除）' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="申请人" width="130" align="center">
          <template #default="{ row }">{{ row.requesterName ?? '—' }}</template>
        </el-table-column>

        <el-table-column label="变更字段" width="100" align="center">
          <template #default="{ row }">
            <span class="text-xs text-ink-500">{{ Object.keys(row.changes ?? {}).length }}</span>
          </template>
        </el-table-column>

        <el-table-column label="说明" min-width="160">
          <template #default="{ row }">
            <span class="text-xs text-ink-500">{{ row.reason || '—' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'pending' ? 'warning' : row.status === 'approved' ? 'success' : 'info'"
              size="small"
              effect="light"
            >
              {{ CHANGE_REQUEST_STATUS_LABELS[(row as SongChangeRequest).status] }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="提交时间" width="120" align="center">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row)">查看</el-button>
            <template v-if="canReview(row)">
              <el-button link type="success" size="small" @click="approve(row)">通过</el-button>
              <el-button link type="danger" size="small" @click="reject(row)">驳回</el-button>
            </template>
          </template>
        </el-table-column>

        <template #empty>
          <p class="py-10 text-sm text-ink-400">暂无修改申请</p>
        </template>
      </el-table>

      <div
        v-if="total > query.pageSize"
        class="flex justify-end border-t border-ink-200/70 p-4 dark:border-ink-800"
      >
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

    <el-dialog v-model="detailVisible" title="修改申请详情" width="min(620px, 94vw)">
      <div v-if="current" class="space-y-3 text-sm">
        <p><span class="text-ink-400">歌曲：</span>{{ current.songTitle ?? '（已删除）' }}</p>
        <p><span class="text-ink-400">申请人：</span>{{ current.requesterName ?? '—' }}</p>
        <p><span class="text-ink-400">说明：</span>{{ current.reason || '—' }}</p>

        <div class="rounded-xl border border-ink-200/70 p-3 dark:border-ink-800">
          <p class="mb-2 text-xs font-semibold text-ink-500 dark:text-ink-400">拟修改字段</p>
          <table class="w-full text-sm">
            <tbody>
              <tr v-for="[key, value] in changeEntries(current)" :key="key" class="align-top">
                <td class="w-32 py-1 font-mono text-xs text-ink-400">{{ key }}</td>
                <td class="py-1 break-all">{{ stringify(value) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="current.status !== 'pending'" class="text-xs text-ink-400">
          审批人：{{ current.reviewerName ?? '—' }} · 备注：{{ current.reviewNote || '—' }}
        </p>
      </div>

      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>
