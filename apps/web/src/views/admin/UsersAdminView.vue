<script setup lang="ts">
import type { AdminUser, Role } from '@luotianyi/shared';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';

import { roleApi, userApi } from '@/api';
import { compact, formatDate } from '@/utils';

const loading = ref(false);
const list = ref<AdminUser[]>([]);
const total = ref(0);
const roles = ref<Role[]>([]);

const query = reactive({
  keyword: '',
  roleId: undefined as string | undefined,
  page: 1,
  pageSize: 15,
});

const dialogVisible = ref(false);
const editing = ref<AdminUser | null>(null);
const submitting = ref(false);
const formRef = ref<FormInstance>();

const form = reactive({
  username: '',
  password: '',
  roleId: null as string | null,
  active: true,
});

const rules: FormRules = {
  username: [{ required: true, message: '请填写用户名', trigger: 'blur' }],
};

async function load(): Promise<void> {
  loading.value = true;
  try {
    const result = await userApi.list(compact({ ...query }));
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
  query.roleId = undefined;
  query.page = 1;
  void load();
}

function openCreate(): void {
  editing.value = null;
  Object.assign(form, { username: '', password: '', roleId: null, active: true });
  dialogVisible.value = true;
}

function openEdit(row: AdminUser): void {
  editing.value = row;
  Object.assign(form, {
    username: row.username,
    password: '',
    roleId: row.roleId,
    active: row.active,
  });
  dialogVisible.value = true;
}

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  if (!editing.value && form.password.length < 6) {
    ElMessage.warning('初始密码至少 6 位');
    return;
  }

  submitting.value = true;
  try {
    if (editing.value) {
      await userApi.update(editing.value.id, {
        username: form.username,
        roleId: form.roleId,
        active: form.active,
        ...(form.password ? { password: form.password } : {}),
      });
      ElMessage.success('用户已更新');
    } else {
      await userApi.create({
        username: form.username,
        password: form.password,
        roleId: form.roleId,
        active: form.active,
      });
      ElMessage.success('用户已创建');
    }

    dialogVisible.value = false;
    await load();
  } finally {
    submitting.value = false;
  }
}

async function toggleActive(row: AdminUser): Promise<void> {
  try {
    await userApi.update(row.id, { active: !row.active });
    ElMessage.success(!row.active ? '已启用' : '已停用');
    await load();
  } catch {
    await load();
  }
}

async function resetPassword(row: AdminUser): Promise<void> {
  let value: string;
  try {
    const result = await ElMessageBox.prompt(`为「${row.username}」设置新密码`, '重置密码', {
      inputPlaceholder: '至少 6 位',
      confirmButtonText: '重置',
      cancelButtonText: '取消',
      inputValidator: (input) => (input && input.length >= 6 ? true : '密码至少 6 位'),
    });
    value = result.value;
  } catch {
    return;
  }

  await userApi.resetPassword(row.id, value);
  ElMessage.success('密码已重置');
}

async function remove(row: AdminUser): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除用户「${row.username}」吗？`, '删除用户', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  await userApi.remove(row.id);
  ElMessage.success('已删除');
  await load();
}

onMounted(async () => {
  roles.value = await roleApi.list().catch(() => []);
  await load();
});
</script>

<template>
  <div class="space-y-4">
    <div class="lty-card flex flex-wrap items-center gap-3 p-4">
      <el-input
        v-model="query.keyword"
        placeholder="搜索用户名"
        clearable
        class="!w-56"
        @keyup.enter="search"
        @clear="search"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-select v-model="query.roleId" placeholder="角色" clearable class="!w-44" @change="search">
        <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id" />
      </el-select>

      <el-button @click="reset">重置</el-button>

      <div class="ml-auto">
        <el-button type="primary" @click="openCreate">
          <el-icon class="mr-1"><Plus /></el-icon>
          新增用户
        </el-button>
      </div>
    </div>

    <div class="lty-card overflow-hidden">
      <el-table v-loading="loading" :data="list" row-key="id" stripe>
        <el-table-column label="用户名" min-width="160">
          <template #default="{ row }">
            <span class="font-medium text-ink-900 dark:text-white">{{ row.username }}</span>
          </template>
        </el-table-column>

        <el-table-column label="角色" width="160">
          <template #default="{ row }">
            <el-tag v-if="row.roleName" size="small" effect="plain">{{ row.roleName }}</el-tag>
            <span v-else class="text-xs text-ink-400">未分配</span>
          </template>
        </el-table-column>

        <el-table-column label="权限数" width="90" align="center">
          <template #default="{ row }">
            <span v-if="row.permissions?.includes('*')" class="text-xs font-semibold text-brand-600">全部</span>
            <span v-else class="text-xs text-ink-500">{{ row.permissions?.length ?? 0 }}</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.active ? 'success' : 'info'" size="small" effect="light">
              {{ row.active ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="最近登录" width="130" align="center">
          <template #default="{ row }">
            {{ row.lastLoginAt ? formatDate(row.lastLoginAt) : '—' }}
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="120" align="center">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>

        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="warning" size="small" @click="resetPassword(row)">重置密码</el-button>
            <el-button link size="small" @click="toggleActive(row)">
              {{ row.active ? '停用' : '启用' }}
            </el-button>
            <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>

        <template #empty>
          <p class="py-10 text-sm text-ink-400">暂无用户</p>
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

    <el-dialog
      v-model="dialogVisible"
      :title="editing ? '编辑用户' : '新增用户'"
      width="min(520px, 94vw)"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="登录用户名" maxlength="50" />
        </el-form-item>

        <el-form-item :label="editing ? '重置密码' : '初始密码'">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :placeholder="editing ? '留空表示不修改' : '至少 6 位'"
          />
        </el-form-item>

        <el-form-item label="角色">
          <el-select v-model="form.roleId" class="w-full" clearable placeholder="请选择角色">
            <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="启用">
          <el-switch v-model="form.active" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">
          {{ editing ? '保存修改' : '确认新增' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
