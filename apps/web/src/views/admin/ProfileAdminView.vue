<script setup lang="ts">
import { PROFILE_SLUGS, PROFILE_SLUG_LABELS, type ProfileSection, type ProfileSlug } from '@luotianyi/shared';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';

import { profileApi, type ProfilePayload } from '@/api';

const loading = ref(false);
const sections = ref<ProfileSection[]>([]);

const dialogVisible = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const editing = ref<ProfileSection | null>(null);

const form = reactive({
  slug: 'basic' as ProfileSlug,
  title: '',
  subtitle: '',
  icon: '',
  content: '',
  dataText: '',
  sortOrder: 0,
  published: true,
});

const rules: FormRules = {
  title: [{ required: true, message: '请填写分节标题', trigger: 'blur' }],
};

const iconOptions = [
  'Star',
  'Postcard',
  'Compass',
  'Microphone',
  'Picture',
  'Trophy',
  'MagicStick',
  'Document',
  'Reading',
  'Collection',
];

async function load(): Promise<void> {
  loading.value = true;
  try {
    sections.value = await profileApi.adminList();
  } finally {
    loading.value = false;
  }
}

function openEdit(section: ProfileSection): void {
  editing.value = section;
  Object.assign(form, {
    slug: section.slug,
    title: section.title,
    subtitle: section.subtitle ?? '',
    icon: section.icon ?? '',
    content: section.content ?? '',
    dataText: section.data ? JSON.stringify(section.data, null, 2) : '',
    sortOrder: section.sortOrder,
    published: section.published,
  });
  dialogVisible.value = true;
}

function openCreate(): void {
  editing.value = null;
  Object.assign(form, {
    slug: 'basic' as ProfileSlug,
    title: '',
    subtitle: '',
    icon: 'Document',
    content: '',
    dataText: '',
    sortOrder: sections.value.length,
    published: true,
  });
  dialogVisible.value = true;
}

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  let data: ProfilePayload['data'];

  if (form.dataText.trim()) {
    try {
      data = JSON.parse(form.dataText);
    } catch {
      ElMessage.error('结构化数据不是合法 JSON，请检查后重试');
      return;
    }
  } else {
    // 留空即清空结构化数据
    data = null;
  }

  submitting.value = true;
  try {
    const payload: ProfilePayload = {
      slug: form.slug,
      title: form.title,
      subtitle: form.subtitle || undefined,
      icon: form.icon || undefined,
      content: form.content,
      data,
      sortOrder: form.sortOrder,
      published: form.published,
    };

    if (editing.value) {
      await profileApi.update(editing.value.id, payload);
      ElMessage.success('分节已更新');
    } else {
      await profileApi.upsert(payload);
      ElMessage.success('分节已保存');
    }

    dialogVisible.value = false;
    await load();
  } finally {
    submitting.value = false;
  }
}

async function remove(section: ProfileSection): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除分节「${section.title}」吗？`, '删除分节', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  await profileApi.remove(section.id);
  ElMessage.success('已删除');
  await load();
}

async function togglePublished(section: ProfileSection): Promise<void> {
  await profileApi.update(section.id, { published: section.published });
  ElMessage.success(section.published ? '已发布' : '已下架');
}

const dataPlaceholder = `{
  "facts": [
    { "label": "中文名", "value": "洛天依" }
  ],
  "gallery": [
    { "name": "造型名称", "imageUrl": "", "description": "说明" }
  ],
  "timeline": [
    { "year": "2012", "title": "大事件", "description": "描述" }
  ]
}`;

onMounted(() => void load());
</script>

<template>
  <div class="space-y-4">
    <div class="lty-card flex flex-wrap items-center gap-3 p-4">
      <div>
        <p class="text-sm font-semibold text-ink-900 dark:text-white">介绍页分节</p>
        <p class="text-xs text-ink-500 dark:text-ink-400">
          分节按排序权重升序展示；「首屏主视觉」用于首页 Hero 区域。
        </p>
      </div>

      <div class="ml-auto flex gap-2">
        <el-button @click="load">
          <el-icon class="mr-1"><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button type="primary" @click="openCreate">
          <el-icon class="mr-1"><Plus /></el-icon>
          新增分节
        </el-button>
      </div>
    </div>

    <div v-loading="loading" class="grid gap-4 lg:grid-cols-2">
      <div v-for="section in sections" :key="section.id" class="lty-card flex flex-col p-5">
        <div class="flex items-start gap-3">
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white"
          >
            <el-icon :size="18"><component :is="section.icon || 'Document'" /></el-icon>
          </span>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-semibold text-ink-900 dark:text-white">{{ section.title }}</p>
              <el-tag size="small" effect="plain">{{ PROFILE_SLUG_LABELS[section.slug] }}</el-tag>
              <el-tag v-if="!section.published" size="small" type="warning" effect="light">未发布</el-tag>
            </div>

            <p v-if="section.subtitle" class="mt-1 text-xs text-ink-500 dark:text-ink-400">
              {{ section.subtitle }}
            </p>
          </div>
        </div>

        <p class="mt-3 line-clamp-3 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
          {{ section.content || '（暂无正文）' }}
        </p>

        <div class="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
          <span class="text-[11px] text-ink-400">
            slug: {{ section.slug }} · 权重 {{ section.sortOrder }}
            <template v-if="section.data">
              · {{ Object.keys(section.data).length }} 组结构化数据
            </template>
          </span>

          <div class="ml-auto flex items-center gap-2">
            <el-switch
              v-model="section.published"
              size="small"
              @change="togglePublished(section)"
            />
            <el-button link type="primary" size="small" @click="openEdit(section)">编辑</el-button>
            <el-button link type="danger" size="small" @click="remove(section)">删除</el-button>
          </div>
        </div>
      </div>

      <p v-if="!loading && !sections.length" class="py-10 text-center text-sm text-ink-400 lg:col-span-2">
        还没有分节，点击「新增分节」创建，或运行 pnpm seed 写入示例内容。
      </p>
    </div>

    <!-- 编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editing ? `编辑分节 · ${editing.title}` : '新增分节'"
      width="min(760px, 94vw)"
      top="6vh"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="分节标识">
          <el-select v-model="form.slug" :disabled="Boolean(editing)" class="w-full">
            <el-option
              v-for="slug in PROFILE_SLUGS"
              :key="slug"
              :label="`${PROFILE_SLUG_LABELS[slug]}（${slug}）`"
              :value="slug"
            />
          </el-select>
          <p class="mt-1 text-xs text-ink-400">同一标识只能存在一个分节，重复保存会覆盖原内容。</p>
        </el-form-item>

        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="例如：基础资料" />
        </el-form-item>

        <el-form-item label="副标题">
          <el-input v-model="form.subtitle" placeholder="例如：角色设定速览" />
        </el-form-item>

        <el-form-item label="图标">
          <el-select v-model="form.icon" clearable filterable allow-create class="w-full">
            <el-option v-for="icon in iconOptions" :key="icon" :label="icon" :value="icon">
              <span class="flex items-center gap-2">
                <el-icon><component :is="icon" /></el-icon>
                {{ icon }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="正文">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="9"
            placeholder="支持简单 Markdown：### 小标题、- 列表、**加粗**、`代码`、[链接](https://...)"
          />
        </el-form-item>

        <el-form-item label="结构化数据">
          <el-input
            v-model="form.dataText"
            type="textarea"
            :rows="10"
            :placeholder="dataPlaceholder"
            class="font-mono"
          />
          <p class="mt-1 text-xs text-ink-400">
            可选。JSON 格式，支持 facts（键值对）、gallery（图鉴）、timeline（时间线）。
          </p>
        </el-form-item>

        <div class="grid gap-x-6 sm:grid-cols-2">
          <el-form-item label="排序权重">
            <el-input-number v-model="form.sortOrder" :min="0" :max="999" class="w-full" />
          </el-form-item>

          <el-form-item label="发布状态">
            <el-switch v-model="form.published" active-text="已发布" inactive-text="草稿" />
          </el-form-item>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
