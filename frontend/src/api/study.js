import request from './request'

export const roomAPI = {
  getList: (params) => request.get('/study/rooms', { params }),
  getById: (id) => request.get(`/study/rooms/${id}`),
  create: (data) => request.post('/study/rooms', data),
  update: (id, data) => request.put(`/study/rooms/${id}`, data),
  join: (id) => request.post(`/study/rooms/${id}/join`),
  leave: (id) => request.post(`/study/rooms/${id}/leave`),
  getParticipants: (id) => request.get(`/study/rooms/${id}/participants`)
}

export const sessionAPI = {
  start: (data) => request.post('/study/sessions/start', data),
  end: (id) => request.put(`/study/sessions/${id}/end`),
  getMy: (params) => request.get('/study/sessions/my', { params }),
  getActive: () => request.get('/study/sessions/active'),
  abandonActive: () => request.delete('/study/sessions/active')
}

export const chatAPI = {
  getMessages: (roomId, limit = 50) => request.get(`/study/rooms/${roomId}/messages`, { params: { limit } })
}

export const locationAPI = {
  getList: () => request.get('/study/locations'),
  getById: (id) => request.get(`/study/locations/${id}`),
  create: (data) => request.post('/study/locations', data),
  update: (id, data) => request.put(`/study/locations/${id}`, data),
  delete: (id) => request.delete(`/study/locations/${id}`),
  getSeats: (id) => request.get(`/study/locations/${id}/seats`),
  batchCreateSeats: (id, seats) => request.post(`/study/locations/${id}/seats`, { seats })
}

export const reservationAPI = {
  reserve: (seatId, data) => request.post(`/study/seats/${seatId}/reserve`, data),
  checkin: (id) => request.put(`/study/reservations/${id}/checkin`),
  cancel: (id) => request.put(`/study/reservations/${id}/cancel`),
  getMy: (params) => request.get('/study/reservations/my', { params }),
  getMyPenalty: () => request.get('/study/reservations/my/penalty')
}

export const volunteerAPI = {
  getTasks: () => request.get('/study/volunteer/tasks'),
  apply: (taskId) => request.post(`/study/volunteer/apply/${taskId}`),
  getPending: (params) => request.get('/study/admin/volunteer/pending', { params }),
  confirm: (id) => request.put(`/study/admin/volunteer/${id}/confirm`),
  reject: (id) => request.put(`/study/admin/volunteer/${id}/reject`)
}

export const bookAPI = {
  getList: (params) => request.get('/study/books', { params }),
  getById: (id) => request.get(`/study/books/${id}`),
  getRecommend: () => request.get('/study/books/recommend'),
  submit: (data) => request.post('/study/books/submit', data),
  rate: (id, data) => request.post(`/study/books/${id}/rate`, data),
  collect: (id) => request.post(`/study/books/${id}/collect`),
  uncollect: (id) => request.delete(`/study/books/${id}/collect`),
  getCollections: (params) => request.get('/study/books/collections', { params }),
  // Admin
  add: (data) => request.post('/study/books', data),
  update: (id, data) => request.put(`/study/books/${id}`, data),
  delete: (id) => request.delete(`/study/books/${id}`),
  getPending: (params) => request.get('/study/admin/books/pending', { params }),
  review: (id, data) => request.put(`/study/admin/books/${id}/review`, data)
}
