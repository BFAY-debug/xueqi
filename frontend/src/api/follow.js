import request from './request'

export const followAPI = {
  toggle: (userId) => request.post(`/user/follows/${userId}`),
  check: (userId) => request.get(`/user/follows/${userId}/check`),
  getFollowers: (userId, params) => request.get(`/user/follows/${userId}/followers`, { params }),
  getFollowing: (userId, params) => request.get(`/user/follows/${userId}/following`, { params })
}
