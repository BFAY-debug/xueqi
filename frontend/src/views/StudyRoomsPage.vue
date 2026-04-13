<template>
  <div class="page-wrapper">
    <AppNavbar />
    <div class="page-content container" style="margin-top: var(--nav-height); padding-top: 24px;">
      <h2 class="page-title">书院</h2>

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

          <!-- Participants -->
          <div class="section-block">
            <h3 class="section-title">同窗学友</h3>
            <div class="participant-grid" v-if="participants.length">
              <div class="participant card" v-for="p in participants" :key="p.user_id">
                <div class="p-avatar">{{ (p.nickname || p.username || '?')[0] }}</div>
                <span class="p-name">{{ p.nickname || p.username }}</span>
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
                <el-button v-if="!isStudying" type="primary" @click="startStudy" :loading="actionLoading">
                  开始修习
                </el-button>
                <template v-else>
                  <el-button type="danger" @click="endStudy" :loading="actionLoading">
                    结束修习
                  </el-button>
                </template>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="detail-actions">
            <el-button v-if="!hasJoined" type="primary" @click="joinRoom" :loading="actionLoading">入斋</el-button>
            <el-button v-else @click="leaveRoom" :loading="actionLoading">离开书院</el-button>
          </div>
        </div>
      </div>
    </div>
    <AppFooter />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppFooter from '@/components/AppFooter.vue'
import { roomAPI, sessionAPI } from '@/api/study'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const roomIcons = ['📖', '💡', '🌙', '🎯', '📚']

const rooms = ref([])
const selectedRoom = ref(null)
const participants = ref([])
const sessionType = ref('free')
const isStudying = ref(false)
const activeSessionId = ref(null)
const actionLoading = ref(false)
const timerSeconds = ref(0)
let timerInterval = null

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
  return Math.min(100, Math.round(((room.current_count || 0) / room.capacity) * 100))
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
  } catch { participants.value = [] }
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
    ElMessage.success(`修习结束，共 ${res.data.durationMinutes} 分钟`)
  } catch (err) { ElMessage.error(err.message) }
  finally { actionLoading.value = false }
}

onMounted(fetchRooms)
onUnmounted(() => { if (timerInterval) clearInterval(timerInterval) })
</script>

<style scoped>
.page-wrapper { min-height: 100vh; background: var(--color-bg-primary); }
.page-title { font-family: var(--font-title); font-size: 1.8rem; margin-bottom: 24px; text-align: center; }

.rooms-layout { display: flex; gap: 24px; }
.room-list { flex: 0 0 280px; display: flex; flex-direction: column; gap: 12px; }

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

@media (max-width: 768px) {
  .rooms-layout { flex-direction: column; }
  .room-list { flex: none; flex-direction: row; overflow-x: auto; padding-bottom: 8px; }
  .room-item { min-width: 200px; }
}
</style>
