<script setup lang="ts">
interface Props {
  icon?: string;
  title: string;
  description?: string;
}

withDefaults(defineProps<Props>(), {
  icon: 'Box',
  description: '',
});
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-14 text-center">
    <div
      class="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-ink-900 dark:text-brand-400"
    >
      <el-icon :size="28"><component :is="icon" /></el-icon>
    </div>

    <p class="text-base font-semibold text-ink-700 dark:text-ink-200">{{ title }}</p>

    <p v-if="description" class="max-w-md text-sm text-ink-500 dark:text-ink-400">
      {{ description }}
    </p>

    <slot />
  </div>
</template>
