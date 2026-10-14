import { createPinia } from 'pinia';
import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import './styles/main.css';

import App from './App.vue';
import { onUnauthorized } from './api/http';
import router from './router';
import { useAuthStore } from './stores/auth';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(ElementPlus, { size: 'default' });

for (const [name, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(name, component);
}

// 令牌失效时统一跳转登录页（避免 api 层直接依赖 router 造成循环引用）
onUnauthorized(() => {
  const auth = useAuthStore(pinia);
  auth.clearSession();

  const current = router.currentRoute.value;
  if (current.name === 'admin-login') return;

  void router.replace({ name: 'admin-login', query: { redirect: current.fullPath } });
});

app.mount('#app');
