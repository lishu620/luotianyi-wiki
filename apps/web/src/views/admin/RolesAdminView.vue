<script setup lang="ts">
import {
  PERMISSIONS,
  PERMISSION_MODULES,
  PERMISSION_MODULE_LABELS,
  type Role,
} from '@luotianyi/shared';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';

import { roleApi } from '@/api';

const loading = ref(false);
const roles = ref<Role[]>([]);

const dialogVisible = ref(false);
const editing = ref<Role | null>(null);
const submitting = ref(false);
const form = reactive({ name: '', description: '', permissions: [] as string[] });

const isBuiltinEdit = computed(() => Boolean(editing.value?.builtin));

const groupedPermissions = computed(() =>
  PERMISSION_MODULES.map((module) => ({
    module,
    label: PERMISSION_MODULE_LABELS[module],
    items: PERMISSIONS.filter((item) => item.module === module),
  })).filter((group) => group.items.length > 0),
);

async function load(): Promise<void> {
  loading.value = true;
  try {
    roles.value = await roleApi.list();
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  editing.value = null;
  Object.assign(form, { name: '', description: '', permissions: [] });
  dialogVisible.value = true;
}

function openEdit(role: Role): void {
  editing.value = role;
  Object.assign(form, {
    name: role.name,
    description: role.description ?? '',
    permissions: [...role.permissions],
  });
  dialogVisible.value = true;
}

async function submit(): Promise<void> {
  if (!form.name.trim()) {
    ElMessage.warning('请填写角色名');
    return;
  }

  submitting.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      description: form.description,
      permissions: form.permissions,
    };

    if (editing.value) {
      await roleApi.update(editing.value.id, payload);
      ElMessage.success('角色已更新');
    } else {
      await roleApi.create(payload);
      ElMessage.success('角色已创建');
    }

    dialogVisible.value = false;
    await load();
  } finally {
    submitting.value = false;
  }
}

async function remove(role: Role): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除角色「${role.name}」吗？`, '删除角色', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  await roleApi.remove(role.id);
  ElMessage.success('已删除');
  await load();
}

function permissionLabel(role: Role): string {
  if (role.permissions.includes('*')) return '全部权限';
  return `${role.permissions.length} 项权限`;
}

onMounted(() => void load());
</script>

<template>
  <div class="space-y-4">
    <div class="lty-card flex flex-wrap items-center gap-3 p-4">
      <div class="text-sm text-ink-500 dark:text-ink-400">
        角色决定用户能使用哪些模块与操作；用户可在「用户管理」里分配角色。
      </div>
      <div class="ml-auto">
        <el-button type="primary" @click="openCreate">
          <el-icon class="mr-1"><Plus /></el-icon>
          新增角色
        </el-button>
      </div>
    </div>

    <div v-loading="loading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div v-for="role in roles" :key="role.id" class="lty-card flex flex-col gap-3 p-5">
        <div class="flex items-center gap-2">
          <h3 class="text-base font-bold text-ink-900 dark:text-white">{{ role.name }}</h3>
          <el-tag v-if="role.builtin" size="small" type="warning" effect="light">内置</el-tag>
        </div>

        <p class="min-h-[2.5rem] text-sm text-ink-500 dark:text-ink-400">
          {{ role.description || '—' }}
        </p>

        <div class="flex flex-wrap gap-2 text-xs">
          <span class="lty-chip bg-brand-50 text-brand-700 dark:bg-ink-800 dark:text-brand-300">
            {{ permissionLabel(role) }}
          </span>
          <span class="lty-chip bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
            {{ role.userCount ?? 0 }} 个用户
          </span>
        </div>

        <div class="mt-auto flex gap-2">
          <el-button size="small" @click="openEdit(role)">编辑权限</el-button>
          <el-button
            size="small"
            type="danger"
            plain
            :disabled="role.builtin"
            @click="remove(role)"
          >
            删除
          </el-button>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="editing ? `编辑角色 · ${editing.name}` : '新增角色'"
      width="min(760px, 96vw)"
      destroy-on-close
    >
      <el-form label-width="72px">
        <el-form-item label="角色名">
          <el-input v-model="form.name" :disabled="isBuiltinEdit" placeholder="例如：内容编辑" maxlength="50" />
        </el-form-item>

        <el-form-item label="说明">
          <el-input v-model="form.description" placeholder="可选" maxlength="200" />
        </el-form-item>

        <el-form-item label="权限">
          <div
            class="w-full space-y-4 rounded-xl border border-ink-200/70 p-4 dark:border-ink-800"
            :class="isBuiltinEdit ? 'opacity-60' : ''"
          >
            <p v-if="isBuiltinEdit" class="text-xs text-amber-600 dark:text-amber-400">
              内置超级管理员拥有全部权限，不可修改。
            </p>

            <el-checkbox-group v-model="form.permissions" :disabled="isBuiltinEdit">
              <div v-for="group in groupedPermissions" :key="group.module" class="mb-3">
                <p class="mb-1.5 text-xs font-semibold text-ink-500 dark:text-ink-400">
                  {{ group.label }}
                </p>
                <div class="flex flex-wrap gap-x-5 gap-y-1.5">
                  <el-checkbox v-for="item in group.items" :key="item.key" :value="item.key">
                    {{ item.label }}
                  </el-checkbox>
                </div>
              </div>
            </el-checkbox-group>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" :disabled="isBuiltinEdit" @click="submit">
          {{ editing ? '保存修改' : '确认新增' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
