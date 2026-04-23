import request from './request'

export const authAPI = {
  register: (data) => request.post('/user/register', data),
  login: (data) => request.post('/user/login', data),
  logout: () => request.post('/user/logout'),
  refresh: (refreshToken) => request.post('/user/refresh', { refreshToken })
}

export const userAPI = {
  getProfile: () => request.get('/user/profile'),
  updateProfile: (data) => request.put('/user/profile', data),
  getUserById: (id) => request.get(`/user/${id}`),
  getUserStats: (id) => request.get(`/user/${id}/stats`),
  uploadAvatar: (file) => {
    const formData = new FormData()
    formData.append('avatar', file)
    return request.post('/user/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

export const pointsAPI = {
  getPoints: () => request.get('/user/points'),
  getPointsLog: (params) => request.get('/user/points/log', { params }),
  dailyCheckin: () => request.post('/user/points/daily-checkin')
}

export const leaderboardAPI = {
  getPoints: (params) => request.get('/user/leaderboard', { params }),
  getWeekly: (params) => request.get('/user/leaderboard/weekly', { params }),
  getMonthly: (params) => request.get('/user/leaderboard/monthly', { params }),
  getStudy: (params) => request.get('/user/leaderboard/study', { params }),
  getStreak: (params) => request.get('/user/leaderboard/streak', { params }),
  getMyRank: () => request.get('/user/leaderboard/my-rank')
}

export const notificationAPI = {
  getList: (params) => request.get('/user/notifications', { params }),
  getUnreadCount: () => request.get('/user/notifications/unread-count'),
  markRead: (id) => request.put(`/user/notifications/${id}/read`),
  markAllRead: () => request.put('/user/notifications/read-all')
}

export const adminAPI = {
  getUsers: (params) => request.get('/user/admin/users', { params }),
  getUserDetail: (id) => request.get(`/user/admin/users/${id}`),
  changeRole: (id, roleId) => request.put(`/user/admin/users/${id}/role`, { roleId }),
  changeStatus: (id, status) => request.put(`/user/admin/users/${id}/status`, { status }),
  getStats: () => request.get('/user/admin/stats'),
  getStatsTrend: (days = 14) => request.get('/user/admin/stats/trend', { params: { days } }),
  applyAdmin: (reason) => request.post('/user/admin/apply', { reason }),
  getApplications: (params) => request.get('/user/admin/applications', { params }),
  reviewApplication: (id, action) => request.put(`/user/admin/applications/${id}`, { action })
}

export const feedbackAPI = {
  submit: (data) => request.post('/user/feedback', data),
  getList: (params) => request.get('/user/feedback', { params }),
  updateStatus: (id, data) => request.put(`/user/feedback/${id}`, data)
}
