import { ref } from 'vue'
import { defineStore } from 'pinia'
import { friendAPI } from '@/api/friend'
import { useMessageStore } from '@/stores/message'
import { getSocket } from '@/composables/useSocket'

export const useFriendStore = defineStore('friend', () => {
  const friends = ref([])
  const incomingRequests = ref([])
  const outgoingRequests = ref([])
  const unreadRequestCount = ref(0)
  const loading = ref(false)
  const actionLoading = ref(false)

  async function fetchFriends(page = 1) {
    loading.value = true
    try {
      const res = await friendAPI.getFriends({ page, pageSize: 50 })
      friends.value = res.data || []
    } catch (e) {
      console.warn('Fetch friends failed:', e.message)
    } finally {
      loading.value = false
    }
  }

  async function fetchIncomingRequests() {
    try {
      const res = await friendAPI.getRequests({ type: 'incoming' })
      incomingRequests.value = res.data || []
    } catch (e) {
      console.warn('Fetch incoming requests failed:', e.message)
    }
  }

  async function fetchOutgoingRequests() {
    try {
      const res = await friendAPI.getRequests({ type: 'outgoing' })
      outgoingRequests.value = res.data || []
    } catch (e) {
      console.warn('Fetch outgoing requests failed:', e.message)
    }
  }

  async function fetchUnreadRequestCount() {
    try {
      const res = await friendAPI.getUnreadRequestCount()
      unreadRequestCount.value = res.data?.count || 0
    } catch (e) {
      console.warn('Fetch unread request count failed:', e.message)
    }
  }

  async function sendRequest(toUserId, message) {
    if (actionLoading.value) return
    actionLoading.value = true
    try {
      const res = await friendAPI.sendRequest(toUserId, message)
      return res.data
    } finally {
      actionLoading.value = false
    }
  }

  async function acceptRequest(requestId) {
    if (actionLoading.value) return
    actionLoading.value = true
    try {
      const res = await friendAPI.acceptRequest(requestId)
      const data = res.data
      incomingRequests.value = incomingRequests.value.filter(r => r.id !== requestId)
      unreadRequestCount.value = Math.max(0, unreadRequestCount.value - 1)
      return data
    } finally {
      actionLoading.value = false
    }
  }

  async function rejectRequest(requestId) {
    if (actionLoading.value) return
    actionLoading.value = true
    try {
      await friendAPI.rejectRequest(requestId)
      incomingRequests.value = incomingRequests.value.filter(r => r.id !== requestId)
      unreadRequestCount.value = Math.max(0, unreadRequestCount.value - 1)
    } finally {
      actionLoading.value = false
    }
  }

  async function deleteFriend(userId) {
    if (actionLoading.value) return
    actionLoading.value = true
    try {
      await friendAPI.deleteFriend(userId)
      friends.value = friends.value.filter(f => f.id !== userId)
    } finally {
      actionLoading.value = false
    }
  }

  async function blockUser(userId) {
    if (actionLoading.value) return
    actionLoading.value = true
    try {
      await friendAPI.blockUser(userId)
      friends.value = friends.value.filter(f => f.id !== userId)
    } finally {
      actionLoading.value = false
    }
  }

  async function unblockUser(userId) {
    if (actionLoading.value) return
    actionLoading.value = true
    try {
      await friendAPI.unblockUser(userId)
    } finally {
      actionLoading.value = false
    }
  }

  async function getFriendStatus(targetUserId) {
    const res = await friendAPI.getStatus(targetUserId)
    return res.data?.status || 'none'
  }

  const _onFriendRequest = (data) => {
    unreadRequestCount.value++
    if (!incomingRequests.value.find(r => r.requestId === data.requestId)) {
      incomingRequests.value.unshift(data)
    }
  }

  const _onFriendAccepted = () => {
    fetchFriends()
    const messageStore = useMessageStore()
    messageStore.fetchConversations()
  }

  function setupSocketListeners() {
    const socket = getSocket()
    socket.on('friend:request', _onFriendRequest)
    socket.on('friend:accepted', _onFriendAccepted)
  }

  function removeSocketListeners() {
    const socket = getSocket()
    socket.off('friend:request', _onFriendRequest)
    socket.off('friend:accepted', _onFriendAccepted)
  }

  return {
    friends, incomingRequests, outgoingRequests, unreadRequestCount, loading, actionLoading,
    fetchFriends, fetchIncomingRequests, fetchOutgoingRequests,
    fetchUnreadRequestCount, sendRequest, acceptRequest, rejectRequest,
    deleteFriend, blockUser, unblockUser, getFriendStatus,
    setupSocketListeners, removeSocketListeners
  }
})
