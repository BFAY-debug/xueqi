<template>
  <nav class="navbar" :class="{ scrolled }">
    <div class="navbar-inner container">
      <router-link to="/" class="logo">
        <span class="logo-text">学栖</span>
        <span class="logo-sub">栖心之所</span>
      </router-link>

      <!-- Desktop nav links -->
      <div class="nav-links">
        <router-link to="/">首页</router-link>
        <router-link to="/study-rooms">书院</router-link>
        <router-link to="/seat-booking">占座</router-link>
        <router-link to="/messages" class="nav-msg-link">消息<span v-if="msgUnreadCount" class="nav-msg-badge">{{ msgUnreadCount }}</span></router-link>
        <router-link to="/community">论道</router-link>
        <router-link to="/leaderboard">金榜</router-link>
      </div>

      <div class="nav-right">
        <!-- Theme toggle -->
        <button class="theme-toggle" @click="toggleTheme" :title="isDark ? '切换亮色' : '切换暗色'">
          <svg v-if="isDark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>

        <template v-if="userStore.isLoggedIn">
          <!-- Notification Bell -->
          <div class="nav-icon-btn" @click="$router.push('/profile?tab=notifications')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span v-if="userStore.unreadCount" class="notif-dot"></span>
          </div>

          <!-- User Avatar Dropdown -->
          <div class="avatar-dropdown" ref="dropdownRef">
            <div class="avatar-trigger" @click="dropdownOpen = !dropdownOpen">
              <img v-if="userStore.user?.avatar_url" :src="userStore.user.avatar_url" class="avatar" />
              <div v-else class="avatar-placeholder">{{ userStore.user?.username?.[0] || '学' }}</div>
            </div>

            <Transition name="dropdown">
              <div v-if="dropdownOpen" class="dropdown-panel">
                <!-- User Info Header -->
                <div class="dd-header">
                  <img v-if="userStore.user?.avatar_url" :src="userStore.user.avatar_url" class="dd-avatar" />
                  <div v-else class="dd-avatar dd-avatar-placeholder">{{ userStore.user?.username?.[0] || '学' }}</div>
                  <div class="dd-user-info">
                    <div class="dd-nickname">{{ userStore.user?.username }}</div>
                    <div class="dd-username">@{{ userStore.user?.accountId || userStore.user?.username }}</div>
                  </div>
                </div>

                <div class="dd-divider"></div>

                <!-- Menu Items -->
                <div class="dd-menu">
                  <router-link to="/profile" class="dd-item" @click="dropdownOpen = false">
                    <svg class="dd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span>我的书斋</span>
                  </router-link>
                  <router-link to="/profile?tab=stats" class="dd-item" @click="dropdownOpen = false">
                    <svg class="dd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                    <span>修习数据</span>
                  </router-link>
                  <router-link to="/profile?tab=notifications" class="dd-item" @click="dropdownOpen = false">
                    <svg class="dd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    <span>通知</span>
                    <span v-if="userStore.unreadCount" class="dd-badge">{{ userStore.unreadCount }}</span>
                  </router-link>
                </div>

                <div class="dd-divider"></div>

                <div class="dd-menu">
                  <router-link to="/community" class="dd-item" @click="dropdownOpen = false">
                    <svg class="dd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    <span>知识广场</span>
                  </router-link>
                  <router-link to="/messages" class="dd-item" @click="dropdownOpen = false">
                    <svg class="dd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <span>我的消息</span>
                  </router-link>
                  <router-link to="/leaderboard" class="dd-item" @click="dropdownOpen = false">
                    <svg class="dd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <span>金榜排名</span>
                  </router-link>
                </div>

                <!-- Admin (if applicable) -->
                <template v-if="userStore.isAdmin">
                  <div class="dd-divider"></div>
                  <div class="dd-menu">
                    <router-link to="/admin" class="dd-item dd-item-accent" @click="dropdownOpen = false">
                      <svg class="dd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      <span>管理后台</span>
                    </router-link>
                  </div>
                </template>

                <div class="dd-divider"></div>

                <!-- Logout -->
                <div class="dd-menu">
                  <button class="dd-item dd-item-danger" @click="handleLogout">
                    <svg class="dd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    <span>退出登录</span>
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </template>
        <template v-else>
          <router-link to="/login" class="btn-outline btn-sm nav-btn-desktop">登录</router-link>
          <router-link to="/register" class="btn-primary btn-sm nav-btn-desktop">注册</router-link>
        </template>

        <!-- Hamburger button (mobile only) -->
        <button class="hamburger" @click="mobileMenuOpen = !mobileMenuOpen" :class="{ active: mobileMenuOpen }">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>

    <!-- Mobile slide-out menu -->
    <Transition name="mobile-menu">
      <div v-if="mobileMenuOpen" class="mobile-overlay" @click="mobileMenuOpen = false">
        <div class="mobile-drawer" @click.stop>
          <div class="mobile-nav-links">
            <router-link to="/" @click="mobileMenuOpen = false">首页</router-link>
            <router-link to="/study-rooms" @click="mobileMenuOpen = false">书院</router-link>
            <router-link to="/seat-booking" @click="mobileMenuOpen = false">占座</router-link>
            <router-link to="/messages" @click="mobileMenuOpen = false">消息</router-link>
            <router-link to="/community" @click="mobileMenuOpen = false">论道</router-link>
            <router-link to="/leaderboard" @click="mobileMenuOpen = false">金榜</router-link>
          </div>
          <div class="mobile-divider"></div>
          <div v-if="!userStore.isLoggedIn" class="mobile-auth">
            <router-link to="/login" class="btn-outline" @click="mobileMenuOpen = false">登录</router-link>
            <router-link to="/register" class="btn-primary" @click="mobileMenuOpen = false">注册</router-link>
          </div>
        </div>
      </div>
    </Transition>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useMessageStore } from '@/stores/message'
import { useFriendStore } from '@/stores/friend'

const userStore = useUserStore()
const messageStore = useMessageStore()
const friendStore = useFriendStore()
const router = useRouter()
const route = useRoute()
const scrolled = ref(false)
const dropdownOpen = ref(false)
const dropdownRef = ref(null)
const mobileMenuOpen = ref(false)
const isDark = ref(false)
const msgUnreadCount = computed(() => messageStore.unreadTotal + friendStore.unreadRequestCount)

// Theme toggle
function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

function initTheme() {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark') {
    isDark.value = true
    document.documentElement.setAttribute('data-theme', 'dark')
  }
}

// Close mobile menu on route change
watch(() => route.path, () => {
  mobileMenuOpen.value = false
  dropdownOpen.value = false
})

function onScroll() {
  scrolled.value = window.scrollY > 20
}

function onClickOutside(e) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    dropdownOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('scroll', onScroll)
  document.addEventListener('click', onClickOutside)
  userStore.fetchUnreadCount()
  initTheme()
  if (userStore.isLoggedIn) {
    messageStore.fetchUnreadCount()
    friendStore.fetchUnreadRequestCount()
  }
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('click', onClickOutside)
})

function handleLogout() {
  dropdownOpen.value = false
  mobileMenuOpen.value = false
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
  font-size: 1.05rem;
  font-weight: 500;
  transition: color 0.2s;
  position: relative;
}

.nav-links a:hover,
.nav-links a.router-link-exact-active {
  color: var(--color-accent);
  font-weight: 600;
}

.nav-links a.router-link-exact-active::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  background: var(--color-accent);
  border-radius: 2px;
}

.nav-msg-link { display: inline-flex; align-items: center; gap: 4px; }
.nav-msg-badge {
  min-width: 16px; height: 16px; padding: 0 4px;
  border-radius: 8px; background: var(--color-accent); color: #fff;
  font-size: 0.65rem; font-weight: 600;
  display: inline-flex; align-items: center; justify-content: center;
  line-height: 1;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Theme toggle */
.theme-toggle {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s;
}
.theme-toggle:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

/* Notification icon button */
.nav-icon-btn {
  position: relative;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 4px;
  transition: color 0.2s;
}
.nav-icon-btn:hover { color: var(--color-accent); }
.notif-dot {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  background: var(--color-accent);
  border-radius: 50%;
  border: 2px solid var(--color-bg-primary);
}

/* Avatar & Dropdown */
.avatar-dropdown {
  position: relative;
}

.avatar-trigger {
  cursor: pointer;
  padding: 2px;
  border-radius: 50%;
  transition: box-shadow 0.2s;
}
.avatar-trigger:hover {
  box-shadow: 0 0 0 2px var(--color-accent-light);
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

/* Dropdown Panel */
.dropdown-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: -8px;
  width: 260px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  box-shadow: 0 8px 32px rgba(44, 44, 44, 0.12), 0 2px 8px rgba(44, 44, 44, 0.06);
  z-index: 2000;
  overflow: hidden;
}

.dd-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
}
.dd-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--color-border);
  flex-shrink: 0;
}
.dd-avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent);
  color: #fff;
  font-size: 1rem;
  font-family: var(--font-title);
}
.dd-user-info { min-width: 0; }
.dd-nickname {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dd-username {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.dd-divider {
  height: 1px;
  background: var(--color-border-light);
  margin: 0 8px;
}

.dd-menu {
  padding: 4px 0;
}
.dd-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 16px;
  font-size: 0.875rem;
  color: var(--color-text-primary);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-body);
  transition: background 0.15s;
}
.dd-item:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  text-decoration: none;
}
.dd-item-accent {
  color: var(--color-accent);
}
.dd-item-accent:hover {
  color: var(--color-accent-hover);
}
.dd-item-danger {
  color: var(--color-text-secondary);
}
.dd-item-danger:hover {
  color: #c0392b;
}
.dd-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.dd-badge {
  margin-left: auto;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--color-accent);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Dropdown transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Hamburger */
.hamburger {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  z-index: 1001;
}
.hamburger span {
  display: block;
  width: 22px;
  height: 2px;
  background: var(--color-text-primary);
  border-radius: 1px;
  transition: all 0.3s;
}
.hamburger.active span:nth-child(1) {
  transform: rotate(45deg) translate(5px, 5px);
}
.hamburger.active span:nth-child(2) {
  opacity: 0;
}
.hamburger.active span:nth-child(3) {
  transform: rotate(-45deg) translate(5px, -5px);
}

/* Mobile overlay & drawer */
.mobile-overlay {
  position: fixed;
  inset: 0;
  top: var(--nav-height);
  background: rgba(0, 0, 0, 0.3);
  z-index: 999;
}

.mobile-drawer {
  position: absolute;
  top: 0;
  right: 0;
  width: min(280px, 80vw);
  height: 100%;
  background: var(--color-bg-primary);
  border-left: 1px solid var(--color-border);
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  padding: 24px 20px;
}

.mobile-nav-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mobile-nav-links a {
  display: block;
  padding: 12px 16px;
  font-size: 1rem;
  color: var(--color-text-primary);
  text-decoration: none;
  border-radius: var(--border-radius-sm);
  transition: all 0.2s;
}
.mobile-nav-links a:hover,
.mobile-nav-links a.router-link-exact-active {
  background: var(--color-accent-light);
  color: var(--color-accent);
}

.mobile-divider {
  height: 1px;
  background: var(--color-border-light);
  margin: 16px 0;
}

.mobile-auth {
  display: flex;
  gap: 12px;
}
.mobile-auth .btn-outline,
.mobile-auth .btn-primary {
  flex: 1;
  text-align: center;
  text-decoration: none;
}

/* Mobile menu transition */
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity 0.25s ease;
}
.mobile-menu-enter-active .mobile-drawer,
.mobile-menu-leave-active .mobile-drawer {
  transition: transform 0.25s ease;
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
}
.mobile-menu-enter-from .mobile-drawer,
.mobile-menu-leave-to .mobile-drawer {
  transform: translateX(100%);
}

.btn-sm {
  padding: 6px 16px;
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .nav-links { display: none; }
  .hamburger { display: flex; }
  .logo-sub { display: none; }
  .nav-btn-desktop { display: none; }
}
</style>
