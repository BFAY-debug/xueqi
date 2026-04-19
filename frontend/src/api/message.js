import request from './request'

export const messageAPI = {
  getConversations: () => request.get('/study/private-chat/conversations'),
  createConversation: (toUserId) => request.post('/study/private-chat/conversations', { toUserId }),
  getMessages: (convId, params) => request.get(`/study/private-chat/conversations/${convId}/messages`, { params }),
  markRead: (convId) => request.put(`/study/private-chat/conversations/${convId}/read`),
  getUnreadCount: () => request.get('/study/private-chat/unread-count'),
  getUserStatus: (userId) => request.get(`/study/private-chat/users/${userId}/status`),
  getOnlineUsers: () => request.get('/study/private-chat/online-users')
}
