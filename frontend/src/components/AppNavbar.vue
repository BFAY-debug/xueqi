<template>
  <nav class="navbar" :class="{ scrolled }">
    <div class="navbar-inner container">
      <router-link to="/" class="logo">
        <span class="logo-text">学栖</span>
        <span class="logo-sub">栖心之所</span>
      </router-link>

      <div class="nav-links">
        <router-link to="/">首页</router-link>
        <router-link to="/study-rooms">书院</router-link>
        <router-link to="/seat-booking">占座</router-link>
        <router-link to="/books">书海</router-link>
        <router-link to="/community">论道</router-link>
        <router-link to="/leaderboard">金榜</router-link>
      </div>

      <div class="nav-right">
        <template v-if="userStore.isLoggedIn">
          <el-badge :value="userStore.unreadCount || undefined" :hidden="!userStore.unreadCount" class="notification-badge">
            <el-icon :size="20" class="bell-icon" @click="$router.push('/profile?tab=notifications')"><Bell /></el-icon>
          </el-badge>

          <el-dropdown trigger="click">
            <div class="user-info">
              <img v-if="userStore.user?.avatar_url" :src="userStore.user.avatar_url" class="avatar" />
              <div v-else class="avatar-placeholder">{{ userStore.user?.nickname?.[0] || '学' }}</div>
              <span class="nickname">{{ userStore.user?.nickname }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="$router.push('/profile')">我的书斋</el-dropdown-item>
                <el-dropdown-item v-if="userStore.isAdmin" @click="$router.push('/admin')">管理后台</el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
        <template v-else>
          <router-link to="/login" class="btn-outline btn-sm">登录</router-link>
          <router-link to="/register" class="btn-primary btn-sm">注册</router-link>
        </template>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Bell } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const router = useRouter()
const scrolled = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 20
}

onMounted(() => {
  window.addEventListener('scroll', onScroll)
  userStore.fetchUnreadCount()
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))

function handleLogout() {
  userStore.logout()
  router.push('/')
}
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--nav-height);
  z-index: 1000;
  transition: all 0.3s ease;
  background: rgba(245, 240, 232, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid transparent;
}

.navbar.scrolled {
  border-bottom-color: var(--color-border-light);
  box-shadow: 0 2px 12px rgba(44, 44, 44, 0.06);
}

.navbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.logo {
  display: flex;
  align-items: baseline;
  gap: 8px;
  text-decoration: none;
  color: var(--color-text-primary);
}

.logo-text {
  font-family: var(--font-title);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-accent);
}

.logo-sub {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.nav-links {
  display: flex;
  gap: 28px;
}

.nav-links a {
  text-decoration: none;
  color: var(--color-text-primary);
  font-size: 0.95rem;
  transition: color 0.2s;
  position: relative;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  color: var(--color-accent);
}

.nav-links a.router-link-active::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 2px;
  background: var(--color-accent);
  border-radius: 1px;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.notification-badge {
  cursor: pointer;
}

.bell-icon {
  color: var(--color-text-secondary);
  transition: color 0.2s;
}

.bell-icon:hover {
  color: var(--color-accent);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--color-border);
}

.avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-family: var(--font-title);
}

.nickname {
  font-size: 0.9rem;
  color: var(--color-text-primary);
}

.btn-sm {
  padding: 6px 16px;
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .nav-links { gap: 16px; }
  .logo-sub { display: none; }
}
</style>
