<template>
  <!-- Collapsed bubble -->
  <div v-if="!chatStore.isOpen" class="chat-bubble" @click="chatStore.toggleChat()">
    <span>💬</span>
    <span v-if="chatStore.unreadCount > 0" class="chat-badge">{{ chatStore.unreadCount }}</span>
    <span class="status-dot" :class="socketConnected ? 'online' : 'offline'"></span>
  </div>

  <!-- Expanded panel -->
  <Transition name="chat-pop">
    <div
      v-if="chatStore.isOpen"
      class="global-chat-panel chat-dark"
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
          <span class="status-dot" :class="socketConnected ? 'online' : 'offline'"></span>
          <button v-if="chatStore.chatRoomId" class="header-btn" @click.stop="showMembers = !showMembers" title="群成员">👤</button>
          <button v-if="chatStore.chatRoomId" class="header-btn header-btn-exit" @click.stop="chatStore.exitChat()" title="退出房间">🚪</button>
          <button v-if="!chatStore.chatRoomId" class="header-btn" @click.stop="showJoinInput = !showJoinInput" title="输入房间号">#</button>
          <button class="header-btn" @click.stop="chatStore.closeChat()">✕</button>
        </div>
      </div>

      <!-- Room list view (no room joined) -->
      <template v-if="!chatStore.chatRoomId">
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

        <!-- Room list -->
        <div class="room-list-view">
          <div class="room-list-title">选择论谈房间</div>
          <div v-if="chatStore.roomList.length" class="room-list-items">
            <div
              v-for="room in chatStore.roomList"
              :key="room.id"
              class="room-list-item"
              @click="chatStore.openChat(room.id)"
            >
              <div class="rli-info">
                <span class="rli-name">🏮 {{ room.name }}</span>
                <span v-if="room.description" class="rli-desc">{{ room.description }}</span>
              </div>
              <span class="rli-cap">{{ room.capacity }}人</span>
            </div>
          </div>
          <div v-else class="room-list-empty">暂无聊天房间</div>
        </div>
      </template>

      <!-- Chat view (room joined) -->
      <template v-else>
        <div class="panel-body">
          <RoomChat :roomId="chatStore.chatRoomId" />
        </div>
      </template>

      <!-- Resize handle -->
      <div v-if="chatStore.chatRoomId" class="resize-handle" @mousedown.stop="startResize" @touchstart.stop.prevent="startResize"></div>

      <!-- Members popup -->
      <Transition name="fade">
        <div v-if="showMembers && chatStore.chatRoomId" class="members-panel">
          <div class="members-header">
            <span>群成员 ({{ chatStore.onlineUsers.length }})</span>
            <button class="members-close" @click="showMembers = false">✕</button>
          </div>
          <div class="members-list">
            <div v-for="u in chatStore.onlineUsers" :key="u.userId" class="member-item">
              <div class="member-avatar">{{ (u.nickname || '?')[0] }}</div>
              <span class="member-name">{{ u.nickname }}</span>
              <span class="member-online"></span>
            </div>
            <div v-if="!chatStore.onlineUsers.length" class="members-empty">暂无在线成员</div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useChatStore } from '@/stores/chat'
import { connected as socketConnected } from '@/composables/useSocket'
import { ElMessage } from 'element-plus'
import RoomChat from './RoomChat.vue'

const chatStore = useChatStore()

const showJoinInput = ref(false)
const joinRoomId = ref('')
const showMembers = ref(false)

// Panel dimensions
const MIN_W = 340
const MIN_H = 400
const panelW = ref(400)
const panelH = ref(540)

// Drag state
const pos = ref({ x: window.innerWidth - 400 - 24, y: window.innerHeight - 540 - 24 })
let dragging = false
let dragOffset = { x: 0, y: 0 }

const panelStyle = ref({})

function updatePanelStyle() {
  panelStyle.value = {
    left: pos.value.x + 'px',
    top: pos.value.y + 'px',
    width: panelW.value + 'px',
    height: panelH.value + 'px'
  }
}
updatePanelStyle()

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
  const x = Math.max(0, Math.min(window.innerWidth - panelW.value, clientX - dragOffset.x))
  const y = Math.max(0, Math.min(window.innerHeight - 100, clientY - dragOffset.y))
  pos.value = { x, y }
  updatePanelStyle()
}

function stopDrag() {
  dragging = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
}

// Resize state
let resizing = false

function startResize(e) {
  resizing = true
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', stopResize)
  document.addEventListener('touchmove', onResizeMove)
  document.addEventListener('touchend', stopResize)
}

function onResizeMove(e) {
  if (!resizing) return
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  const newW = Math.max(MIN_W, Math.min(clientX - pos.value.x, window.innerWidth - pos.value.x))
  const newH = Math.max(MIN_H, Math.min(clientY - pos.value.y, window.innerHeight - pos.value.y))
  panelW.value = Math.round(newW)
  panelH.value = Math.round(newH)
  updatePanelStyle()
}

function stopResize() {
  resizing = false
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('touchmove', onResizeMove)
  document.removeEventListener('touchend', stopResize)
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

function onWindowResize() {
  const maxX = window.innerWidth - panelW.value
  const maxY = window.innerHeight - 100
  if (pos.value.x > maxX) { pos.value = { ...pos.value, x: Math.max(0, maxX) }; updatePanelStyle() }
  if (pos.value.y > maxY) { pos.value = { ...pos.value, y: Math.max(0, maxY) }; updatePanelStyle() }
}

// Fetch room list when opening panel
watch(() => chatStore.isOpen, (open) => {
  if (open && !chatStore.chatRoomId) {
    chatStore.fetchRoomList()
  }
  showMembers.value = false
})

onMounted(() => {
  window.addEventListener('resize', onWindowResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize)
})
</script>

<style scoped>
/* ── Dark theme variables ── */
.chat-dark {
  --chat-bg: #1e1e2e;
  --chat-header-bg: #2a2a3e;
  --chat-text: #e0e0e0;
  --chat-text-muted: #888;
  --chat-bubble-self: #3a3a5c;
  --chat-bubble-other: #2a2a3e;
  --chat-bubble-anon: #3a3a3e;
  --chat-input-bg: #2a2a3e;
  --chat-accent: #5b5b9c;
  --chat-border: rgba(255,255,255,0.08);
}

/* ── Collapsed bubble ── */
.chat-bubble {
  position: fixed;
  bottom: 80px;
  right: 24px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--chat-accent, #5b5b9c);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.3rem;
  box-shadow: 0 4px 16px rgba(91, 91, 156, 0.4);
  transition: transform 0.2s;
  z-index: 9998;
}
.chat-bubble:hover { transform: scale(1.08); }
.chat-badge {
  position: absolute; top: -4px; right: -4px;
  min-width: 20px; height: 20px; border-radius: 10px;
  background: #e74c3c; color: #fff; font-size: 0.7rem;
  display: flex; align-items: center; justify-content: center; padding: 0 5px;
  animation: badge-pulse 2s ease-in-out infinite;
}
@keyframes badge-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }

/* Status dot */
.status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.status-dot.online { background: #4CAF50; box-shadow: 0 0 4px rgba(76, 175, 80, 0.5); }
.status-dot.offline { background: #f44336; animation: blink 1.5s ease-in-out infinite; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.chat-bubble .status-dot { position: absolute; bottom: 2px; right: 2px; }

/* Online badge */
.online-badge {
  font-size: 0.7rem; background: rgba(255,255,255,0.12);
  padding: 2px 8px; border-radius: 10px; color: rgba(255,255,255,0.8);
}

/* ── Panel ── */
.global-chat-panel {
  position: fixed;
  background: var(--chat-bg);
  border: 1px solid var(--chat-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  z-index: 9998;
  overflow: hidden;
  color: var(--chat-text);
}

/* Header */
.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px;
  background: var(--chat-header-bg);
  cursor: move; user-select: none; flex-shrink: 0;
  border-bottom: 1px solid var(--chat-border);
}
.panel-header-left { display: flex; align-items: center; gap: 8px; }
.panel-icon { font-size: 1rem; }
.panel-title { font-size: 0.95rem; font-weight: 600; color: var(--chat-text); }
.panel-header-actions { display: flex; align-items: center; gap: 4px; }
.header-btn {
  background: rgba(255,255,255,0.08); border: none; color: var(--chat-text);
  width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;
  display: flex; align-items: center; justify-content: center; transition: background 0.2s;
}
.header-btn:hover { background: rgba(255,255,255,0.18); }
.header-btn-exit:hover { background: rgba(231,76,60,0.3); }

/* ── Room list view ── */
.room-list-view {
  flex: 1; overflow-y: auto; padding: 12px;
}
.room-list-title {
  font-size: 0.85rem; color: var(--chat-text-muted); margin-bottom: 10px;
  padding-left: 4px; border-left: 3px solid var(--chat-accent);
}
.room-list-items { display: flex; flex-direction: column; gap: 4px; }
.room-list-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; border-radius: 8px; cursor: pointer;
  background: rgba(255,255,255,0.04); transition: background 0.15s;
}
.room-list-item:hover { background: rgba(255,255,255,0.1); }
.rli-info { display: flex; flex-direction: column; gap: 2px; }
.rli-name { font-size: 0.9rem; color: var(--chat-text); }
.rli-desc { font-size: 0.75rem; color: var(--chat-text-muted); }
.rli-cap { font-size: 0.75rem; color: var(--chat-text-muted); }
.room-list-empty { text-align: center; color: var(--chat-text-muted); padding: 40px 0; font-size: 0.85rem; }

/* Join row */
.join-row {
  display: flex; gap: 8px; padding: 8px 14px;
  background: var(--chat-header-bg); border-bottom: 1px solid var(--chat-border); flex-shrink: 0;
}
.join-input {
  flex: 1; padding: 6px 10px; border: 1px solid var(--chat-border); border-radius: 6px;
  background: rgba(255,255,255,0.06); color: var(--chat-text); font-size: 0.85rem; outline: none;
}
.join-input:focus { border-color: var(--chat-accent); }
.join-btn {
  padding: 6px 14px; background: var(--chat-accent); color: #fff; border: none;
  border-radius: 6px; cursor: pointer; font-size: 0.85rem;
}
.join-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── Chat body ── */
.panel-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; }

/* Resize handle */
.resize-handle { position: absolute; bottom: 0; right: 0; width: 20px; height: 20px; cursor: se-resize; z-index: 10; }
.resize-handle::before {
  content: ''; position: absolute; bottom: 4px; right: 4px;
  width: 10px; height: 10px;
  border-right: 2px solid rgba(255,255,255,0.2);
  border-bottom: 2px solid rgba(255,255,255,0.2);
}
.resize-handle:hover::before { border-color: var(--chat-accent); }

/* ── Members popup ── */
.members-panel {
  position: absolute; top: 42px; right: 8px; width: 200px;
  background: #252540; border: 1px solid var(--chat-border);
  border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  z-index: 10; overflow: hidden;
}
.members-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; font-size: 0.8rem; color: var(--chat-text-muted);
  border-bottom: 1px solid var(--chat-border);
}
.members-close {
  background: none; border: none; color: var(--chat-text-muted);
  cursor: pointer; font-size: 0.8rem;
}
.members-list { padding: 4px 0; max-height: 200px; overflow-y: auto; }
.member-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px; font-size: 0.85rem;
}
.member-avatar {
  width: 24px; height: 24px; border-radius: 50%;
  background: var(--chat-accent); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.7rem; flex-shrink: 0;
}
.member-name { flex: 1; color: var(--chat-text); }
.member-online { width: 6px; height: 6px; border-radius: 50%; background: #4CAF50; flex-shrink: 0; }
.members-empty { text-align: center; color: var(--chat-text-muted); padding: 16px 0; font-size: 0.8rem; }

/* Transitions */
.chat-pop-enter-active { transition: all 0.25s ease; }
.chat-pop-leave-active { transition: all 0.15s ease; }
.chat-pop-enter-from { opacity: 0; transform: scale(0.9); }
.chat-pop-leave-to { opacity: 0; transform: scale(0.95); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Mobile */
@media (max-width: 768px) {
  .global-chat-panel {
    width: calc(100vw - 16px) !important; height: 60vh !important;
    left: 8px !important; bottom: 8px; top: auto !important;
  }
  .chat-bubble { bottom: 60px; right: 16px; }
  .resize-handle { display: none; }
}
</style>
