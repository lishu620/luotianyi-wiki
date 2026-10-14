import { ref } from 'vue';

const STORAGE_KEY = 'lty-theme';
type ThemeMode = 'light' | 'dark';

const mode = ref<ThemeMode>('light');
let initialized = false;

function apply(next: ThemeMode): void {
  mode.value = next;
  document.documentElement.classList.toggle('dark', next === 'dark');
}

export function useTheme() {
  const initTheme = (): void => {
    if (initialized) return;
    initialized = true;

    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

    apply(stored ?? (prefersDark ? 'dark' : 'light'));
  };

  const toggleTheme = (): void => {
    const next: ThemeMode = mode.value === 'dark' ? 'light' : 'dark';
    apply(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const setTheme = (next: ThemeMode): void => {
    apply(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return { mode, initTheme, toggleTheme, setTheme };
}
