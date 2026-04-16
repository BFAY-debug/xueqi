/**
 * Socket.IO composable for real-time updates.
 * Manages connection lifecycle and provides event subscription helpers.
 */
import { ref, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import { useUserStore } from '@/stores/user'

const GATEWAY_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin

let socket = null
const connected = ref(false)

/**
 * Get or create the global Socket.IO connection with auth token.
 */
function getSocket() {
  if (socket) return socket

  const userStore = useUserStore()

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

export { getSocket, connected }
