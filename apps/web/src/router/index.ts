import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/views/HomeView.vue'),
        meta: { title: '首页' },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/ProfileView.vue'),
        meta: { title: '洛天依介绍' },
      },
      {
        path: 'songs',
        name: 'songs',
        component: () => import('@/views/SongsView.vue'),
        meta: { title: '歌曲库' },
      },
      {
        path: 'songs/:id',
        name: 'song-detail',
        component: () => import('@/views/SongDetailView.vue'),
        meta: { title: '歌曲详情' },
      },
      {
        path: 'links',
        name: 'links',
        component: () => import('@/views/LinksView.vue'),
        meta: { title: '同好导航' },
      },
      {
        path: 'groups',
        name: 'groups',
        component: () => import('@/views/GroupsView.vue'),
        meta: { title: '群聊导航' },
      },
      {
        path: 'emoji',
        name: 'emoji',
        component: () => import('@/views/EmojiPlazaView.vue'),
        meta: { title: '表情广场' },
      },
      {
        path: 'cn',
        name: 'cn',
        component: () => import('@/views/CnPlazaView.vue'),
        meta: { title: '同好广场' },
      },
      {
        path: 'cn/me',
        name: 'cn-mine',
        component: () => import('@/views/CnMineView.vue'),
        meta: { title: '我的个人介绍', requiresAuth: true, loginRoute: 'login' },
      },
      {
        path: 'cn/:id',
        name: 'cn-detail',
        component: () => import('@/views/CnDetailView.vue'),
        meta: { title: '个人介绍' },
      },
      {
        path: 'stats',
        name: 'stats',
        component: () => import('@/views/StatsView.vue'),
        meta: { title: '数据统计' },
      },
    ],
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('@/views/admin/LoginView.vue'),
    meta: { title: '后台登录' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { title: '注册' },
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'admin-dashboard',
        component: () => import('@/views/admin/DashboardView.vue'),
        meta: { title: '控制台', requiresAuth: true },
      },
      {
        path: 'songs',
        name: 'admin-songs',
        component: () => import('@/views/admin/SongsAdminView.vue'),
        meta: { title: '歌曲管理', requiresAuth: true },
      },
      {
        path: 'links',
        name: 'admin-links',
        component: () => import('@/views/admin/LinksAdminView.vue'),
        meta: { title: '外链管理', requiresAuth: true },
      },
      {
        path: 'groups',
        name: 'admin-groups',
        component: () => import('@/views/admin/GroupsAdminView.vue'),
        meta: { title: '群聊管理', requiresAuth: true },
      },
      {
        path: 'emoji',
        name: 'admin-emoji',
        component: () => import('@/views/admin/EmojiAdminView.vue'),
        meta: { title: '表情广场管理', requiresAuth: true },
      },
      {
        path: 'profile',
        name: 'admin-profile',
        component: () => import('@/views/admin/ProfileAdminView.vue'),
        meta: { title: '介绍页管理', requiresAuth: true },
      },
      {
        path: 'song-requests',
        name: 'admin-song-requests',
        component: () => import('@/views/admin/SongRequestsAdminView.vue'),
        meta: { title: '歌曲修改申请', requiresAuth: true },
      },
      {
        path: 'users',
        name: 'admin-users',
        component: () => import('@/views/admin/UsersAdminView.vue'),
        meta: { title: '用户管理', requiresAuth: true },
      },
      {
        path: 'roles',
        name: 'admin-roles',
        component: () => import('@/views/admin/RolesAdminView.vue'),
        meta: { title: '角色与权限', requiresAuth: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '页面不存在' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0, behavior: 'smooth' };
  },
});

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true;

  const loginRoute = (to.meta.loginRoute as string | undefined) ?? 'admin-login';
  const auth = useAuthStore();

  if (!auth.isLoggedIn) {
    return { name: loginRoute, query: { redirect: to.fullPath } };
  }

  const profile = await auth.ensureProfile();
  if (!profile) {
    return { name: loginRoute, query: { redirect: to.fullPath } };
  }

  return true;
});

router.afterEach((to) => {
  const title = to.meta.title as string | undefined;
  document.title = title ? `${title} · 洛天依 Wiki` : '洛天依 Wiki · 虚拟歌手资料库';
});

export default router;
