<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  content?: string | null;
  html?: string;
}

const props = defineProps<Props>();

const rendered = computed(() => props.html ?? '');
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div v-if="html" class="lty-prose" v-html="rendered" />
  <div v-else class="lty-prose whitespace-pre-line">{{ content }}</div>
</template>
