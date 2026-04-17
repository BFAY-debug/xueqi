/**
 * Socket.IO composable for real-time updates.
 * Manages connection lifecycle and provides event subscription helpers.
 */
import { ref } from 'vue'
import { io } from 'socket.io-client'
import { useUserStore } from '@/stores/user'

const GATEWAY_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin

let socket = null
const connected = ref(false)

/**
 * Get or create the global Socket.IO connection with auth token.
 * Reconnects with fresh token if the existing socket is disconnected.
 */
function getSocket() {
  const userStore = useUserStore()

  if (socket) {
    // If disconnected, reconnect with fresh token
    if (!socket.connected) {
      socket.auth = { token: userStore.token || '' }
      socket.connect()
    }
    return socket
  }

  socket = io(GATEWAY_URL, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    auth: {
      token: userStore.token || ''
    }
  })

  socket.on('connect', () => {
    connected.value = true
  })

  socket.on('disconnect', () => {
    connected.value = false
  })

  return socket
}

function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
    connected.value = false
  }
}

export { getSocket, connected, disconnectSocket }
