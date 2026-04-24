import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authAPI, userAPI, notificationAPI } from '@/api/user'
import { disconnectSocket } from '@/composables/useSocket'
import { useChatStore } from './chat'
import { useMessageStore } from './message'
import { useFriendStore } from './friend'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const refreshToken = ref(localStorage.getItem('refreshToken') || '')
  const user = ref(null)
  const unreadCount = ref(0)

  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value && ['admin', 'super_admin'].includes(user.value.roleName))
  const isSuperAdmin = computed(() => user.value?.roleName === 'super_admin')

  function setToken(accessToken, refToken) {
    token.value = accessToken
    refreshToken.value = refToken
    localStorage.setItem('token', accessToken)
    localStorage.setItem('refreshToken', refToken)
  }

  async function login(credentials) {
    const res = await authAPI.login(credentials)
    setToken(res.data.accessToken, res.data.refreshToken)
    user.value = res.data.user
    // Defer non-critical requests so they don't block navigation
    fetchUnreadCount().catch(() => {})
    return res.data
  }

  async function register(data) {
    return await authAPI.register(data)
  }

  async function logout() {
    try {
      await authAPI.logout({ refreshToken: refreshToken.value })
    } catch { /* ignore */ }
    token.value = ''
    refreshToken.value = ''
    user.value = null
    unreadCount.value = 0
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    disconnectSocket()
    useChatStore().resetState()
    useMessageStore().resetState()
    useFriendStore().resetState()
  }

  async function fetchProfile() {
    if (!token.value) return
    try {
      const res = await userAPI.getProfile()
      user.value = res.data
    } catch {
      // Don't logout on fetch failure — the 401 interceptor handles that
    }
  }

  async function fetchUnreadCount() {
    if (!token.value) return
    try {
      const res = await notificationAPI.getUnreadCount()
      unreadCount.value = res.data.count
    } catch {
      // ignore
    }
  }

  return {
    token, refreshToken, user, unreadCount,
    isLoggedIn, isAdmin, isSuperAdmin,
    setToken, login, register, logout, fetchProfile, fetchUnreadCount
  }
})
