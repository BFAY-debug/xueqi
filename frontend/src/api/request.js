import axios from 'axios'
import { useUserStore } from '@/stores/user'
import router from '@/router'

const request = axios.create({
  baseURL: '/api',
  timeout: 15000
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
      const userStore = useUserStore()
      // Try refresh token
      if (userStore.refreshToken && !error.config._retry) {
        error.config._retry = true
        try {
          const res = await axios.post('/api/user/refresh', {
            refreshToken: userStore.refreshToken
          })
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
      router.push(`/login?redirect=${encodeURIComponent(router.currentRoute.value.fullPath)}`)
      return Promise.reject(new Error('登录已过期，请重新登录'))
    }

    const message = response.data?.message || `请求错误 (${response.status})`
    return Promise.reject(new Error(message))
  }
)

export default request
