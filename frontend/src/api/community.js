import request from './request'

export const postAPI = {
  getList: (params) => request.get('/community/posts', { params }),
  getById: (id) => request.get(`/community/posts/${id}`),
  create: (data) => request.post('/community/posts', data),
  update: (id, data) => request.put(`/community/posts/${id}`, data),
  delete: (id) => request.delete(`/community/posts/${id}`),
  like: (id) => request.post(`/community/posts/${id}/like`),
  getMy: (params) => request.get('/community/my/posts', { params }),
  getVersions: (id) => request.get(`/community/posts/${id}/versions`),
  getVersion: (id, ver) => request.get(`/community/posts/${id}/versions/${ver}`),
  rollbackVersion: (id, ver) => request.post(`/community/posts/${id}/versions/${ver}/rollback`)
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

export const proposalAPI = {
  create: (data) => request.post('/community/proposals', data),
  getList: (params) => request.get('/community/proposals', { params }),
  getById: (id) => request.get(`/community/proposals/${id}`),
  merge: (id) => request.put(`/community/proposals/${id}/merge`),
  reject: (id, data) => request.put(`/community/proposals/${id}/reject`, data),
  close: (id) => request.delete(`/community/proposals/${id}`),
  getMy: (params) => request.get('/community/my/proposals', { params })
}

export const bookmarkAPI = {
  toggle: (postId) => request.post(`/community/bookmarks/${postId}`),
  getMy: (params) => request.get('/community/my/bookmarks', { params })
}

export const communityAdminAPI = {
  getPendingPosts: (params) => request.get('/community/admin/posts/pending', { params }),
  getAllPosts: (params) => request.get('/community/admin/posts/all', { params }),
  reviewPost: (id, data) => request.put(`/community/admin/posts/${id}/review`, data),
  pinPost: (id, pinned) => request.put(`/community/admin/posts/${id}/pin`, { pinned }),
  featurePost: (id, featured) => request.put(`/community/admin/posts/${id}/feature`, { featured }),
  hidePost: (id, hidden) => request.put(`/community/admin/posts/${id}/hide`, { hidden }),
  editPost: (id, data) => request.put(`/community/admin/posts/${id}/edit`, data),
  deletePost: (id) => request.delete(`/community/admin/posts/${id}`),
  getPendingComments: (params) => request.get('/community/admin/comments/pending', { params }),
  getAllComments: (params) => request.get('/community/admin/comments/all', { params }),
  reviewComment: (id, data) => request.put(`/community/admin/comments/${id}/review`, data),
  deleteComment: (id) => request.delete(`/community/admin/comments/${id}`),
  getReviewLogs: (params) => request.get('/community/admin/review-logs', { params }),
  getPendingProposals: (params) => request.get('/community/admin/proposals/pending', { params }),
  mergeProposal: (id) => request.put(`/community/admin/proposals/${id}/merge`),
  rejectProposal: (id, data) => request.put(`/community/admin/proposals/${id}/reject`, data)
}
