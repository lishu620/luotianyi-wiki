<script setup lang="ts">
import {
  CN_CARD_STYLES,
  CN_CARD_STYLE_LABELS,
  CN_GENDERS,
  CN_GENDER_LABELS,
  CN_PURPOSES,
  CN_PURPOSE_HINTS,
  CN_PURPOSE_LABELS,
  type CnCardStyle,
  type CnContactKey,
  type CnGender,
  type CnProfile,
  type CnProfilePayload,
  type CnPurpose,
} from '@luotianyi/shared';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { cnApi } from '@/api';
import CnCard from '@/components/CnCard.vue';
import { useAuthStore } from '@/stores/auth';
import { cnCardSwatch } from '@/utils/cnCardThemes';
import { exportCnCard } from '@/utils/exportCnCard';

const router = useRouter();
const auth = useAuthStore();

const loading = ref(true);
const saving = ref(false);
const exporting = ref(false);
const syncingAvatar = ref(false);
const formRef = ref<FormInstance>();
const saved = ref<CnProfile | null>(null);

const form = reactive({
  cn: '',
  avatarUrl: '',
  bilibiliUid: '',
  cardStyle: 'classic' as CnCardStyle,
  gender: 'secret' as CnGender,
  age: undefined as number | undefined,
  region: '',
  personality: '',
  declaration: '',
  interests: [] as string[],
  lookingFor: [] as string[],
  purpose: 'display' as CnPurpose,
  contacts: { qq: '', wechat: '', bilibili: '', weibo: '', email: '' },
  status: 'visible' as 'visible' | 'hidden',
});

const rules: FormRules = {
  cn: [{ required: true, message: '请填写圈名 CN', trigger: 'blur' }],
};

/** 预览用的临时对象 */
function previewProfile(): CnProfile {
  return {
    id: saved.value?.id ?? 'preview',
    userId: auth.user?.id ?? '',
    authorUsername: auth.user?.username ?? null,
    cn: form.cn || '你的 CN',
    avatarUrl: form.avatarUrl || null,
    bilibiliUid: form.bilibiliUid || null,
    cardStyle: form.cardStyle,
    gender: form.gender,
    age: form.age ?? null,
    region: form.region || null,
    personality: form.personality || null,
    declaration: form.declaration || null,
    interests: form.interests,
    lookingFor: form.lookingFor,
    purpose: form.purpose,
    contacts: Object.fromEntries(
      Object.entries(form.contacts).filter(([, value]) => value),
    ) as Partial<Record<CnContactKey, string>>,
    contactsVisible: true,
    status: form.status,
    viewCount: saved.value?.viewCount ?? 0,
    likeCount: saved.value?.likeCount ?? 0,
    likedByMe: false,
    mutualWithMe: false,
    createdAt: saved.value?.createdAt ?? new Date().toISOString(),
    updatedAt: saved.value?.updatedAt ?? new Date().toISOString(),
  };
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const profile = await cnApi.mine();
    saved.value = profile;

    if (profile) {      Object.assign(form, {
        cn: profile.cn,
        avatarUrl: profile.avatarUrl ?? '',
        bilibiliUid: profile.bilibiliUid ?? '',
        cardStyle: profile.cardStyle,
        gender: profile.gender,
        age: profile.age ?? undefined,
        region: profile.region ?? '',
        personality: profile.personality ?? '',
        declaration: profile.declaration ?? '',
        interests: [...profile.interests],
        lookingFor: [...profile.lookingFor],
        purpose: profile.purpose,
        contacts: {
          qq: profile.contacts.qq ?? '',
          wechat: profile.contacts.wechat ?? '',
          bilibili: profile.contacts.bilibili ?? '',
          weibo: profile.contacts.weibo ?? '',
          email: profile.contacts.email ?? '',
        },
        status: profile.status,
      });
    }
  } catch {
    auth.clearSession();
    ElMessage.warning('登录状态已失效，请重新登录');
    await router.replace({ path: '/login', query: { redirect: '/cn/me' } });
  } finally {
    loading.value = false;
  }
}

async function save(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  saving.value = true;
  try {
    const payload: CnProfilePayload = {
      cn: form.cn,
      avatarUrl: form.avatarUrl || null,
      bilibiliUid: form.bilibiliUid.trim() || null,
      cardStyle: form.cardStyle,
      gender: form.gender,
      age: form.age ?? null,
      region: form.region || null,
      personality: form.personality || null,
      declaration: form.declaration || null,
      interests: form.interests,
      lookingFor: form.lookingFor,
      purpose: form.purpose,
      contacts: Object.fromEntries(
        Object.entries(form.contacts).filter(([, value]) => value),
      ) as Partial<Record<CnContactKey, string>>,
      status: form.status,
    };

    saved.value = await cnApi.saveMine(payload);
    ElMessage.success('已保存');
  } finally {
    saving.value = false;
  }
}

/** 用 B 站 UID / 主页链接一键同步头像 */
async function syncBilibili(): Promise<void> {
  const uid = form.bilibiliUid.trim();

  if (!uid) {
    ElMessage.warning('请先填写 B 站 UID 或主页链接');
    return;
  }

  syncingAvatar.value = true;
  try {
    const info = await cnApi.bilibiliAvatar(uid);
    form.bilibiliUid = info.mid;
    form.avatarUrl = info.avatarUrl;
    ElMessage.success(info.name ? `已同步「${info.name}」的 B 站头像` : '已同步 B 站头像');
  } catch {
    // 错误提示已由请求层统一弹出
  } finally {
    syncingAvatar.value = false;
  }
}

async function remove(): Promise<void> {
  try {
    await ElMessageBox.confirm('确定删除你的个人介绍吗？删除后广场上不再展示。', '删除个人介绍', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  await cnApi.removeMine();
  ElMessage.success('已删除');
  await router.push('/cn');
}

async function doExport(): Promise<void> {
  exporting.value = true;
  try {
    await exportCnCard(saved.value ?? previewProfile());
    ElMessage.success('个人介绍卡已导出为图片');
  } finally {
    exporting.value = false;
  }
}

onMounted(() => {
  if (!auth.isLoggedIn) {
    void router.replace({ path: '/login', query: { redirect: '/cn/me' } });
    return;
  }
  void load();
});
</script>

<template>
  <div class="lty-container py-8">
    <h1 class="text-2xl font-bold text-ink-900 dark:text-white">我的个人介绍</h1>
    <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">
      先做好个人介绍，再决定要不要扩列；选择「想扩列」后，联系方式只有「互相心动」的人才能看到
    </p>

    <div v-loading="loading" class="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
      <!-- 表单 -->
      <div class="lty-card p-5 sm:p-6">
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
          <div class="grid gap-4 sm:grid-cols-2">
            <el-form-item label="圈名 CN" prop="cn" class="sm:col-span-1">
              <el-input v-model="form.cn" placeholder="你的圈名" maxlength="60" />
            </el-form-item>

            <el-form-item label="性别">
              <el-select v-model="form.gender" class="w-full">
                <el-option
                  v-for="gender in CN_GENDERS"
                  :key="gender"
                  :label="CN_GENDER_LABELS[gender]"
                  :value="gender"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="年龄">
              <el-input-number v-model="form.age" :min="1" :max="120" class="w-full" />
            </el-form-item>

            <el-form-item label="地区">
              <el-input v-model="form.region" placeholder="如：广东 广州" maxlength="60" />
            </el-form-item>
          </div>

          <el-form-item label="头像">
            <div class="flex w-full flex-wrap items-start gap-3">
              <span
                class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-ink-100 text-sm text-ink-400 ring-2 ring-ink-200 dark:bg-ink-800 dark:ring-ink-700"
              >
                <img
                  v-if="form.avatarUrl"
                  :src="form.avatarUrl"
                  alt="头像预览"
                  class="h-full w-full object-cover"
                  referrerpolicy="no-referrer"
                />
                <span v-else>{{ form.cn.slice(0, 1) || '头像' }}</span>
              </span>

              <div class="flex min-w-[14rem] flex-1 flex-col gap-2">
                <div class="flex flex-col gap-2 sm:flex-row">
                  <el-input
                    v-model="form.bilibiliUid"
                    placeholder="B 站 UID 或主页链接，如 123456"
                    maxlength="120"
                    @keyup.enter="syncBilibili"
                  />
                  <el-button
                    type="primary"
                    plain
                    :loading="syncingAvatar"
                    class="sm:!w-32"
                    @click="syncBilibili"
                  >
                    <el-icon class="mr-1"><Refresh /></el-icon>
                    用 B 站头像
                  </el-button>
                </div>
                <el-input
                  v-model="form.avatarUrl"
                  placeholder="头像地址（留空时保存会自动拉取 B 站头像）"
                  maxlength="600"
                />
                <p class="text-xs text-ink-400">
                  推荐直接填 B 站 UID，头像会自动同步，无需手动找图链。
                </p>
              </div>
            </div>
          </el-form-item>

          <el-form-item label="卡面款式">
            <div class="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                v-for="style in CN_CARD_STYLES"
                :key="style"
                type="button"
                class="flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition"
                :class="
                  form.cardStyle === style
                    ? 'border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-500/10 dark:text-brand-200'
                    : 'border-ink-200 hover:border-brand-300 dark:border-ink-700 dark:hover:border-brand-600'
                "
                @click="form.cardStyle = style"
              >
                <span
                  class="h-6 w-6 shrink-0 rounded-full ring-1 ring-black/10"
                  :style="{ background: cnCardSwatch(style) }"
                />
                <span class="font-medium">{{ CN_CARD_STYLE_LABELS[style] }}</span>
              </button>
            </div>
          </el-form-item>

          <el-form-item label="性格标签">
            <el-input v-model="form.personality" placeholder="如：社恐但话多" maxlength="200" />
          </el-form-item>

          <el-form-item label="感兴趣的（兴趣标签）">
            <el-select
              v-model="form.interests"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="回车添加，如：洛天依 / 中V / 音游 / 画画"
              class="w-full"
            />
          </el-form-item>

          <el-form-item v-if="form.purpose === 'friends'" label="想找的搭子">
            <el-select
              v-model="form.lookingFor"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="回车添加，如：一起听歌 / 语C / 约稿"
              class="w-full"
            />
          </el-form-item>

          <el-form-item label="扩列宣言">
            <el-input
              v-model="form.declaration"
              type="textarea"
              :rows="3"
              maxlength="1000"
              show-word-limit
              placeholder="介绍一下自己，想认识什么样的朋友～"
            />
          </el-form-item>

          <p class="mb-2 text-sm font-medium text-ink-600 dark:text-ink-300">
            联系方式（仅互相心动后可见）
          </p>
          <div class="grid gap-4 sm:grid-cols-2">
            <el-form-item label="QQ">
              <el-input v-model="form.contacts.qq" maxlength="80" />
            </el-form-item>
            <el-form-item label="微信">
              <el-input v-model="form.contacts.wechat" maxlength="80" />
            </el-form-item>
            <el-form-item label="B 站">
              <el-input v-model="form.contacts.bilibili" maxlength="120" />
            </el-form-item>
            <el-form-item label="微博">
              <el-input v-model="form.contacts.weibo" maxlength="120" />
            </el-form-item>
            <el-form-item label="邮箱" class="sm:col-span-2">
              <el-input v-model="form.contacts.email" maxlength="120" />
            </el-form-item>
          </div>

          <el-form-item label="用途">
            <el-radio-group v-model="form.purpose">
              <el-radio v-for="purpose in CN_PURPOSES" :key="purpose" :value="purpose">
                {{ CN_PURPOSE_LABELS[purpose] }}
              </el-radio>
            </el-radio-group>
            <p class="mt-1 w-full text-xs text-ink-400">{{ CN_PURPOSE_HINTS[form.purpose] }}</p>
          </el-form-item>

          <el-form-item label="展示状态">
            <el-radio-group v-model="form.status">
              <el-radio value="visible">展示中</el-radio>
              <el-radio value="hidden">隐藏（不出现在广场）</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>

        <div class="flex flex-wrap gap-2">
          <el-button type="primary" :loading="saving" @click="save">保存</el-button>
          <el-button :loading="exporting" @click="doExport">
            <el-icon class="mr-1"><Download /></el-icon>
            导出为图片
          </el-button>
          <el-button v-if="saved" type="danger" plain @click="remove">删除扩列条</el-button>
        </div>
      </div>

      <!-- 实时预览 -->
      <div class="self-start lg:sticky lg:top-6">
        <p class="mb-2 text-sm text-ink-500 dark:text-ink-400">实时预览</p>
        <CnCard :profile="previewProfile()" />
      </div>
    </div>
  </div>
</template>
