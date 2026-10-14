<script setup lang="ts">
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive({ username: '', password: '' });

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
};

onMounted(() => {
  // 已登录时直接进入控制台
  if (auth.isLoggedIn) {
    void router.replace({ name: 'admin-dashboard' });
  }
});

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    await auth.login({ username: form.username.trim(), password: form.password });
    ElMessage.success('登录成功');

    const redirect = route.query.redirect;
    await router.replace(typeof redirect === 'string' && redirect ? redirect : { name: 'admin-dashboard' });
  } catch {
    // 错误提示已由 http 拦截器统一处理
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
    <div
      class="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-brand-100 via-white to-violet-100 dark:from-ink-900 dark:via-ink-950 dark:to-ink-900"
    />
    <div
      class="pointer-events-none absolute -top-24 left-1/2 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-brand-300/40 blur-3xl dark:bg-brand-700/20"
    />

    <div class="lty-card w-full max-w-md p-8">
      <div class="flex flex-col items-center text-center">
        <span
          class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-glow"
        >
          <el-icon :size="26"><Headset /></el-icon>
        </span>

        <h1 class="mt-4 text-xl font-bold text-ink-900 dark:text-white">洛天依 Wiki 管理后台</h1>
        <p class="mt-1 text-xs text-ink-500 dark:text-ink-400">
          默认账号见后端 .env 中的 ADMIN_USERNAME / ADMIN_PASSWORD
        </p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="mt-8"
        @keyup.enter="submit"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" size="large" placeholder="admin" autocomplete="username">
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            size="large"
            show-password
            placeholder="••••••••"
            autocomplete="current-password"
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-button
          type="primary"
          size="large"
          class="mt-2 w-full"
          :loading="submitting"
          @click="submit"
        >
          登录
        </el-button>
      </el-form>

      <div class="mt-6 text-center">
        <el-button text size="small" @click="router.push({ name: 'home' })">
          <el-icon class="mr-1"><Back /></el-icon>
          返回前台
        </el-button>
      </div>
    </div>
  </div>
</template>
