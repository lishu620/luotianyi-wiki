<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessageBox } from 'element-plus';

import { useTheme } from '@/composables/useTheme';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const { mode, toggleTheme, initTheme } = useTheme();

initTheme();

const collapsed = ref(false);

const menuItems = [
  { name: 'admin-dashboard', label: '控制台', icon: 'Odometer', path: '/admin', perms: [] as string[] },
  {
    name: 'admin-songs',
    label: '歌曲管理',
    icon: 'Headset',
    path: '/admin/songs',
    perms: ['song.create', 'song.update.own', 'song.update.any', 'song.delete', 'song.approve'],
  },
  {
    name: 'admin-song-requests',
    label: '修改申请',
    icon: 'EditPen',
    path: '/admin/song-requests',
    perms: ['song.create', 'song.update.own', 'song.update.any', 'song.approve'],
  },
  {
    name: 'admin-links',
    label: '外链管理',
    icon: 'Connection',
    path: '/admin/links',
    perms: ['link.create', 'link.update.own', 'link.update.any', 'link.delete'],
  },
  {
    name: 'admin-groups',
    label: '群聊管理',
    icon: 'ChatDotRound',
    path: '/admin/groups',
    perms: ['group.create', 'group.update.own', 'group.update.any', 'group.delete'],
  },
  {
    name: 'admin-profile',
    label: '介绍页管理',
    icon: 'Document',
    path: '/admin/profile',
    perms: ['profile.update'],
  },
  {
    name: 'admin-users',
    label: '用户管理',
    icon: 'UserFilled',
    path: '/admin/users',
    perms: ['user.manage'],
  },
  {
    name: 'admin-roles',
    label: '角色权限',
    icon: 'Key',
    path: '/admin/roles',
    perms: ['role.manage'],
  },
];

const visibleMenuItems = computed(() => menuItems.filter((item) => auth.can(...item.perms)));

const activePath = computed(() => route.path);
const currentTitle = computed(() => (route.meta.title as string | undefined) ?? '管理后台');

async function handleLogout(): Promise<void> {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '退出登录', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }

  auth.logout();
  await router.replace({ name: 'admin-login' });
}
</script>

<template>
  <div class="flex min-h-screen bg-ink-100 dark:bg-ink-950">
    <!-- 侧边栏 -->
    <aside
      class="sticky top-0 flex h-screen shrink-0 flex-col border-r border-ink-200/70 bg-white transition-all duration-300 dark:border-ink-800 dark:bg-ink-900"
      :class="collapsed ? 'w-[76px]' : 'w-60'"
    >
      <div class="flex h-16 items-center gap-2.5 border-b border-ink-200/70 px-4 dark:border-ink-800">
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white"
        >
          <el-icon :size="18"><Headset /></el-icon>
        </span>
        <span v-if="!collapsed" class="flex flex-col leading-none">
          <span class="text-sm font-bold text-ink-900 dark:text-white">洛天依 Wiki</span>
          <span class="mt-0.5 text-[10px] tracking-widest text-ink-400 uppercase">Admin</span>
        </span>
      </div>

      <el-menu
        :default-active="activePath"
        :collapse="collapsed"
        :collapse-transition="false"
        router
        class="flex-1 border-r-0 py-2"
      >
        <el-menu-item v-for="item in visibleMenuItems" :key="item.name" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.label }}</template>
        </el-menu-item>
      </el-menu>

      <div class="border-t border-ink-200/70 p-3 dark:border-ink-800">
        <el-button text class="w-full !justify-start" @click="$router.push({ name: 'home' })">
          <el-icon class="mr-2"><Back /></el-icon>
          <span v-if="!collapsed">返回前台</span>
        </el-button>
      </div>
    </aside>

    <!-- 主区域 -->
    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-200/70 bg-white/85 px-4 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-900/85"
      >
        <el-button text circle @click="collapsed = !collapsed">
          <el-icon :size="18">
            <component :is="collapsed ? 'Expand' : 'Fold'" />
          </el-icon>
        </el-button>

        <h1 class="text-base font-semibold text-ink-900 dark:text-white">{{ currentTitle }}</h1>

        <div class="ml-auto flex items-center gap-2">
          <el-button text circle @click="toggleTheme">
            <el-icon :size="18"><component :is="mode === 'dark' ? 'Sunny' : 'Moon'" /></el-icon>
          </el-button>

          <el-dropdown trigger="click">
            <span class="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-ink-100 dark:hover:bg-ink-800">
              <el-avatar :size="28" class="!bg-brand-500">
                {{ (auth.user?.username ?? 'A').slice(0, 1).toUpperCase() }}
              </el-avatar>
              <span class="hidden text-sm font-medium text-ink-700 sm:inline dark:text-ink-200">
                {{ auth.user?.username ?? '管理员' }}
              </span>
              <el-icon :size="12"><ArrowDown /></el-icon>
            </span>

            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  <el-icon><UserFilled /></el-icon>
                  {{ auth.roleLabel }}
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="min-w-0 flex-1 p-4 sm:p-6">
        <router-view v-slot="{ Component, route: currentRoute }">
          <transition name="page" mode="out-in">
            <component :is="Component" :key="currentRoute.path" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>
