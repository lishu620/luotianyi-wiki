<script setup lang="ts">
import {
  COMMUNITY_GROUP_LEVELS,
  COMMUNITY_GROUP_SECTIONS,
  COMMUNITY_GROUP_SECTION_LABELS,
  SONG_STATUSES,
  SONG_STATUS_LABELS,
  type CommunityGroup,
} from '@luotianyi/shared';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { computed, reactive, ref, watch } from 'vue';

import { groupApi, type GroupPayload } from '@/api';

const visible = defineModel<boolean>({ required: true });

const props = defineProps<{ group: CommunityGroup | null }>();
const emit = defineEmits<{ saved: [] }>();

const formRef = ref<FormInstance>();
const submitting = ref(false);

function emptyForm(): GroupPayload {
  return {
    name: '',
    number: '',
    level: '',
    note: '',
    section: 'regional',
    sortOrder: 0,
    status: 'published',
  };
}

const form = reactive<GroupPayload>(emptyForm());

const rules: FormRules = {
  name: [{ required: true, message: '请填写群名 / 地区名', trigger: 'blur' }],
  number: [
    { required: true, message: '请填写 QQ 群号', trigger: 'blur' },
    { pattern: /^\d+$/, message: 'QQ 群号应为纯数字', trigger: 'blur' },
  ],
};

const isEdit = computed(() => Boolean(props.group));
const title = computed(() => (isEdit.value ? '编辑群聊' : '新增群聊'));

watch(visible, (open) => {
  if (!open) return;

  Object.assign(form, emptyForm());

  if (props.group) {
    Object.assign(form, {
      name: props.group.name,
      number: props.group.number,
      level: props.group.level ?? '',
      note: props.group.note ?? '',
      section: props.group.section,
      sortOrder: props.group.sortOrder,
      status: props.group.status,
    });
  }
});

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const payload = { ...form } as GroupPayload;

    if (isEdit.value && props.group) {
      await groupApi.update(props.group.id, payload);
      ElMessage.success('群聊已更新');
    } else {
      await groupApi.create(payload);
      ElMessage.success('群聊已添加');
    }

    visible.value = false;
    emit('saved');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <el-dialog v-model="visible" :title="title" width="min(560px, 94vw)" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <el-form-item label="群名 / 地区" prop="name">
        <el-input v-model="form.name" placeholder="例如：广东广州" maxlength="150" />
      </el-form-item>

      <el-form-item label="QQ 群号" prop="number">
        <el-input v-model="form.number" placeholder="纯数字，例如 695915987" maxlength="20" />
      </el-form-item>

      <el-form-item label="所属栏目">
        <el-select v-model="form.section" class="w-full">
          <el-option
            v-for="section in COMMUNITY_GROUP_SECTIONS"
            :key="section"
            :label="COMMUNITY_GROUP_SECTION_LABELS[section]"
            :value="section"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="活跃度">
        <el-select v-model="form.level" class="w-full" clearable placeholder="可选">
          <el-option
            v-for="level in COMMUNITY_GROUP_LEVELS"
            :key="level"
            :label="level"
            :value="level"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="备注">
        <el-input v-model="form.note" placeholder="可选，同人展可填举办日期" maxlength="200" />
      </el-form-item>

      <el-form-item label="排序权重">
        <el-input-number v-model="form.sortOrder" :min="0" :max="99999" />
        <span class="ml-2 text-xs text-ink-400">越小越靠前</span>
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
