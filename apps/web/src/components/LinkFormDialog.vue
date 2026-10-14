<script setup lang="ts">
import {
  LINK_CATEGORIES,
  LINK_CATEGORY_LABELS,
  SONG_STATUSES,
  SONG_STATUS_LABELS,
  type ExternalLink,
} from '@luotianyi/shared';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { computed, reactive, ref, watch } from 'vue';

import { linkApi, type LinkPayload } from '@/api';

const visible = defineModel<boolean>({ required: true });

const props = defineProps<{ link: ExternalLink | null }>();
const emit = defineEmits<{ saved: [] }>();

const formRef = ref<FormInstance>();
const submitting = ref(false);

type FormState = LinkPayload & { tags: string[] };

function emptyForm(): FormState {
  return {
    title: '',
    url: '',
    description: '',
    category: 'other',
    iconUrl: '',
    tags: [],
    recommended: false,
    sortOrder: 0,
    status: 'published',
  };
}

const form = reactive<FormState>(emptyForm());

const rules: FormRules = {
  title: [{ required: true, message: '请填写站点名称', trigger: 'blur' }],
  url: [
    { required: true, message: '请填写跳转地址', trigger: 'blur' },
    { pattern: /^https?:\/\/.+/i, message: '地址需以 http:// 或 https:// 开头', trigger: 'blur' },
  ],
};

const isEdit = computed(() => Boolean(props.link));
const title = computed(() => (isEdit.value ? '编辑站点' : '新增站点'));

watch(visible, (open) => {
  if (!open) return;

  Object.assign(form, emptyForm());

  if (props.link) {
    Object.assign(form, { ...props.link, tags: [...(props.link.tags ?? [])] });
  }
});

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const payload = { ...form } as LinkPayload;

    if (isEdit.value && props.link) {
      await linkApi.update(props.link.id, payload);
      ElMessage.success('站点已更新');
    } else {
      await linkApi.create(payload);
      ElMessage.success('站点已添加');
    }

    visible.value = false;
    emit('saved');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <el-dialog v-model="visible" :title="title" width="min(620px, 94vw)" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="88px">
      <el-form-item label="站点名称" prop="title">
        <el-input v-model="form.title" placeholder="例如：萌娘百科 · 洛天依" maxlength="150" />
      </el-form-item>

      <el-form-item label="跳转地址" prop="url">
        <el-input v-model="form.url" placeholder="https://..." maxlength="600" />
      </el-form-item>

      <el-form-item label="分类">
        <el-select v-model="form.category" class="w-full">
          <el-option
            v-for="category in LINK_CATEGORIES"
            :key="category"
            :label="LINK_CATEGORY_LABELS[category]"
            :value="category"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="图标地址">
        <el-input v-model="form.iconUrl" placeholder="可选，favicon 或图片直链" />
      </el-form-item>

      <el-form-item label="标签">
        <el-select
          v-model="form.tags"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="输入后回车添加"
          class="w-full"
        />
      </el-form-item>

      <el-form-item label="站点简介">
        <el-input v-model="form.description" type="textarea" :rows="3" maxlength="1000" show-word-limit />
      </el-form-item>

      <el-form-item label="排序权重">
        <el-input-number v-model="form.sortOrder" :min="0" :max="9999" />
      </el-form-item>

      <el-form-item label="推荐">
        <el-switch v-model="form.recommended" />
      </el-form-item>

      <el-form-item label="状态">
        <el-radio-group v-model="form.status">
          <el-radio v-for="status in SONG_STATUSES" :key="status" :value="status">
            {{ SONG_STATUS_LABELS[status] }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">
        {{ isEdit ? '保存修改' : '确认新增' }}
      </el-button>
    </template>
  </el-dialog>
</template>
