import axios from 'axios'
import { useUserStore } from '@/stores/user'
import router from '@/router'

const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
  withCredentials: true
})

// Request interceptor: attach token
request.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.success === false) {
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return res
  },
  async (error) => {
    const { response } = error
    if (!response) {
      return Promise.reject(new Error('网络错误，请检查网络连接'))
    }

    if (response.status === 401) {
      // Login endpoint handles its own errors — pass through
      if (error.config.url?.includes('/login') || error.config.url?.includes('/register')) {
        const message = response.data?.message || '用户名或密码错误'
        return Promise.reject(new Error(message))
      }

      const userStore = useUserStore()
      // Try refresh token — deduplicate with shared promise
      // In production, refresh token is sent via httpOnly cookie automatically
      if (!error.config._retry && (userStore.refreshToken || import.meta.env.PROD)) {
        error.config._retry = true
        try {
          if (!window.__refreshPromise) {
            const payload = import.meta.env.PROD ? {} : { refreshToken: userStore.refreshToken }
            window.__refreshPromise = axios.post('/api/user/refresh', payload, {
              withCredentials: true
            }).finally(() => { window.__refreshPromise = null })
          }
          const res = await window.__refreshPromise
          if (res.data.success) {
            userStore.setToken(res.data.data.accessToken, res.data.data.refreshToken)
            error.config.headers.Authorization = `Bearer ${res.data.data.accessToken}`
            return request(error.config)
          }
        } catch {
          // Refresh failed, logout
        }
      }
      userStore.logout()
      // Don't redirect for background profile checks (e.g., navigation guard)
      // to avoid flashing pages that don't require auth
      if (error.config.url?.includes('/user/profile')) {
        return Promise.reject(new Error('登录已过期'))
      }
      if (router.currentRoute.value.path !== '/login') {
        router.push(`/login?redirect=${encodeURIComponent(router.currentRoute.value.fullPath)}`)
      }
      return Promise.reject(new Error('登录已过期，请重新登录'))
    }

    const message = response.data?.message || `请求错误 (${response.status})`
    return Promise.reject(new Error(message))
  }
)

export default request
