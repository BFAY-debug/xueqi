import { ref } from 'vue'
import { defineStore } from 'pinia'
import { friendAPI } from '@/api/friend'
import { useMessageStore } from '@/stores/message'

export const useFriendStore = defineStore('friend', () => {
  const friends = ref([])
  const incomingRequests = ref([])
  const outgoingRequests = ref([])
  const unreadRequestCount = ref(0)
  const loading = ref(false)

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
    const res = await friendAPI.sendRequest(toUserId, message)
    return res.data
  }

  async function acceptRequest(requestId) {
    const res = await friendAPI.acceptRequest(requestId)
    const data = res.data
    incomingRequests.value = incomingRequests.value.filter(r => r.id !== requestId)
    unreadRequestCount.value = Math.max(0, unreadRequestCount.value - 1)
    return data
  }

  async function rejectRequest(requestId) {
    await friendAPI.rejectRequest(requestId)
    incomingRequests.value = incomingRequests.value.filter(r => r.id !== requestId)
    unreadRequestCount.value = Math.max(0, unreadRequestCount.value - 1)
  }

  async function deleteFriend(userId) {
    await friendAPI.deleteFriend(userId)
    friends.value = friends.value.filter(f => f.id !== userId)
  }

  async function blockUser(userId) {
    await friendAPI.blockUser(userId)
    friends.value = friends.value.filter(f => f.id !== userId)
  }

  async function unblockUser(userId) {
    await friendAPI.unblockUser(userId)
  }

  async function getFriendStatus(targetUserId) {
    const res = await friendAPI.getStatus(targetUserId)
    return res.data?.status || 'none'
  }

  function setupSocketListeners() {
    const { getSocket } = require('@/composables/useSocket')
    const socket = getSocket()
    socket.on('friend:request', (data) => {
      unreadRequestCount.value++
      if (!incomingRequests.value.find(r => r.requestId === data.requestId)) {
        incomingRequests.value.unshift(data)
      }
    })
    socket.on('friend:accepted', () => {
      fetchFriends()
      // Refresh conversations so the new chat is immediately available
      const messageStore = useMessageStore()
      messageStore.fetchConversations()
    })
  }

  function removeSocketListeners() {
    const { getSocket } = require('@/composables/useSocket')
    const socket = getSocket()
    socket.off('friend:request')
    socket.off('friend:accepted')
  }

  return {
    friends, incomingRequests, outgoingRequests, unreadRequestCount, loading,
    fetchFriends, fetchIncomingRequests, fetchOutgoingRequests,
    fetchUnreadRequestCount, sendRequest, acceptRequest, rejectRequest,
    deleteFriend, blockUser, unblockUser, getFriendStatus,
    setupSocketListeners, removeSocketListeners
  }
})
