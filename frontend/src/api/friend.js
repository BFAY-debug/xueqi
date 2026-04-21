import request from './request'

export const friendAPI = {
  sendRequest: (toUserId, message) =>
    request.post('/user/friends/requests', { toUserId, message }),
  acceptRequest: (requestId) =>
    request.put(`/user/friends/requests/${requestId}/accept`),
  rejectRequest: (requestId) =>
    request.put(`/user/friends/requests/${requestId}/reject`),
  getRequests: (params) =>
    request.get('/user/friends/requests', { params }),
  getUnreadRequestCount: () =>
    request.get('/user/friends/requests/unread-count'),
  getFriends: (params) =>
    request.get('/user/friends', { params }),
  deleteFriend: (userId) =>
    request.delete(`/user/friends/${userId}`),
  getStatus: (targetUserId) =>
    request.get(`/user/friends/status/${targetUserId}`),
  blockUser: (userId) =>
    request.post('/user/friends/block', { userId }),
  unblockUser: (userId) =>
    request.delete(`/user/friends/block/${userId}`),
  getBlockedUsers: (params) =>
    request.get('/user/friends/blocked', { params }),
  searchUsers: (q, page = 1) =>
    request.get('/user/friends/search', { params: { q, page, pageSize: 20 } })
}
