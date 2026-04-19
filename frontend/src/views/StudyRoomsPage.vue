<template>
  <div class="page-wrapper theme-study">
    <AppNavbar />

    <!-- Normal Mode: Room Selection -->
    <div class="page-content container" v-if="!immersiveMode" style="margin-top: var(--nav-height); padding-top: 24px;">
      <BackButton />
      <div class="page-header-decorated">
        <h2 class="page-title">🏮 书院</h2>
        <p class="page-subtitle">独学而无友，则孤陋而寡闻</p>
      </div>

      <div class="rooms-layout">
        <!-- Room List -->
        <div class="room-list">
          <div
            v-for="room in rooms" :key="room.id"
            class="room-item card"
            :class="{ active: selectedRoom?.id === room.id }"
            @click="selectRoom(room)"
          >
            <div class="room-icon">{{ roomIcons[room.id % 5] }}</div>
            <div class="room-info">
              <h3>{{ room.name }}</h3>
              <div class="room-progress">
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: progress(room) + '%' }"></div>
                </div>
                <span>{{ room.current_count || 0 }}/{{ room.capacity }}人</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Chat Room Sidebar -->
        <div class="chat-sidebar" v-if="userStore.isLoggedIn">
          <div class="chat-sidebar-title">
            <span>💬 论谈房间</span>
          </div>
          <div v-if="chatStore.roomList.length" class="chat-sidebar-list">
            <div
              v-for="room in chatStore.roomList"
              :key="room.id"
              class="chat-sidebar-item"
              @click="chatStore.openChat(room.id)"
            >
              <span class="csi-name">🏮 {{ room.name }}</span>
              <span class="csi-meta">{{ room.capacity }}人</span>
            </div>
          </div>
          <div v-else class="chat-sidebar-empty">暂无聊天房间</div>
        </div>

        <!-- Room Detail -->
        <div class="room-detail" v-if="selectedRoom">
          <div class="detail-header glass-card">
            <h2>{{ selectedRoom.name }}</h2>
            <p class="detail-desc">{{ selectedRoom.description }}</p>
            <div class="detail-stats">
              <span>🏮 当前 {{ selectedRoom.current_count || 0 }} 位学子在修习</span>
              <span>容量 {{ selectedRoom.capacity }} 人</span>
            </div>
          </div>

          <!-- Participants with status -->
          <div class="section-block">
            <h3 class="section-title">同窗学友</h3>
            <div class="participant-grid" v-if="participants.length">
              <div class="participant card" v-for="p in participants" :key="p.user_id">
                <div class="p-avatar-wrap">
                  <div class="p-avatar">{{ (p.nickname || p.username || '?')[0] }}</div>
                  <span v-if="participantStatuses[p.user_id]" class="status-dot" :class="'status-' + participantStatuses[p.user_id]"></span>
                </div>
                <div class="p-info">
                  <span class="p-name">{{ p.nickname || p.username }}</span>
                  <span v-if="participantStatuses[p.user_id]" class="p-status" :class="'status-text-' + participantStatuses[p.user_id]">
                    {{ statusLabel(participantStatuses[p.user_id]) }}
                  </span>
                </div>
              </div>
            </div>
            <p v-else class="empty-text">暂无学子修习</p>
          </div>

          <!-- Study Timer -->
          <div class="section-block">
            <h3 class="section-title">修习计时</h3>
            <div class="timer-card glass-card">
              <div class="timer-display">
                <span class="timer-value">{{ timerDisplay }}</span>
              </div>
              <div class="timer-type">
                <el-radio-group v-model="sessionType" size="small" :disabled="isStudying">
                  <el-radio-button value="free">自由学习</el-radio-button>
                  <el-radio-button value="pomodoro">番茄钟</el-radio-button>
                </el-radio-group>
              </div>
              <div class="timer-actions">
                <button v-if="!isStudying" class="btn-primary" @click="startStudy" :disabled="actionLoading">
                  {{ actionLoading ? '...' : '开始修习' }}
                </button>
                <template v-else>
                  <button class="btn-primary" style="background: var(--color-accent-bright);" @click="enterImmersive">
                    沉浸模式
                  </button>
                  <button class="btn-outline" style="border-color: var(--color-accent-bright); color: var(--color-accent-bright);" @click="endStudy" :disabled="actionLoading">
                    {{ actionLoading ? '...' : '结束修习' }}
                  </button>
                </template>
              </div>
            </div>
          </div>

          <!-- Open chat (only when joined) -->
          <div class="section-block" v-if="hasJoined && selectedRoom">
            <button class="btn-primary chat-open-btn" @click="openGlobalChat">
              🏮 打开论谈
            </button>
          </div>

          <!-- Actions -->
          <div class="detail-actions">
            <button v-if="!hasJoined" class="btn-primary" @click="joinRoom" :disabled="actionLoading">
              {{ actionLoading ? '...' : '入斋' }}
            </button>
            <button v-else class="btn-outline" @click="leaveRoom" :disabled="actionLoading">
              {{ actionLoading ? '...' : '离开书院' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Immersive Mode: Full-screen Study Environment -->
    <Transition name="immersive-fade">
      <div v-if="immersiveMode" class="immersive-overlay" :class="timeOfDayClass">
        <!-- Ink Wash Background Layers -->
        <div class="immersive-bg">
          <img
            v-for="layer in currentScene"
            :key="layer.src"
            :src="layer.src"
            class="immersive-layer"
            :class="layer.cls"
            alt=""
          />
        </div>
        <div class="immersive-dim"></div>

        <!-- Glass Panel: Timer (top-left) -->
        <div class="panel panel-timer glass-card">
          <div class="immersive-timer">{{ timerDisplay }}</div>
          <div class="immersive-room-name">{{ selectedRoom?.name }}</div>
          <div class="panel-timer-controls">
            <button class="btn-outline btn-sm" @click="exitImmersive">退出沉浸</button>
            <button class="btn-outline btn-sm" style="border-color: var(--color-accent-bright); color: var(--color-accent-bright);" @click="endStudy">结束修习</button>
          </div>
        </div>

        <!-- Glass Panel: Participants (right) -->
        <div class="panel panel-participants glass-card">
          <div class="panel-label">同窗 {{ participants.length }} 人</div>
          <div class="immersive-avatars">
            <div class="immersive-avatar" v-for="p in participants.slice(0, 8)" :key="p.user_id"
              :title="p.nickname || p.username">
              {{ (p.nickname || p.username || '?')[0] }}
            </div>
          </div>
        </div>

        <!-- Glass Panel: Ambient Sound (bottom-left) -->
        <div class="panel panel-sound glass-card">
          <AmbientSoundMixer :compact="isMobile" />
        </div>

        <!-- Bottom controls -->
        <div class="panel panel-bottom glass-card">
          <button class="btn-outline btn-sm" @click="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏'">
            {{ isFullscreen ? '退出全屏' : '全屏' }}
          </button>
        </div>

        <!-- Chat bubble (collapsed) -->
        <div v-if="!showImmersiveChat" class="chat-bubble" @click="showImmersiveChat = true">
          <span>💬</span>
          <span v-if="chatStore.unreadCount > 0" class="chat-badge">{{ chatStore.unreadCount }}</span>
        </div>

        <!-- Chat panel (expanded) -->
        <Transition name="chat-slide">
          <div v-if="showImmersiveChat" class="panel panel-chat glass-card">
            <div class="panel-chat-header">
              <span class="panel-label">学堂论谈</span>
              <button class="chat-close-btn" @click="showImmersiveChat = false">✕</button>
            </div>
            <RoomChat v-if="selectedRoom" :roomId="selectedRoom.id" :compact="true" />
          </div>
        </Transition>
      </div>
    </Transition>

    <AppFooter v-if="!immersiveMode" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import AppNavbar from '@/components/AppNavbar.vue'
import BackButton from '@/components/BackButton.vue'
import AppFooter from '@/components/AppFooter.vue'
import AmbientSoundMixer from '@/components/AmbientSoundMixer.vue'
import RoomChat from '@/components/RoomChat.vue'
import { roomAPI, sessionAPI } from '@/api/study'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { getSocket } from '@/composables/useSocket'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const chatStore = useChatStore()
const roomIcons = ['📖', '💡', '🌙', '🎯', '📚']

// Scene definitions — each room gets a scene based on room.id % 4
const scenes = [
  // Scene 0: Mountains
  [
    { src: new URL('@/assets/textures/ink-mountains-far.svg', import.meta.url).href, cls: 'layer-far' },
    { src: new URL('@/assets/textures/ink-mist.svg', import.meta.url).href, cls: 'layer-mist' },
    { src: new URL('@/assets/textures/ink-mountains-mid.svg', import.meta.url).href, cls: 'layer-mid' },
    { src: new URL('@/assets/textures/ink-clouds.svg', import.meta.url).href, cls: 'layer-cloud' },
    { src: new URL('@/assets/textures/ink-mountains-near.svg', import.meta.url).href, cls: 'layer-near' },
  ],
  // Scene 1: Bamboo + Moon
  [
    { src: new URL('@/assets/textures/ink-moon.svg', import.meta.url).href, cls: 'layer-moon' },
    { src: new URL('@/assets/textures/bamboo.svg', import.meta.url).href, cls: 'layer-bamboo' },
    { src: new URL('@/assets/textures/ink-mist.svg', import.meta.url).href, cls: 'layer-mist' },
    { src: new URL('@/assets/textures/ink-clouds.svg', import.meta.url).href, cls: 'layer-cloud' },
  ],
  // Scene 2: Water + Moon
  [
    { src: new URL('@/assets/textures/ink-moon.svg', import.meta.url).href, cls: 'layer-moon' },
    { src: new URL('@/assets/textures/ink-mountains-far.svg', import.meta.url).href, cls: 'layer-far' },
    { src: new URL('@/assets/textures/ink-clouds.svg', import.meta.url).href, cls: 'layer-cloud' },
    { src: new URL('@/assets/textures/ink-water.svg', import.meta.url).href, cls: 'layer-water' },
  ],
  // Scene 3: Pine + Mountains
  [
    { src: new URL('@/assets/textures/ink-mountains-far.svg', import.meta.url).href, cls: 'layer-far' },
    { src: new URL('@/assets/textures/pine-branch.svg', import.meta.url).href, cls: 'layer-pine' },
    { src: new URL('@/assets/textures/ink-mist.svg', import.meta.url).href, cls: 'layer-mist' },
    { src: new URL('@/assets/textures/ink-mountains-near.svg', import.meta.url).href, cls: 'layer-near' },
  ],
]

const rooms = ref([])
const selectedRoom = ref(null)
const participants = ref([])
const sessionType = ref('free')
const isStudying = ref(false)
const activeSessionId = ref(null)
const actionLoading = ref(false)
const timerSeconds = ref(0)
const immersiveMode = ref(false)
const isFullscreen = ref(false)
const isMobile = ref(window.innerWidth < 768)
const showImmersiveChat = ref(false)
const participantStatuses = ref({})
let timerInterval = null

// Socket.IO for real-time participant updates
let currentSocketRoomId = null

function joinSocketRoom(roomId) {
  const sock = getSocket()
  if (currentSocketRoomId) sock.emit('room:leave', currentSocketRoomId)
  sock.emit('room:join', roomId)
  currentSocketRoomId = roomId
}

function onSocketParticipants(data) {
  if (selectedRoom.value) {
    participants.value = data.participants || []
  }
}

watch(selectedRoom, (room) => {
  if (room) joinSocketRoom(room.id)
})

const currentScene = computed(() => {
  if (!selectedRoom.value) return scenes[0]
  return scenes[selectedRoom.value.id % 4]
})

const timeOfDayClass = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return 'time-night'
  if (h < 11) return 'time-morning'
  if (h < 17) return 'time-afternoon'
  if (h < 20) return 'time-evening'
  return 'time-night'
})

const timerDisplay = computed(() => {
  const m = Math.floor(timerSeconds.value / 60).toString().padStart(2, '0')
  const s = (timerSeconds.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

const hasJoined = computed(() => {
  if (!userStore.isLoggedIn || !selectedRoom.value) return false
  return participants.value.some(p => p.user_id === userStore.user?.userId)
})

function progress(room) {
  return Math.min(100, Math.round(((room.current_count || 0) / (room.capacity || 1)) * 100))
}

async function fetchRooms() {
  try {
    const res = await roomAPI.getList()
    rooms.value = res.data || []
    if (rooms.value.length && !selectedRoom.value) {
      selectRoom(rooms.value[0])
    }
  } catch { /* ignore */ }
}

async function selectRoom(room) {
  selectedRoom.value = room
  try {
    const res = await roomAPI.getParticipants(room.id)
    participants.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch participants:', err)
    participants.value = []
  }
}

async function joinRoom() {
  if (!userStore.isLoggedIn) return ElMessage.warning('请先登录')
  actionLoading.value = true
  try {
    await roomAPI.join(selectedRoom.value.id)
    ElMessage.success('已加入书院')
    await selectRoom(selectedRoom.value)
  } catch (err) { ElMessage.error(err.message) }
  finally { actionLoading.value = false }
}

async function leaveRoom() {
  actionLoading.value = true
  try {
    await roomAPI.leave(selectedRoom.value.id)
    if (isStudying.value) await endStudy()
    ElMessage.success('已离开书院')
    await selectRoom(selectedRoom.value)
  } catch (err) { ElMessage.error(err.message) }
  finally { actionLoading.value = false }
}

async function startStudy() {
  if (!userStore.isLoggedIn) return ElMessage.warning('请先登录')
  actionLoading.value = true
  try {
    const res = await sessionAPI.start({
      roomId: selectedRoom.value.id,
      sessionType: sessionType.value
    })
    activeSessionId.value = res.data.sessionId
    isStudying.value = true
    timerSeconds.value = 0
    timerInterval = setInterval(() => { timerSeconds.value++ }, 1000)
    ElMessage.success('开始修习')
    // Broadcast status
    const sock = getSocket()
    sock.emit('status:update', {
      roomId: selectedRoom.value.id,
      status: sessionType.value === 'pomodoro' ? 'pomodoro' : 'studying',
      elapsedSeconds: 0
    })
  } catch (err) { ElMessage.error(err.message) }
  finally { actionLoading.value = false }
}

async function endStudy() {
  if (!activeSessionId.value) return
  actionLoading.value = true
  try {
    const res = await sessionAPI.end(activeSessionId.value)
    clearInterval(timerInterval)
    isStudying.value = false
    activeSessionId.value = null
    if (immersiveMode.value) exitImmersive()
    ElMessage.success(`修习结束，共 ${res.data.durationMinutes} 分钟`)
    // Broadcast idle status
    if (selectedRoom.value) {
      const sock = getSocket()
      sock.emit('status:update', { roomId: selectedRoom.value.id, status: 'idle' })
    }
  } catch (err) { ElMessage.error(err.message) }
  finally { actionLoading.value = false }
}

function enterImmersive() {
  immersiveMode.value = true
  document.body.style.overflow = 'hidden'
}

function exitImmersive() {
  immersiveMode.value = false
  document.body.style.overflow = ''
  if (isFullscreen.value) toggleFullscreen()
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().then(() => { isFullscreen.value = true }).catch(() => {})
  } else {
    document.exitFullscreen().then(() => { isFullscreen.value = false }).catch(() => {})
  }
}

function onResize() { isMobile.value = window.innerWidth < 768 }

function statusLabel(status) {
  return { studying: '学习中', pomodoro: '番茄钟', idle: '小憩', away: '离开' }[status] || ''
}

function openGlobalChat() {
  if (selectedRoom.value) {
    chatStore.openChat(selectedRoom.value.id)
  }
}

// Recover active session timer from server
async function recoverActiveSession() {
  if (!userStore.isLoggedIn) return
  try {
    const res = await sessionAPI.getActive()
    const session = res.data
    if (session && session.start_time) {
      const start = new Date(session.start_time)
      const elapsed = Math.floor((Date.now() - start.getTime()) / 1000)
      if (elapsed > 0 && elapsed < 8 * 3600) {
        activeSessionId.value = session.id
        isStudying.value = true
        sessionType.value = session.session_type || 'free'
        timerSeconds.value = elapsed
        timerInterval = setInterval(() => { timerSeconds.value++ }, 1000)
      } else {
        // Session too old, auto-close it
        await sessionAPI.abandonActive()
      }
    }
  } catch { /* no active session, ignore */ }
}

// Socket event handlers for status sync
function onSocketStatusUpdate(data) {
  if (selectedRoom.value) {
    participantStatuses.value = { ...participantStatuses.value, [data.userId]: data.status }
  }
}

onMounted(() => {
  fetchRooms()
  recoverActiveSession()
  chatStore.fetchRoomList()
  window.addEventListener('resize', onResize)
  const sock = getSocket()
  sock.on('room:participants', onSocketParticipants)
  sock.on('status:update', onSocketStatusUpdate)
})
onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  window.removeEventListener('resize', onResize)
  document.body.style.overflow = ''
  const sock = getSocket()
  sock.off('room:participants', onSocketParticipants)
  sock.off('status:update', onSocketStatusUpdate)
  if (currentSocketRoomId) sock.emit('room:leave', currentSocketRoomId)
})
</script>

<style scoped>
.page-wrapper { min-height: 100vh; background: var(--color-bg-primary); }
.page-title { font-family: var(--font-title); font-size: 1.8rem; margin-bottom: 24px; text-align: center; }

.rooms-layout { display: flex; gap: 24px; }
.room-list { flex: 0 0 280px; display: flex; flex-direction: column; gap: 12px; }

/* Chat sidebar */
.chat-sidebar {
  margin-top: 24px; padding-top: 16px;
  border-top: 1px solid var(--color-border-light);
}
.chat-sidebar-title {
  font-family: var(--font-title); font-size: 0.9rem;
  color: var(--color-text-primary); margin-bottom: 10px;
  padding-left: 8px; border-left: 3px solid var(--color-accent);
}
.chat-sidebar-list { display: flex; flex-direction: column; gap: 4px; }
.chat-sidebar-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; border-radius: 6px; cursor: pointer;
  font-size: 0.85rem; transition: background 0.15s;
}
.chat-sidebar-item:hover { background: var(--color-bg-secondary); }
.csi-name { color: var(--color-text-primary); }
.csi-meta { font-size: 0.75rem; color: var(--color-text-secondary); }
.chat-sidebar-empty { text-align: center; color: var(--color-text-secondary); padding: 16px 0; font-size: 0.85rem; }

.room-item {
  display: flex; align-items: center; gap: 12px; padding: 16px;
  cursor: pointer; transition: all 0.2s; border: 1px solid transparent;
}
.room-item:hover { transform: translateX(4px); }
.room-item.active { border-color: var(--color-accent); background: var(--color-accent-light); }
.room-icon { font-size: 1.8rem; }
.room-info { flex: 1; }
.room-info h3 { font-family: var(--font-title); font-size: 1rem; margin-bottom: 6px; }
.room-progress { display: flex; align-items: center; gap: 8px; }
.progress-bar { flex: 1; height: 4px; background: var(--color-bg-secondary); border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--color-accent); border-radius: 2px; transition: width 0.4s; }
.room-progress span { font-size: 0.75rem; color: var(--color-text-secondary); white-space: nowrap; }

.room-detail { flex: 1; }
.detail-header { padding: 24px; margin-bottom: 24px; }
.detail-header h2 { font-family: var(--font-title); font-size: 1.5rem; margin-bottom: 8px; }
.detail-desc { font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 12px; }
.detail-stats { display: flex; gap: 24px; font-size: 0.85rem; color: var(--color-text-secondary); }

.section-block { margin-bottom: 24px; }
.section-title { font-family: var(--font-title); font-size: 1.1rem; margin-bottom: 12px; padding-left: 8px; border-left: 3px solid var(--color-accent); }

.participant-grid { display: flex; flex-wrap: wrap; gap: 12px; }
.participant { display: flex; align-items: center; gap: 8px; padding: 8px 14px; }
.p-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--color-green); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-family: var(--font-title); }
.p-name { font-size: 0.85rem; }
.empty-text { color: var(--color-text-secondary); font-size: 0.9rem; padding: 20px 0; text-align: center; }

.timer-card { padding: 32px; text-align: center; }
.timer-display { margin-bottom: 20px; }
.timer-value { font-family: var(--font-mono); font-size: 3rem; font-weight: 700; color: var(--color-accent); }
.timer-type { margin-bottom: 20px; }
.timer-actions { display: flex; justify-content: center; gap: 12px; }
.detail-actions { text-align: center; margin-top: 16px; }
.chat-open-btn {
  width: 100%;
  background: var(--color-blue);
  border-color: var(--color-blue);
}
.chat-open-btn:hover { opacity: 0.9; }

/* ═══════════════════ Immersive Mode ═══════════════════ */
.immersive-overlay {
  position: fixed;
  inset: 0;
  z-index: 900;
  background: #0a0a0a;
  overflow: hidden;
}

.immersive-bg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.immersive-layer {
  position: absolute;
  pointer-events: none;
}

.layer-far {
  bottom: 0; width: 140%; left: -20%;
  filter: brightness(1.5);
}
.layer-mid {
  bottom: 0; width: 130%; left: -10%;
  filter: brightness(1.3);
}
.layer-near {
  bottom: 0; width: 120%; left: -5%;
  filter: brightness(1.2);
}
.layer-mist {
  bottom: 15%; width: 110%; left: -5%;
  opacity: 0.7;
  animation: mist-drift 30s ease-in-out infinite alternate;
}
.layer-cloud {
  bottom: 25%; width: 50%; left: 10%;
  opacity: 0.6;
  animation: cloud-drift 40s ease-in-out infinite alternate;
}
.layer-moon {
  top: 8%; right: 12%; width: 150px;
  opacity: 0.8;
  animation: moon-float 12s ease-in-out infinite alternate;
}
.layer-bamboo {
  left: -5%; bottom: 0; width: 200px;
  filter: brightness(1.4);
}
.layer-pine {
  top: -10%; right: -20px; width: 250px;
  opacity: 0.15;
  filter: brightness(1.4);
}
.layer-water {
  bottom: 0; width: 140%; left: -20%;
  opacity: 0.5;
  animation: water-float 6s ease-in-out infinite alternate;
}

@keyframes mist-drift {
  from { transform: translateX(-3%); }
  to { transform: translateX(3%); }
}
@keyframes cloud-drift {
  from { transform: translateX(0); }
  to { transform: translateX(15%); }
}
@keyframes moon-float {
  from { transform: translateY(0); }
  to { transform: translateY(-8px); }
}
@keyframes water-float {
  from { transform: translateY(0); }
  to { transform: translateY(-4px); }
}

/* Dim overlay */
.immersive-dim {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 100%);
  pointer-events: none;
}

/* Time-of-day filters */
.time-morning .immersive-bg { filter: brightness(0.9) saturate(0.7) sepia(0.05); }
.time-afternoon .immersive-bg { filter: brightness(0.85) saturate(0.8); }
.time-evening .immersive-bg { filter: brightness(0.6) saturate(0.5) sepia(0.15); }
.time-night .immersive-bg { filter: brightness(0.35) saturate(0.3); }
.time-night .immersive-dim { background: radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.6) 100%); }

/* Glass Panels */
.panel {
  position: absolute;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: var(--border-radius);
  padding: 16px;
}

.panel-timer {
  top: 24px; left: 24px;
}
.immersive-timer {
  font-family: var(--font-mono);
  font-size: 3.5rem;
  font-weight: 700;
  color: #f5f0e8;
  letter-spacing: 4px;
}
.immersive-room-name {
  font-family: var(--font-title);
  font-size: 1rem;
  color: rgba(245, 240, 232, 0.6);
  margin-top: 4px;
}
.panel-timer-controls {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.panel-timer-controls .btn-outline {
  border-color: rgba(245, 240, 232, 0.3);
  color: rgba(245, 240, 232, 0.7);
  font-size: 0.8rem;
  padding: 6px 12px;
}
.panel-timer-controls .btn-outline:hover {
  background: rgba(245, 240, 232, 0.1);
}

.panel-participants {
  top: 24px; right: 24px;
}
.panel-label {
  font-family: var(--font-title);
  font-size: 0.85rem;
  color: rgba(245, 240, 232, 0.6);
  margin-bottom: 8px;
}
.immersive-avatars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.immersive-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--color-green); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-title); font-size: 0.8rem;
}

.panel-sound {
  bottom: 24px; left: 24px;
}

.panel-bottom {
  bottom: 24px; right: 24px;
}
.panel-bottom .btn-outline {
  border-color: rgba(245, 240, 232, 0.3);
  color: rgba(245, 240, 232, 0.7);
  padding: 6px 12px;
}
.panel-bottom .btn-outline:hover {
  background: rgba(245, 240, 232, 0.1);
}

/* Immersive Transition */
.immersive-fade-enter-active {
  transition: opacity 0.5s ease;
}
.immersive-fade-leave-active {
  transition: opacity 0.3s ease;
}
.immersive-fade-enter-from,
.immersive-fade-leave-to {
  opacity: 0;
}

/* ═══════════════════ Participant Status ═══════════════════ */
.p-avatar-wrap {
  position: relative;
}
.status-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--color-bg-primary);
}
.status-dot.status-studying { background: #2E5C4C; }
.status-dot.status-pomodoro { background: #8B2500; }
.status-dot.status-idle { background: #B8860B; }
.status-dot.status-away { background: #999; }

.p-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.p-status {
  font-size: 0.7rem;
  font-family: var(--font-title);
}
.status-text-studying { color: #2E5C4C; }
.status-text-pomodoro { color: #8B2500; }
.status-text-idle { color: #B8860B; }
.status-text-away { color: #999; }

/* ═══════════════════ Immersive Chat Bubble & Panel ═══════════════════ */
.chat-bubble {
  position: fixed;
  bottom: 80px;
  right: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.2rem;
  transition: transform 0.2s;
  z-index: 910;
}
.chat-bubble:hover {
  transform: scale(1.05);
}
.chat-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background: var(--color-accent);
  color: #fff;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  animation: badge-pulse 2s ease-in-out infinite;
}
@keyframes badge-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.panel-chat {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 360px;
  max-height: 420px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(245, 240, 232, 0.15);
  z-index: 910;
  overflow: hidden;
}
.panel-chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.chat-close-btn {
  background: none;
  border: none;
  color: rgba(245, 240, 232, 0.6);
  font-size: 1rem;
  cursor: pointer;
  padding: 2px 6px;
}
.chat-close-btn:hover {
  color: rgba(245, 240, 232, 0.9);
}

/* Chat slide transition */
.chat-slide-enter-active {
  transition: all 0.3s ease;
}
.chat-slide-leave-active {
  transition: all 0.2s ease;
}
.chat-slide-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.chat-slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* ═══════════════════ Responsive ═══════════════════ */
@media (max-width: 768px) {
  .rooms-layout { flex-direction: column; }
  .room-list { flex: none; flex-direction: row; overflow-x: auto; padding-bottom: 8px; }
  .room-item { min-width: 200px; }

  .panel-timer { top: 16px; left: 16px; padding: 12px; }
  .immersive-timer { font-size: 2.5rem; }
  .panel-participants { top: 16px; right: 16px; }
  .immersive-avatars { flex-direction: row; flex-wrap: wrap; }
  .panel-sound { bottom: 16px; left: 16px; }
  .panel-bottom { bottom: 16px; right: 16px; }

  .panel-chat {
    width: calc(100% - 32px);
    right: 16px;
    bottom: 16px;
  }
  .chat-bubble {
    bottom: 60px;
    right: 16px;
  }
}
</style>
