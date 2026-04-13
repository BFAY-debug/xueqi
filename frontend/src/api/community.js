import request from './request'

export const postAPI = {
  getList: (params) => request.get('/community/posts', { params }),
  getById: (id) => request.get(`/community/posts/${id}`),
  create: (data) => request.post('/community/posts', data),
  update: (id, data) => request.put(`/community/posts/${id}`, data),
  delete: (id) => request.delete(`/community/posts/${id}`),
  like: (id) => request.post(`/community/posts/${id}/like`),
  getMy: (params) => request.get('/community/my/posts', { params })
}

export const commentAPI = {
  getList: (postId, params) => request.get(`/community/posts/${postId}/comments`, { params }),
  create: (postId, data) => request.post(`/community/posts/${postId}/comments`, data),
  delete: (id) => request.delete(`/community/comments/${id}`),
  like: (id) => request.post(`/community/comments/${id}/like`),
  getMy: (params) => request.get('/community/my/comments', { params })
}

export const tagAPI = {
  getList: () => request.get('/community/tags')
}

export const communityAdminAPI = {
  getPendingPosts: (params) => request.get('/community/admin/posts/pending', { params }),
  reviewPost: (id, data) => request.put(`/community/admin/posts/${id}/review`, data),
  pinPost: (id, pinned) => request.put(`/community/admin/posts/${id}/pin`, { pinned }),
  featurePost: (id, featured) => request.put(`/community/admin/posts/${id}/feature`, { featured }),
  getPendingComments: (params) => request.get('/community/admin/comments/pending', { params }),
  reviewComment: (id, data) => request.put(`/community/admin/comments/${id}/review`, data),
  getReviewLogs: (params) => request.get('/community/admin/review-logs', { params })
}
