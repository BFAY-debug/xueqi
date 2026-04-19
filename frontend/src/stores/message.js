import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { messageAPI } from '@/api/message'
import { getSocket } from '@/composables/useSocket'

export const useMessageStore = defineStore('message', () => {
  const conversations = ref([])
  const currentConversation = ref(null)
  const currentMessages = ref([])
  const unreadTotal = ref(0)
  const onlineUsers = ref([])

  const currentConvId = computed(() => currentConversation.value?.id || null)

  async function fetchConversations() {
    try {
      const res = await messageAPI.getConversations()
      conversations.value = res.data || []
    } catch (e) {
      console.warn('Fetch conversations failed:', e.message)
    }
  }

  async function openConversation(toUserId) {
    try {
      const res = await messageAPI.createConversation(toUserId)
      const conv = res.data
      currentConversation.value = conv
      await fetchMessages(conv.id)
      return conv
    } catch (e) {
      console.warn('Open conversation failed:', e.message)
      return null
    }
  }

  async function fetchMessages(convId, beforeId = null) {
    try {
      const params = { limit: 50 }
      if (beforeId) params.beforeId = beforeId
      const res = await messageAPI.getMessages(convId, params)
      const msgs = res.data || []
      if (beforeId) {
        currentMessages.value = [...msgs, ...currentMessages.value]
      } else {
        currentMessages.value = msgs
      }
    } catch (e) {
      console.warn('Fetch messages failed:', e.message)
    }
  }

  async function markAsRead(convId) {
    try {
      await messageAPI.markRead(convId)
      await fetchUnreadCount()
    } catch (e) {
      console.warn('Mark read failed:', e.message)
    }
  }

  async function fetchUnreadCount() {
    try {
      const res = await messageAPI.getUnreadCount()
      unreadTotal.value = res.data?.count || 0
    } catch (e) {
      console.warn('Fetch unread count failed:', e.message)
    }
  }

  async function fetchOnlineUsers() {
    try {
      const res = await messageAPI.getOnlineUsers()
      onlineUsers.value = res.data || []
    } catch (e) {
      console.warn('Fetch online users failed:', e.message)
    }
  }

  function handleIncomingMessage(msg) {
    // Add to current conversation if open
    if (currentConversation.value && msg.conversationId === currentConversation.value.id) {
      const exists = currentMessages.value.some(m => m.id === msg.id)
      if (!exists) {
        currentMessages.value.push(msg)
      }
    }
    // Increment unread if not in this conversation
    if (!currentConversation.value || msg.conversationId !== currentConversation.value.id) {
      unreadTotal.value++
    }
    // Update conversation list
    const conv = conversations.value.find(c => c.id === msg.conversationId)
    if (conv) {
      conv.lastMessage = msg.content
      conv.lastMessageAt = msg.createdAt
      if (currentConversation.value?.id !== msg.conversationId) {
        conv.unreadCount = (conv.unreadCount || 0) + 1
      }
    }
  }

  function updateUserStatus(data) {
    if (data.status === 'online') {
      const exists = onlineUsers.value.find(u => u.userId === data.userId)
      if (!exists && data.nickname) {
        onlineUsers.value.push({ userId: data.userId, nickname: data.nickname, avatarUrl: data.avatarUrl })
      }
    } else {
      onlineUsers.value = onlineUsers.value.filter(u => u.userId !== data.userId)
    }
  }

  // Setup socket listeners
  function setupSocketListeners() {
    const socket = getSocket()
    socket.on('pm:message', handleIncomingMessage)
    socket.on('online:statusChange', updateUserStatus)
  }

  function removeSocketListeners() {
    const socket = getSocket()
    socket.off('pm:message', handleIncomingMessage)
    socket.off('online:statusChange', updateUserStatus)
  }

  return {
    conversations,
    currentConversation,
    currentMessages,
    unreadTotal,
    onlineUsers,
    currentConvId,
    fetchConversations,
    openConversation,
    fetchMessages,
    markAsRead,
    fetchUnreadCount,
    fetchOnlineUsers,
    handleIncomingMessage,
    updateUserStatus,
    setupSocketListeners,
    removeSocketListeners
  }
})
