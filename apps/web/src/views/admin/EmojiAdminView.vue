<script setup lang="ts">
import {
  EMOJI_CATEGORIES,
  EMOJI_CATEGORY_LABELS,
  EMOJI_PACK_STATUSES,
  EMOJI_PACK_STATUS_LABELS,
  EMOJI_WATERMARK_POSITIONS,
  EMOJI_WATERMARK_POSITION_LABELS,
  type EmojiCategory,
  type EmojiImage,
  type EmojiPack,
  type EmojiPackStatus,
  type EmojiWatermarkPosition,
} from '@luotianyi/shared';
import { ElMessage, ElMessageBox, type UploadRequestOptions } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';

import { emojiApi, type EmojiPackPayload } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { compact, formatDate } from '@/utils';

const auth = useAuthStore();

const loading = ref(false);
const list = ref<EmojiPack[]>([]);
const total = ref(0);
const selection = ref<EmojiPack[]>([]);

const query = reactive({
  keyword: '',
  category: undefined as EmojiCategory | undefined,
  status: undefined as EmojiPackStatus | undefined,
  page: 1,
  pageSize: 15,
});

const canDeleteAny = computed(() => auth.can('emoji.delete.any'));

function canUpload(): boolean {
  return auth.can('emoji.create');
}

function canEdit(pack: EmojiPack): boolean {
  return (
    auth.can('emoji.update.any') ||
    (auth.can('emoji.update.own') && pack.ownerId === auth.user?.id)
  );
}

function canDelete(pack: EmojiPack): boolean {
  return (
    auth.can('emoji.delete.any') ||
    (auth.can('emoji.delete.own') && pack.ownerId === auth.user?.id)
  );
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const result = await emojiApi.adminList(compact({ ...query }));
    list.value = result.items;
    total.value = result.total;
  } catch {
    list.value = [];
    total.value = 0;
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
  query.status = undefined;
  query.page = 1;
  void load();
}

function changePage(page: number): void {
  query.page = page;
  void load();
}

function onSelectionChange(rows: EmojiPack[]): void {
  selection.value = rows;
}

/* ------------------------------------------------------------------ */
/* 表情包表单                                                          */
/* ------------------------------------------------------------------ */

const packDialog = ref(false);
const savingPack = ref(false);
const editingPack = ref<EmojiPack | null>(null);

const packForm = reactive({
  name: '',
  description: '',
  category: 'other' as EmojiCategory,
  status: 'published' as EmojiPackStatus,
  tagsText: '',
  watermarkEnabled: false,
  watermarkText: '',
  watermarkPosition: 'bottom-right' as EmojiWatermarkPosition,
  watermarkOpacity: 0.6,
  sortOrder: 0,
});

function resetPackForm(): void {
  Object.assign(packForm, {
    name: '',
    description: '',
    category: 'other',
    status: 'published',
    tagsText: '',
    watermarkEnabled: false,
    watermarkText: '',
    watermarkPosition: 'bottom-right',
    watermarkOpacity: 0.6,
    sortOrder: 0,
  });
}

function openCreate(): void {
  editingPack.value = null;
  resetPackForm();
  packDialog.value = true;
}

function openEdit(pack: EmojiPack): void {
  editingPack.value = pack;
  Object.assign(packForm, {
    name: pack.name,
    description: pack.description ?? '',
    category: pack.category,
    status: pack.status,
    tagsText: pack.tags.join(', '),
    watermarkEnabled: pack.watermarkEnabled,
    watermarkText: pack.watermarkText ?? '',
    watermarkPosition: pack.watermarkPosition,
    watermarkOpacity: pack.watermarkOpacity,
    sortOrder: pack.sortOrder,
  });
  packDialog.value = true;
}

async function savePack(): Promise<void> {
  if (!packForm.name.trim()) {
    ElMessage.warning('请填写表情包名称');
    return;
  }

  const payload: EmojiPackPayload = {
    name: packForm.name.trim(),
    description: packForm.description.trim() || null,
    category: packForm.category,
    status: packForm.status,
    tags: packForm.tagsText
      .split(/[,，]/)
      .map((item) => item.trim())
      .filter(Boolean),
    watermarkEnabled: packForm.watermarkEnabled,
    watermarkText: packForm.watermarkText.trim() || null,
    watermarkPosition: packForm.watermarkPosition,
    watermarkOpacity: packForm.watermarkOpacity,
    sortOrder: packForm.sortOrder,
  };

  savingPack.value = true;
  try {
    if (editingPack.value) {
      const updated = await emojiApi.updatePack(editingPack.value.id, payload);
      ElMessage.success('已保存');
      replacePack(updated);
    } else {
      await emojiApi.createPack(payload);
      ElMessage.success('表情包已创建');
      query.page = 1;
    }
    packDialog.value = false;
    await load();
  } finally {
    savingPack.value = false;
  }
}

async function removePack(pack: EmojiPack): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确定删除表情包「${pack.name}」吗？其中的 ${pack.imageCount} 张表情会一并删除。`,
      '删除表情包',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    );
  } catch {
    return;
  }

  await emojiApi.removePack(pack.id);
  ElMessage.success('已删除');
  await load();
}

async function removeSelected(): Promise<void> {
  if (selection.value.length === 0) return;

  try {
    await ElMessageBox.confirm(
      `确定删除选中的 ${selection.value.length} 个表情包吗？该操作不可撤销。`,
      '批量删除',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    );
  } catch {
    return;
  }

  const result = await emojiApi.bulkRemove(selection.value.map((item) => item.id));
  ElMessage.success(`已删除 ${result.deleted} 个表情包`);
  selection.value = [];
  await load();
}

function replacePack(pack: EmojiPack): void {
  const index = list.value.findIndex((item) => item.id === pack.id);
  if (index >= 0) list.value[index] = { ...list.value[index], ...pack };

  if (activePack.value?.id === pack.id) {
    activePack.value = { ...activePack.value, ...pack, images: activePack.value.images };
  }
}

/* ------------------------------------------------------------------ */
/* 表情管理                                                            */
/* ------------------------------------------------------------------ */

const imageDialog = ref(false);
const imageLoading = ref(false);
const uploadingCount = ref(0);
const activePack = ref<EmojiPack | null>(null);

const uploadForm = reactive({
  watermark: false,
  text: '',
  position: 'bottom-right' as EmojiWatermarkPosition,
  opacity: 0.6,
});

const activeImages = computed(() => activePack.value?.images ?? []);
const previewUrls = computed(() => activeImages.value.map((image) => image.url));

async function openImages(pack: EmojiPack): Promise<void> {
  activePack.value = { ...pack, images: [] };
  uploadForm.watermark = false;
  uploadForm.text = pack.watermarkText ?? '';
  uploadForm.position = pack.watermarkPosition;
  uploadForm.opacity = pack.watermarkOpacity;
  imageDialog.value = true;
  await refreshActivePack();
}

async function refreshActivePack(): Promise<void> {
  if (!activePack.value) return;
  imageLoading.value = true;
  try {
    const detail = await emojiApi.adminDetail(activePack.value.id);
    activePack.value = detail;
    replacePack(detail);
  } finally {
    imageLoading.value = false;
  }
}

function beforeUpload(file: File): boolean {
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('只能上传图片文件');
    return false;
  }
  if (file.size > 12 * 1024 * 1024) {
    ElMessage.warning('单张图片不能超过 12MB');
    return false;
  }
  if (uploadForm.watermark && !uploadForm.text.trim()) {
    ElMessage.warning('开启水印后请填写水印文字');
    return false;
  }
  return true;
}

async function uploadRequest(options: UploadRequestOptions): Promise<void> {
  if (!activePack.value) return;

  uploadingCount.value += 1;
  try {
    const image = await emojiApi.uploadImage(activePack.value.id, options.file as File, {
      watermarkText: uploadForm.watermark ? uploadForm.text.trim() : undefined,
      watermarkPosition: uploadForm.position,
      watermarkOpacity: uploadForm.opacity,
    });

    options.onSuccess(image);
    activePack.value.images = [...(activePack.value.images ?? []), image];
    activePack.value.imageCount += 1;

    if (!activePack.value.coverImageId) {
      activePack.value.coverImageId = image.id;
      activePack.value.coverUrl = image.url;
    }
    ElMessage.success(`「${image.name}」上传完成`);
    void load();
  } catch (error) {
    options.onError(error as never);
  } finally {
    uploadingCount.value -= 1;
  }
}

function updateLocalImage(image: EmojiImage): void {
  if (!activePack.value?.images) return;
  const index = activePack.value.images.findIndex((item) => item.id === image.id);
  if (index >= 0) activePack.value.images[index] = image;

  if (activePack.value.coverImageId === image.id) {
    activePack.value.coverUrl = image.url;
  }
  void load();
}

async function setCover(image: EmojiImage): Promise<void> {
  const updated = await emojiApi.setCover(image.id);
  if (activePack.value) {
    activePack.value.coverImageId = updated.id;
    activePack.value.coverUrl = updated.url;
  }
  ElMessage.success('已设为封面');
  void load();
  void refreshActivePack();
}

async function removeImage(image: EmojiImage): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除表情「${image.name}」吗？`, '删除表情', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  await emojiApi.removeImage(image.id);
  ElMessage.success('已删除');
  void load();
  await refreshActivePack();
}

/* ------------------------------------------------------------------ */
/* 单张表情编辑                                                        */
/* ------------------------------------------------------------------ */

const imageEditDialog = ref(false);
const savingImage = ref(false);
const editingImage = ref<EmojiImage | null>(null);
const imageForm = reactive({ name: '', tagsText: '', sortOrder: 0 });

function openImageEdit(image: EmojiImage): void {
  editingImage.value = image;
  Object.assign(imageForm, {
    name: image.name,
    tagsText: image.tags.join(', '),
    sortOrder: image.sortOrder,
  });
  imageEditDialog.value = true;
}

async function saveImageEdit(): Promise<void> {
  if (!editingImage.value) return;
  if (!imageForm.name.trim()) {
    ElMessage.warning('请填写表情名称');
    return;
  }

  savingImage.value = true;
  try {
    const updated = await emojiApi.updateImage(editingImage.value.id, {
      name: imageForm.name.trim(),
      tags: imageForm.tagsText
        .split(/[,，]/)
        .map((item) => item.trim())
        .filter(Boolean),
      sortOrder: imageForm.sortOrder,
    });
    updateLocalImage(updated);
    imageEditDialog.value = false;
    ElMessage.success('已保存');
  } finally {
    savingImage.value = false;
  }
}

/* ------------------------------------------------------------------ */
/* 水印                                                                */
/* ------------------------------------------------------------------ */

const watermarkDialog = ref(false);
const watermarkSaving = ref(false);
const watermarkImage = ref<EmojiImage | null>(null);
const watermarkForm = reactive({
  text: '',
  position: 'bottom-right' as EmojiWatermarkPosition,
  opacity: 0.6,
});

function openWatermark(image: EmojiImage): void {
  watermarkImage.value = image;
  watermarkForm.text = image.watermarkText ?? activePack.value?.watermarkText ?? '';
  watermarkForm.position = activePack.value?.watermarkPosition ?? 'bottom-right';
  watermarkForm.opacity = activePack.value?.watermarkOpacity ?? 0.6;
  watermarkDialog.value = true;
}

async function saveWatermark(remove = false): Promise<void> {
  if (!watermarkImage.value) return;
  if (!remove && !watermarkForm.text.trim()) {
    ElMessage.warning('请填写水印文字，或选择移除水印');
    return;
  }

  watermarkSaving.value = true;
  try {
    const updated = await emojiApi.applyWatermark(watermarkImage.value.id, {
      text: remove ? '' : watermarkForm.text.trim(),
      position: watermarkForm.position,
      opacity: watermarkForm.opacity,
    });
    updateLocalImage(updated);
    watermarkDialog.value = false;
    ElMessage.success(remove ? '水印已移除' : '水印已更新');
  } finally {
    watermarkSaving.value = false;
  }
}

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

function formatSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

onMounted(() => void load());
</script>

<template>
  <div class="space-y-4">
    <div class="lty-card flex flex-wrap items-center gap-3 p-4">
      <el-input
        v-model="query.keyword"
        placeholder="搜索名称 / 简介 / 标签"
        clearable
        class="!w-60"
        @keyup.enter="search"
        @clear="search"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-select v-model="query.category" placeholder="全部分类" clearable class="!w-36" @change="search">
        <el-option
          v-for="category in EMOJI_CATEGORIES"
          :key="category"
          :label="EMOJI_CATEGORY_LABELS[category]"
          :value="category"
        />
      </el-select>

      <el-select v-model="query.status" placeholder="全部状态" clearable class="!w-32" @change="search">
        <el-option
          v-for="status in EMOJI_PACK_STATUSES"
          :key="status"
          :label="EMOJI_PACK_STATUS_LABELS[status]"
          :value="status"
        />
      </el-select>

      <el-button type="primary" @click="search">查询</el-button>
      <el-button text @click="reset">重置</el-button>

      <div class="ml-auto flex gap-2">
        <el-button v-if="canDeleteAny" :disabled="selection.length === 0" @click="removeSelected">
          <el-icon class="mr-1"><Delete /></el-icon>
          批量删除
        </el-button>
        <el-button v-if="canUpload()" type="primary" @click="openCreate">
          <el-icon class="mr-1"><Plus /></el-icon>
          新建表情包
        </el-button>
      </div>
    </div>

    <div class="lty-card overflow-hidden">
      <el-table
        v-loading="loading"
        :data="list"
        row-key="id"
        @selection-change="onSelectionChange"
      >
        <el-table-column v-if="canDeleteAny" type="selection" width="44" />

        <el-table-column label="封面" width="76">
          <template #default="{ row }">
            <el-image
              v-if="row.coverUrl"
              :src="row.coverUrl"
              :preview-src-list="[row.coverUrl]"
              fit="cover"
              class="h-12 w-12 rounded-lg"
              preview-teleported
            />
            <span
              v-else
              class="flex h-12 w-12 items-center justify-center rounded-lg bg-ink-100 text-ink-300 dark:bg-ink-800"
            >
              <el-icon :size="20"><Picture /></el-icon>
            </span>
          </template>
        </el-table-column>

        <el-table-column label="名称" min-width="200">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <span class="font-medium text-ink-900 dark:text-white">{{ row.name }}</span>
              <span
                class="lty-chip bg-brand-50 text-brand-700 dark:bg-ink-800 dark:text-brand-300"
              >
                {{ EMOJI_CATEGORY_LABELS[row.category as EmojiCategory] }}
              </span>
            </div>
            <div v-if="row.tags?.length" class="mt-1 flex flex-wrap gap-1">
              <span
                v-for="tag in row.tags.slice(0, 4)"
                :key="tag"
                class="text-[11px] text-ink-400"
              >
                #{{ tag }}
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'published' ? 'success' : row.status === 'draft' ? 'info' : 'warning'"
              effect="plain"
              size="small"
            >
              {{ EMOJI_PACK_STATUS_LABELS[row.status as EmojiPackStatus] }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="表情数" width="90" align="center">
          <template #default="{ row }">{{ row.imageCount }}</template>
        </el-table-column>

        <el-table-column label="更新时间" width="120">
          <template #default="{ row }">
            <span class="text-xs text-ink-500">{{ formatDate(row.updatedAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <div class="flex flex-wrap gap-1">
              <el-button v-if="canEdit(row)" text size="small" @click="openImages(row)">
                <el-icon><Picture /></el-icon>
                表情
              </el-button>
              <el-button v-if="canEdit(row)" text size="small" @click="openEdit(row)">
                <el-icon><EditPen /></el-icon>
                编辑
              </el-button>
              <el-button v-if="canDelete(row)" text size="small" type="danger" @click="removePack(row)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="total > query.pageSize" class="flex justify-center border-t border-ink-100 py-4 dark:border-ink-800">
        <el-pagination
          background
          layout="prev, pager, next"
          :current-page="query.page"
          :page-size="query.pageSize"
          :total="total"
          @current-change="changePage"
        />
      </div>

      <div v-if="!loading && !list.length" class="p-10 text-center text-sm text-ink-400">
        还没有表情包，点击「新建表情包」开始收集吧。
      </div>
    </div>

    <!-- 表情包编辑 -->
    <el-dialog
      v-model="packDialog"
      :title="editingPack ? '编辑表情包' : '新建表情包'"
      width="560px"
      append-to-body
    >
      <el-form label-width="92px">
        <el-form-item label="名称" required>
          <el-input v-model="packForm.name" maxlength="120" show-word-limit placeholder="例如：天依日常表情包" />
        </el-form-item>

        <el-form-item label="分类">
          <el-select v-model="packForm.category" class="w-full">
            <el-option
              v-for="category in EMOJI_CATEGORIES"
              :key="category"
              :label="EMOJI_CATEGORY_LABELS[category]"
              :value="category"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-radio-group v-model="packForm.status">
            <el-radio-button v-for="status in EMOJI_PACK_STATUSES" :key="status" :value="status">
              {{ EMOJI_PACK_STATUS_LABELS[status] }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="标签">
          <el-input v-model="packForm.tagsText" placeholder="用逗号分隔，例如：可爱, 日常, 表情" />
        </el-form-item>

        <el-form-item label="简介">
          <el-input
            v-model="packForm.description"
            type="textarea"
            :rows="3"
            maxlength="2000"
            show-word-limit
            placeholder="介绍一下这个表情包"
          />
        </el-form-item>

        <el-form-item label="默认水印">
          <div class="w-full space-y-2">
            <div class="flex items-center gap-2">
              <el-switch v-model="packForm.watermarkEnabled" />
              <span class="text-xs text-ink-500">开启后，上传表情时会预填水印文字（仍可逐张关闭）</span>
            </div>

            <template v-if="packForm.watermarkEnabled">
              <el-input v-model="packForm.watermarkText" maxlength="120" placeholder="水印文字，例如：@洛天依 Wiki" />
              <div class="flex items-center gap-2">
                <el-select v-model="packForm.watermarkPosition" class="!w-32">
                  <el-option
                    v-for="position in EMOJI_WATERMARK_POSITIONS"
                    :key="position"
                    :label="EMOJI_WATERMARK_POSITION_LABELS[position]"
                    :value="position"
                  />
                </el-select>
                <el-slider v-model="packForm.watermarkOpacity" :min="0.1" :max="1" :step="0.05" class="flex-1" />
                <span class="w-10 text-right text-xs text-ink-400">
                  {{ Math.round(packForm.watermarkOpacity * 100) }}%
                </span>
              </div>
            </template>
          </div>
        </el-form-item>

        <el-form-item label="排序权重">
          <el-input-number v-model="packForm.sortOrder" :min="-9999" :max="9999" />
          <span class="ml-2 text-xs text-ink-400">数值越小越靠前</span>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="packDialog = false">取消</el-button>
        <el-button type="primary" :loading="savingPack" @click="savePack">保存</el-button>
      </template>
    </el-dialog>

    <!-- 表情管理 -->
    <el-dialog
      v-model="imageDialog"
      :title="activePack ? `管理表情 · ${activePack.name}` : '管理表情'"
      width="min(1200px, 96vw)"
      top="5vh"
      append-to-body
      @closed="load()"
    >
      <div v-if="activePack" class="space-y-4">
        <div class="rounded-xl border border-ink-200/70 p-3 dark:border-ink-800">
          <div class="flex flex-wrap items-center gap-3">
            <el-upload
              multiple
              accept="image/*"
              :show-file-list="false"
              :before-upload="beforeUpload"
              :http-request="uploadRequest"
            >
              <el-button type="primary" class="whitespace-nowrap" :disabled="uploadingCount > 0">
                <el-icon class="mr-1"><Upload /></el-icon>
                上传表情
              </el-button>
            </el-upload>

            <el-switch v-model="uploadForm.watermark" active-text="本次上传加水印" />

            <template v-if="uploadForm.watermark">
              <el-input
                v-model="uploadForm.text"
                class="!w-52"
                maxlength="120"
                placeholder="水印文字"
              />
              <el-select v-model="uploadForm.position" class="!w-28">
                <el-option
                  v-for="position in EMOJI_WATERMARK_POSITIONS"
                  :key="position"
                  :label="EMOJI_WATERMARK_POSITION_LABELS[position]"
                  :value="position"
                />
              </el-select>
              <el-slider v-model="uploadForm.opacity" :min="0.1" :max="1" :step="0.05" class="!w-28" />
            </template>

            <span v-if="uploadingCount > 0" class="flex items-center gap-1 text-xs text-brand-600">
              <el-icon class="animate-spin"><Loading /></el-icon>
              正在上传 {{ uploadingCount }} 张…
            </span>

            <span class="ml-auto text-xs text-ink-400">支持 JPG / PNG / WebP / GIF，自动压缩到 1080px</span>
          </div>
        </div>

        <el-table v-loading="imageLoading" :data="activeImages" row-key="id" max-height="52vh">
          <el-table-column label="预览" width="84">
            <template #default="{ row }">
              <el-image
                :src="row.url"
                :preview-src-list="previewUrls"
                :initial-index="activeImages.findIndex((item) => item.id === row.id)"
                fit="cover"
                class="h-14 w-14 rounded-lg"
                preview-teleported
              />
            </template>
          </el-table-column>

          <el-table-column label="名称" min-width="140">
            <template #default="{ row }">
              <div class="flex items-center gap-1.5">
                <span class="text-sm text-ink-800 dark:text-ink-100">{{ row.name }}</span>
                <el-tag v-if="row.id === activePack.coverImageId" size="small" type="success" effect="plain">
                  封面
                </el-tag>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="标签" min-width="120">
            <template #default="{ row }">
              <div class="flex flex-wrap gap-1">
                <span v-for="tag in row.tags" :key="tag" class="text-[11px] text-ink-400">
                  #{{ tag }}
                </span>
                <span v-if="!row.tags?.length" class="text-[11px] text-ink-300">—</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="尺寸 / 大小" width="130">
            <template #default="{ row }">
              <span class="text-[11px] text-ink-500">
                {{ row.width }}×{{ row.height }} · {{ formatSize(row.fileSize) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="水印" width="100">
            <template #default="{ row }">
              <span v-if="row.watermarkText" class="text-[11px] text-ink-500">{{ row.watermarkText }}</span>
              <span v-else class="text-[11px] text-ink-300">无水印</span>
            </template>
          </el-table-column>

          <el-table-column label="排序" width="80" align="center">
            <template #default="{ row }">{{ row.sortOrder }}</template>
          </el-table-column>

          <el-table-column label="操作" width="280" fixed="right">
            <template #default="{ row }">
              <div class="flex flex-wrap gap-1">
                <el-button text size="small" @click="openImageEdit(row)">
                  <el-icon><EditPen /></el-icon>
                  编辑
                </el-button>
                <el-button text size="small" @click="openWatermark(row)">
                  <el-icon><Brush /></el-icon>
                  水印
                </el-button>
                <el-button
                  v-if="row.id !== activePack.coverImageId"
                  text
                  size="small"
                  @click="setCover(row)"
                >
                  <el-icon><Star /></el-icon>
                  封面
                </el-button>
                <el-button text size="small" type="danger" @click="removeImage(row)">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="uploadingCount > 0" class="text-xs text-ink-400">
          上传完成后会自动刷新表情列表。
        </div>
      </div>
    </el-dialog>

    <!-- 表情字段编辑 -->
    <el-dialog v-model="imageEditDialog" title="编辑表情" width="460px" append-to-body>
      <el-form label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="imageForm.name" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="imageForm.tagsText" placeholder="用逗号分隔" />
        </el-form-item>
        <el-form-item label="排序权重">
          <el-input-number v-model="imageForm.sortOrder" :min="-9999" :max="9999" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="imageEditDialog = false">取消</el-button>
        <el-button type="primary" :loading="savingImage" @click="saveImageEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 水印编辑 -->
    <el-dialog v-model="watermarkDialog" title="表情水印" width="460px" append-to-body>
      <div class="space-y-4">
        <div
          v-if="watermarkImage"
          class="rounded-xl border border-ink-200/70 p-2 text-center dark:border-ink-800"
        >
          <img
            :src="watermarkImage.url"
            :alt="watermarkImage.name"
            class="mx-auto max-h-48 rounded-lg object-contain"
          />
        </div>

        <el-form label-width="80px">
          <el-form-item label="水印文字">
            <el-input v-model="watermarkForm.text" maxlength="120" show-word-limit placeholder="留空则移除水印" />
          </el-form-item>
          <el-form-item label="位置">
            <el-select v-model="watermarkForm.position" class="w-full">
              <el-option
                v-for="position in EMOJI_WATERMARK_POSITIONS"
                :key="position"
                :label="EMOJI_WATERMARK_POSITION_LABELS[position]"
                :value="position"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="不透明度">
            <el-slider v-model="watermarkForm.opacity" :min="0.1" :max="1" :step="0.05" />
          </el-form-item>
        </el-form>

        <p class="rounded-lg bg-ink-50 p-2 text-[11px] leading-relaxed text-ink-400 dark:bg-ink-800/60">
          水印会烧录到对外展示的图片上。系统保留了无水印底图，因此可以随时更换或移除水印。
        </p>
      </div>

      <template #footer>
        <el-button :loading="watermarkSaving" @click="saveWatermark(true)">移除水印</el-button>
        <el-button @click="watermarkDialog = false">取消</el-button>
        <el-button type="primary" :loading="watermarkSaving" @click="saveWatermark(false)">
          应用水印
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
