<template>
  <!-- Collapsed bubble -->
  <div v-if="!chatStore.isOpen" class="chat-bubble" @click="chatStore.toggleChat()">
    <span>💬</span>
    <span v-if="chatStore.unreadCount > 0" class="chat-badge">{{ chatStore.unreadCount }}</span>
    <span class="status-dot" :class="socketConnected ? 'online' : 'offline'" :title="socketConnected ? '已连接' : '未连接'"></span>
  </div>

  <!-- Expanded panel -->
  <Transition name="chat-pop">
    <div
      v-if="chatStore.isOpen"
      class="global-chat-panel"
      :style="panelStyle"
    >
      <!-- Title bar (draggable) -->
      <div class="panel-header" @mousedown="startDrag" @touchstart.prevent="startDrag">
        <div class="panel-header-left">
          <span class="panel-icon">🏮</span>
          <span class="panel-title">{{ chatStore.roomInfo?.name || '学堂论谈' }}</span>
          <span v-if="chatStore.onlineCount > 0" class="online-badge">{{ chatStore.onlineCount }} 人在线</span>
        </div>
        <div class="panel-header-actions">
          <span class="status-dot" :class="socketConnected ? 'online' : 'offline'" :title="socketConnected ? '已连接' : '未连接'"></span>
          <button class="header-btn" @click="showJoinInput = !showJoinInput" title="加入房间">#</button>
          <button class="header-btn" @click="chatStore.closeChat()">✕</button>
        </div>
      </div>

      <!-- Join room input -->
      <div v-if="showJoinInput" class="join-row">
        <input
          v-model="joinRoomId"
          class="join-input"
          placeholder="输入书房号..."
          @keydown.enter="handleJoin"
          maxlength="10"
        />
        <button class="join-btn" @click="handleJoin" :disabled="!joinRoomId.trim()">加入</button>
      </div>

      <!-- Chat content -->
      <div class="panel-body" v-if="chatStore.chatRoomId">
        <RoomChat :roomId="chatStore.chatRoomId" />
      </div>
      <div v-else class="panel-empty">
        <p>请输入书房号加入聊天</p>
        <p class="panel-empty-hint">点击上方 # 按钮输入</p>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useUserStore } from '@/stores/user'
import { connected as socketConnected } from '@/composables/useSocket'
import { ElMessage } from 'element-plus'
import RoomChat from './RoomChat.vue'

const chatStore = useChatStore()
const userStore = useUserStore()

const showJoinInput = ref(false)
const joinRoomId = ref('')

// Drag state
const pos = ref({ x: window.innerWidth - 384 - 24, y: window.innerHeight - 520 - 24 })
let dragging = false
let dragOffset = { x: 0, y: 0 }

const panelStyle = computed(() => ({
  left: pos.value.x + 'px',
  top: pos.value.y + 'px'
}))

function startDrag(e) {
  dragging = true
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  dragOffset.x = clientX - pos.value.x
  dragOffset.y = clientY - pos.value.y
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDrag)
  document.addEventListener('touchend', stopDrag)
}

function onDrag(e) {
  if (!dragging) return
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  const x = Math.max(0, Math.min(window.innerWidth - 384, clientX - dragOffset.x))
  const y = Math.max(0, Math.min(window.innerHeight - 100, clientY - dragOffset.y))
  pos.value = { x, y }
}

function stopDrag() {
  dragging = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
}

async function handleJoin() {
  const id = parseInt(joinRoomId.value.trim(), 10)
  if (!id || id <= 0) {
    ElMessage.warning('请输入有效的书房号')
    return
  }
  try {
    await chatStore.openChat(id)
    showJoinInput.value = false
    joinRoomId.value = ''
  } catch {
    ElMessage.error('书院不存在')
  }
}

function onResize() {
  const maxX = window.innerWidth - 384
  const maxY = window.innerHeight - 100
  if (pos.value.x > maxX) pos.value = { ...pos.value, x: Math.max(0, maxX) }
  if (pos.value.y > maxY) pos.value = { ...pos.value, y: Math.max(0, maxY) }
}

onMounted(() => {
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
/* Collapsed bubble */
.chat-bubble {
  position: fixed;
  bottom: 80px;
  right: 24px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--color-blue);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.3rem;
  box-shadow: 0 4px 16px rgba(74, 107, 138, 0.4);
  transition: transform 0.2s;
  z-index: 9998;
}
.chat-bubble:hover {
  transform: scale(1.08);
}
.chat-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  background: var(--color-accent);
  color: #fff;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  animation: badge-pulse 2s ease-in-out infinite;
}
@keyframes badge-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

/* Connection status dot */
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot.online {
  background: #4CAF50;
  box-shadow: 0 0 4px rgba(76, 175, 80, 0.5);
}
.status-dot.offline {
  background: #f44336;
  animation: blink 1.5s ease-in-out infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* Bubble status dot position */
.chat-bubble .status-dot {
  position: absolute;
  bottom: 2px;
  right: 2px;
}

/* Online badge */
.online-badge {
  font-size: 0.7rem;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 10px;
  color: rgba(245, 240, 232, 0.9);
}

/* Expanded panel */
.global-chat-panel {
  position: fixed;
  width: 384px;
  height: 520px;
  background: var(--glass-bg-card);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: var(--glass-border);
  border-radius: var(--border-radius);
  box-shadow: 0 8px 32px rgba(44, 44, 44, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 9998;
  overflow: hidden;
}

/* Header */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--color-blue);
  color: #f5f0e8;
  cursor: move;
  user-select: none;
  flex-shrink: 0;
}
.panel-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.panel-icon { font-size: 1rem; }
.panel-title {
  font-family: var(--font-title);
  font-size: 0.95rem;
  font-weight: 600;
}
.panel-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.header-btn {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: #f5f0e8;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.header-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Join room input */
.join-row {
  display: flex;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(74, 107, 138, 0.08);
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
}
.join-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  background: rgba(245, 240, 232, 0.6);
  color: var(--color-text-primary);
  font-size: 0.85rem;
  outline: none;
}
.join-input:focus { border-color: var(--color-blue); }
.join-btn {
  padding: 6px 14px;
  background: var(--color-blue);
  color: #fff;
  border: none;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-size: 0.85rem;
  white-space: nowrap;
}
.join-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Body */
.panel-body {
  flex: 1;
  overflow: hidden;
}
.panel-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  gap: 8px;
}
.panel-empty-hint {
  font-size: 0.8rem;
  color: var(--ink-light);
}

/* Transition */
.chat-pop-enter-active { transition: all 0.25s ease; }
.chat-pop-leave-active { transition: all 0.15s ease; }
.chat-pop-enter-from { opacity: 0; transform: scale(0.9); }
.chat-pop-leave-to { opacity: 0; transform: scale(0.95); }

/* Mobile */
@media (max-width: 768px) {
  .global-chat-panel {
    width: calc(100vw - 16px);
    height: 60vh;
    left: 8px !important;
    bottom: 8px;
    top: auto !important;
  }
  .chat-bubble {
    bottom: 60px;
    right: 16px;
  }
}
</style>
