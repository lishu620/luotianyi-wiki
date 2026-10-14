<script setup lang="ts">
import { SONG_STATUSES, SONG_STATUS_LABELS, VOCAL_TYPES, VOCAL_TYPE_LABELS, type Song } from '@luotianyi/shared';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { computed, reactive, ref, watch } from 'vue';

import { songApi, songRequestApi, type SongPayload } from '@/api';

const visible = defineModel<boolean>({ required: true });

/** mode=request 时，编辑不会直接写回歌曲，而是生成「修改申请」等待审批 */
const props = defineProps<{ song: Song | null; mode?: 'direct' | 'request' }>();
const emit = defineEmits<{ saved: [] }>();

const formRef = ref<FormInstance>();
const submitting = ref(false);

type FormState = SongPayload & {
  aliases: string[];
  tags: string[];
  featuredSingers: string[];
  releaseYear?: number;
  duration?: number;
  playCount?: number;
  sortOrder?: number;
};

function emptyForm(): FormState {
  return {
    title: '',
    titlePinyin: '',
    aliases: [],
    producer: '',
    lyricist: '',
    composer: '',
    arranger: '',
    vocalType: 'solo',
    featuredSingers: [],
    releaseDate: null,
    releaseYear: undefined,
    duration: undefined,
    playCount: 0,
    tags: [],
    description: '',
    lyrics: '',
    coverUrl: '',
    bilibiliUrl: '',
    youtubeUrl: '',
    neteaseUrl: '',
    qqMusicUrl: '',
    isFeatured: false,
    status: 'published',
    sortOrder: 0,
  };
}

const form = reactive<FormState>(emptyForm());

const rules: FormRules = {
  title: [{ required: true, message: '请填写歌曲标题', trigger: 'blur' }],
};

const isEdit = computed(() => Boolean(props.song));
const title = computed(() => (isEdit.value ? '编辑歌曲' : '新增歌曲'));

watch(visible, (open) => {
  if (!open) return;

  Object.assign(form, emptyForm());

  if (props.song) {
    Object.assign(form, {
      ...props.song,
      aliases: [...(props.song.aliases ?? [])],
      tags: [...(props.song.tags ?? [])],
      featuredSingers: [...(props.song.featuredSingers ?? [])],
    });
  }
});

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const payload = { ...form } as SongPayload;

    if (isEdit.value && props.song && props.mode === 'request') {
      await songRequestApi.submit(props.song.id, payload as Record<string, unknown>);
      ElMessage.success('已提交修改申请，等待原投稿人或管理员审批');
    } else if (isEdit.value && props.song) {
      await songApi.update(props.song.id, payload);
      ElMessage.success('歌曲已更新');
    } else {
      await songApi.create(payload);
      ElMessage.success('歌曲已添加');
    }

    visible.value = false;
    emit('saved');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <el-dialog v-model="visible" :title="title" width="min(860px, 94vw)" top="6vh" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="96px" label-position="right">
      <div class="grid gap-x-6 sm:grid-cols-2">
        <el-form-item label="歌曲标题" prop="title" class="sm:col-span-2">
          <el-input v-model="form.title" placeholder="例如：权御天下" maxlength="200" show-word-limit />
        </el-form-item>

        <el-form-item label="标题拼音">
          <el-input v-model="form.titlePinyin" placeholder="quanyutianxia（便于拼音搜索）" />
        </el-form-item>

        <el-form-item label="别名">
          <el-select
            v-model="form.aliases"
            multiple
            filterable
            allow-create
            default-first-option
            :reserve-keyword="false"
            placeholder="输入后回车添加"
            class="w-full"
          />
        </el-form-item>

        <el-form-item label="P 主">
          <el-input v-model="form.producer" placeholder="投稿者 / 制作人" />
        </el-form-item>

        <el-form-item label="作词">
          <el-input v-model="form.lyricist" />
        </el-form-item>

        <el-form-item label="作曲">
          <el-input v-model="form.composer" />
        </el-form-item>

        <el-form-item label="编曲">
          <el-input v-model="form.arranger" />
        </el-form-item>

        <el-form-item label="演唱形式">
          <el-select v-model="form.vocalType" class="w-full">
            <el-option
              v-for="type in VOCAL_TYPES"
              :key="type"
              :label="VOCAL_TYPE_LABELS[type]"
              :value="type"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="其他演唱者">
          <el-select
            v-model="form.featuredSingers"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="例如：言和"
            class="w-full"
          />
        </el-form-item>

        <el-form-item label="发行日期">
          <el-date-picker
            v-model="form.releaseDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            class="w-full"
          />
        </el-form-item>

        <el-form-item label="发行年份">
          <el-input-number v-model="form.releaseYear" :min="2000" :max="2100" class="w-full" />
        </el-form-item>

        <el-form-item label="时长（秒）">
          <el-input-number v-model="form.duration" :min="0" :max="36000" class="w-full" />
        </el-form-item>

        <el-form-item label="播放量">
          <el-input-number v-model="form.playCount" :min="0" :step="10000" class="w-full" />
        </el-form-item>

        <el-form-item label="标签" class="sm:col-span-2">
          <el-select
            v-model="form.tags"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入后回车添加，例如：古风"
            class="w-full"
          />
        </el-form-item>

        <el-form-item label="封面地址" class="sm:col-span-2">
          <el-input v-model="form.coverUrl" placeholder="https://..." />
        </el-form-item>

        <el-form-item label="B 站链接" class="sm:col-span-2">
          <el-input v-model="form.bilibiliUrl" placeholder="https://www.bilibili.com/video/..." />
        </el-form-item>

        <el-form-item label="YouTube">
          <el-input v-model="form.youtubeUrl" />
        </el-form-item>

        <el-form-item label="网易云音乐">
          <el-input v-model="form.neteaseUrl" />
        </el-form-item>

        <el-form-item label="QQ 音乐">
          <el-input v-model="form.qqMusicUrl" />
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="form.status" class="w-full">
            <el-option
              v-for="status in SONG_STATUSES"
              :key="status"
              :label="SONG_STATUS_LABELS[status]"
              :value="status"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="排序权重">
          <el-input-number v-model="form.sortOrder" :min="0" :max="9999" class="w-full" />
        </el-form-item>

        <el-form-item label="代表作">
          <el-switch v-model="form.isFeatured" active-text="是" inactive-text="否" />
        </el-form-item>

        <el-form-item label="歌曲简介" class="sm:col-span-2">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="支持简单 Markdown：**加粗**、- 列表、[链接](https://...)"
          />
        </el-form-item>

        <el-form-item label="歌词" class="sm:col-span-2">
          <el-input v-model="form.lyrics" type="textarea" :rows="6" placeholder="每行一句歌词" />
        </el-form-item>
      </div>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">
        {{ isEdit ? '保存修改' : '确认新增' }}
      </el-button>
    </template>
  </el-dialog>
</template>
