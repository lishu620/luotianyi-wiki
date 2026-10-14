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

const form = reactive({ username: '', password: '', confirm: '' });

const rules: FormRules = {
  username: [
    { required: true, message: '请填写用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名 3~50 位', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请填写密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
  confirm: [
    {
      validator: (_rule, value: string, callback) => {
        if (value !== form.password) callback(new Error('两次输入的密码不一致'));
        else callback();
      },
      trigger: 'blur',
    },
  ],
};

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    await auth.register({ username: form.username, password: form.password });
    ElMessage.success('注册成功，欢迎加入！');

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/cn/me';
    await router.replace(redirect);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="lty-container flex min-h-[70vh] items-center justify-center py-12">
    <div class="lty-card w-full max-w-md p-7">
      <h1 class="text-xl font-bold text-ink-900 dark:text-white">注册账号</h1>
      <p class="mt-1 text-sm text-ink-500 dark:text-ink-400">
        注册后即可制作自己的 CN 扩列条、在广场寻找同好
      </p>

      <el-form ref="formRef" :model="form" :rules="rules" class="mt-6" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="3~50 位" maxlength="50" />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirm">
          <el-input v-model="form.confirm" type="password" show-password placeholder="再次输入密码" />
        </el-form-item>

        <el-button type="primary" class="w-full" :loading="submitting" @click="submit">
          注册并登录
        </el-button>
      </el-form>

      <p class="mt-5 text-center text-sm text-ink-500 dark:text-ink-400">
        已有账号？
        <router-link
          :to="{ path: '/login', query: route.query }"
          class="font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          去登录
        </router-link>
      </p>
    </div>
  </div>
</template>
