<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  title: string;
  subtitle?: string | null;
  icon?: string | null;
  align?: 'left' | 'center';
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: null,
  icon: null,
  align: 'left',
});

const wrapperClass = computed(() =>
  props.align === 'center' ? 'items-center text-center' : 'items-start text-left',
);
</script>

<template>
  <div class="flex flex-col gap-2" :class="wrapperClass">
    <div class="flex items-center gap-3">
      <span
        v-if="icon"
        class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-glow"
      >
        <el-icon :size="20"><component :is="icon" /></el-icon>
      </span>
      <h2 class="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl dark:text-white">
        {{ title }}
      </h2>
    </div>

    <p v-if="subtitle" class="max-w-2xl text-sm text-ink-500 sm:text-base dark:text-ink-400">
      {{ subtitle }}
    </p>

    <slot />
  </div>
</template>
