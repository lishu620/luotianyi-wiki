<script setup lang="ts">
import {
  COMMUNITY_GROUP_SECTIONS,
  COMMUNITY_GROUP_SECTION_LABELS,
  SONG_STATUS_LABELS,
  type CommunityGroup,
  type CommunityGroupSection,
} from '@luotianyi/shared';
import { ElMessage, ElMessageBox } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';

import { groupApi } from '@/api';
import GroupFormDialog from '@/components/GroupFormDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { compact, formatDate } from '@/utils';

const loading = ref(false);
const list = ref<CommunityGroup[]>([]);
const total = ref(0);

const query = reactive({
  keyword: '',
  section: undefined as CommunityGroupSection | undefined,
  page: 1,
  pageSize: 15,
});

const dialogVisible = ref(false);
const editing = ref<CommunityGroup | null>(null);
const selection = ref<CommunityGroup[]>([]);

const auth = useAuthStore();

async function load(): Promise<void> {
  loading.value = true;
  try {
    const result = await groupApi.adminList(compact({ ...query }));
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
  query.section = undefined;
  query.page = 1;
  void load();
}

function openCreate(): void {
  editing.value = null;
  dialogVisible.value = true;
}

function openEdit(row: CommunityGroup): void {
  editing.value = row;
  dialogVisible.value = true;
}

async function remove(row: CommunityGroup): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除群聊「${row.name}（${row.number}）」吗？`, '删除群聊', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  await groupApi.remove(row.id);
  ElMessage.success('已删除');
  await load();
}

async function removeSelected(): Promise<void> {
  if (selection.value.length === 0) return;

  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selection.value.length} 个群聊吗？`, '批量删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  const result = await groupApi.bulkRemove(selection.value.map((item) => item.id));
  ElMessage.success(`已删除 ${result.deleted} 个群聊`);
  selection.value = [];
  await load();
}

onMounted(() => void load());
</script>

<template>
  <div class="space-y-4">
    <div class="lty-card flex flex-wrap items-center gap-3 p-4">
      <el-input
        v-model="query.keyword"
        placeholder="搜索群名 / 群号 / 备注"
        clearable
        class="!w-64"
        @keyup.enter="search"
        @clear="search"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-select v-model="query.section" placeholder="栏目" clearable class="!w-44" @change="search">
        <el-option
          v-for="section in COMMUNITY_GROUP_SECTIONS"
          :key="section"
          :label="COMMUNITY_GROUP_SECTION_LABELS[section]"
          :value="section"
        />
      </el-select>

      <el-button @click="reset">重置</el-button>

      <div class="ml-auto flex gap-2">
        <el-button v-if="auth.can('group.delete')" :disabled="selection.length === 0" @click="removeSelected">
          <el-icon class="mr-1"><Delete /></el-icon>
          批量删除
        </el-button>
        <el-button v-if="auth.can('group.create')" type="primary" @click="openCreate">
          <el-icon class="mr-1"><Plus /></el-icon>
          新增群聊
        </el-button>
      </div>
    </div>

    <div class="lty-card overflow-hidden">
      <el-table
        v-loading="loading"
        :data="list"
        row-key="id"
        stripe
        @selection-change="(rows: CommunityGroup[]) => (selection = rows)"
      >
        <el-table-column type="selection" width="46" />

        <el-table-column label="群名 / 地区" min-width="200">
          <template #default="{ row }">
            <span class="font-medium text-ink-900 dark:text-white">{{ row.name }}</span>
          </template>
        </el-table-column>

        <el-table-column label="QQ 群号" width="130">
          <template #default="{ row }">
            <span class="font-mono tracking-wide">{{ row.number }}</span>
          </template>
        </el-table-column>

        <el-table-column label="栏目" width="150" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">
              {{ COMMUNITY_GROUP_SECTION_LABELS[row.section as CommunityGroupSection] }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="活跃度" width="80" align="center">
          <template #default="{ row }">
            <span v-if="row.level">{{ row.level }}</span>
            <span v-else class="text-xs text-ink-400">—</span>
          </template>
        </el-table-column>

        <el-table-column label="备注" min-width="140">
          <template #default="{ row }">
            <span v-if="row.note" class="text-xs text-ink-500">{{ row.note }}</span>
            <span v-else class="text-xs text-ink-400">—</span>
          </template>
        </el-table-column>

        <el-table-column label="排序" prop="sortOrder" width="70" align="center" />

        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'published' ? 'success' : 'warning'"
              size="small"
              effect="light"
            >
              {{ SONG_STATUS_LABELS[(row as CommunityGroup).status] }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="110" align="center">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>

        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-if="auth.can('group.update.any', 'group.update.own')"
              link
              type="primary"
              size="small"
              @click="openEdit(row)"
            >
              编辑
            </el-button>
            <el-button v-if="auth.can('group.delete')" link type="danger" size="small" @click="remove(row)">
              删除
            </el-button>
          </template>
        </el-table-column>

        <template #empty>
          <p class="py-10 text-sm text-ink-400">暂无群聊，点击「新增群聊」开始整理。</p>
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

    <GroupFormDialog v-model="dialogVisible" :group="editing" @saved="load" />
  </div>
</template>
