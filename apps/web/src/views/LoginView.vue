<script setup lang="ts">
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const formRef = ref<FormInstance>();
const submitting = ref(false);
const form = reactive({ username: '', password: '' });

const rules: FormRules = {
  username: [{ required: true, message: '请填写用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请填写密码', trigger: 'blur' }],
};

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    await auth.login({ username: form.username, password: form.password });
    ElMessage.success('登录成功');

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/cn';
    await router.replace(redirect);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="lty-container flex min-h-[70vh] items-center justify-center py-12">
    <div class="lty-card w-full max-w-md p-7">
      <h1 class="text-xl font-bold text-ink-900 dark:text-white">登录</h1>
      <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">
        登录后可制作自己的 CN 扩列条、对同好心動
      </p>

      <el-form ref="formRef" :model="form" :rules="rules" class="mt-6" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="用户名" maxlength="50" />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="密码" />
        </el-form-item>

        <el-button type="primary" class="w-full" :loading="submitting" @click="submit">登录</el-button>
      </el-form>

      <p class="mt-5 text-center text-sm text-ink-500 dark:text-ink-400">
        还没有账号？
        <router-link
          :to="{ path: '/register', query: route.query }"
          class="font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          去注册
        </router-link>
      </p>
    </div>
  </div>
</template>
