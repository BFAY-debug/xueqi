import { defineStore } from 'pinia'
import { ref } from 'vue'
import { chatAPI, roomAPI } from '@/api/study'
import { getSocket } from '@/composables/useSocket'

export const useChatStore = defineStore('chat', () => {
  const chatRoomId = ref(null)
  const roomInfo = ref(null)
  const isOpen = ref(false)
  const unreadCount = ref(0)
  const onlineCount = ref(0)
  const roomList = ref([])
  const onlineUsers = ref([])

  async function fetchRoomList() {
    try {
      const res = await chatAPI.getRooms()
      roomList.value = res.data || []
    } catch { /* ignore */ }
  }

  async function openChat(roomId) {
    if (!roomId) return
    try {
      const res = await roomAPI.getById(roomId)
      roomInfo.value = res.data
    } catch {
      roomInfo.value = { id: roomId, name: `书院 ${roomId}` }
    }

    // Leave previous room socket channel
    if (chatRoomId.value && chatRoomId.value !== roomId) {
      const sock = getSocket()
      sock.emit('room:leave', chatRoomId.value)
    }

    chatRoomId.value = roomId
    isOpen.value = true
    unreadCount.value = 0
    onlineCount.value = 0
    onlineUsers.value = []

    // Join new room socket channel
    const sock = getSocket()
    sock.emit('room:join', roomId)
  }

  function exitChat() {
    if (chatRoomId.value) {
      const sock = getSocket()
      sock.emit('room:leave', chatRoomId.value)
    }
    chatRoomId.value = null
    roomInfo.value = null
    onlineCount.value = 0
    onlineUsers.value = []
    isOpen.value = false
  }

  function closeChat() {
    if (chatRoomId.value) {
      const sock = getSocket()
      sock.emit('room:leave', chatRoomId.value)
    }
    chatRoomId.value = null
    roomInfo.value = null
    onlineCount.value = 0
    onlineUsers.value = []
    isOpen.value = false
  }

  function toggleChat() {
    isOpen.value = !isOpen.value
    if (isOpen.value) unreadCount.value = 0
  }

  function incrementUnread() {
    if (!isOpen.value) unreadCount.value++
  }

  function resetUnread() {
    unreadCount.value = 0
  }

  function setOnlineCount(count) {
    onlineCount.value = count
  }

  function setOnlineUsers(users) {
    onlineUsers.value = users
    onlineCount.value = users.length
  }

  return {
    chatRoomId, roomInfo, isOpen, unreadCount, onlineCount, roomList, onlineUsers,
    openChat, closeChat, toggleChat, incrementUnread, resetUnread,
    setOnlineCount, setOnlineUsers, fetchRoomList, exitChat
  }
})
