<script setup lang="ts">
import { formatNumber } from '@/utils';

interface Props {
  label: string;
  value: number | string;
  icon?: string;
  suffix?: string;
  hint?: string;
  /** 数字是否按 万/亿 缩写 */
  compactValue?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'DataLine',
  suffix: '',
  hint: '',
  compactValue: true,
});

const displayValue = () => {
  if (typeof props.value === 'string') return props.value;
  return props.compactValue ? formatNumber(props.value) : String(props.value);
};
</script>

<template>
  <div class="lty-card lty-card-hover p-5">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs font-medium tracking-wide text-ink-500 uppercase dark:text-ink-400">
          {{ label }}
        </p>

        <p class="mt-2 text-2xl font-bold text-ink-900 dark:text-white">
          {{ displayValue() }}
          <span v-if="suffix" class="ml-1 text-sm font-medium text-ink-400">{{ suffix }}</span>
        </p>

        <p v-if="hint" class="mt-1.5 text-xs text-ink-400">{{ hint }}</p>
      </div>

      <span
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-ink-800 dark:text-brand-300"
      >
        <el-icon :size="20"><component :is="icon" /></el-icon>
      </span>
    </div>
  </div>
</template>
