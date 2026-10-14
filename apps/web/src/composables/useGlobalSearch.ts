import { ref } from 'vue';

const visible = ref(false);

/** 全局搜索弹窗的单例状态，供头部按钮与布局共用。 */
export function useGlobalSearch() {
  const open = (): void => {
    visible.value = true;
  };

  const close = (): void => {
    visible.value = false;
  };

  return { visible, open, close };
}
