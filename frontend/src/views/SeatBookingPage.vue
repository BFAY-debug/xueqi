<template>
  <div class="page-wrapper theme-seat">
    <AppNavbar />
    <div class="page-content container" style="margin-top: var(--nav-height); padding-top: 24px;">
      <BackButton />
      <div class="page-header-decorated">
        <h2 class="page-title">🪑 占座</h2>
        <p class="page-subtitle">占得先机，安心修习</p>
      </div>

      <!-- Ban warning -->
      <div v-if="penalty.isActive" class="ban-warning card">
        <span>⚠️ 因累计 {{ penalty.penaltyCount }} 次违约，暂不可预约至 {{ formatDate(penalty.banUntil) }}</span>
        <router-link to="/seat-booking#volunteer" class="btn-outline btn-sm">查看志愿任务</router-link>
      </div>

      <!-- Locations -->
      <div class="location-grid">
        <div
          v-for="loc in locations" :key="loc.id"
          class="location-card card"
          :class="{ active: selectedLocation?.id === loc.id }"
          @click="selectLocation(loc)"
        >
          <h3>{{ loc.name }}</h3>
          <p class="loc-info">{{ loc.building }} · {{ loc.floor }}F</p>
          <p class="loc-seats">空闲 {{ loc.available_seats || 0 }}/{{ loc.total_seats }}</p>
        </div>
      </div>

      <!-- Seat Map -->
      <div v-if="selectedLocation" class="seat-section">
        <div class="divider">{{ selectedLocation.name }} · {{ selectedLocation.floor }}F</div>
        <div class="seat-grid">
          <div
            v-for="seat in seats" :key="seat.id"
            class="seat-cell"
            :class="seatClass(seat)"
            :title="seatTitle(seat)"
            @click="openReserve(seat)"
          >
            {{ seat.has_power ? '⚡' : '' }}
            <span class="seat-label">{{ seat.seat_code }}</span>
          </div>
        </div>
        <div class="seat-legend">
          <span><i class="dot available"></i>空闲</span>
          <span><i class="dot occupied"></i>已占</span>
          <span><i class="dot reserved"></i>已预约</span>
          <span><i class="dot maintenance"></i>维护中</span>
        </div>
      </div>

      <!-- My Reservations -->
      <div class="section-block">
        <h3 class="section-title">我的预约</h3>
        <div v-if="myReservations.length" class="reservation-list">
          <div v-for="r in myReservations" :key="r.id" class="reservation-item card">
            <div class="res-info">
              <span class="res-date">📅 {{ r.reserve_date }}</span>
              <span>{{ r.location_name }} {{ r.seat_code }}</span>
              <span>{{ r.start_time?.slice(0,5) }} - {{ r.end_time?.slice(0,5) }}</span>
            </div>
            <div class="res-status">
              <el-tag :type="statusType(r.status)" size="small">{{ statusText(r.status) }}</el-tag>
              <el-button v-if="r.status === 'pending'" type="primary" size="small" @click="checkin(r.id)">签到</el-button>
              <el-button v-if="r.status === 'pending' || r.status === 'checked_in'" size="small" @click="cancel(r.id)">取消</el-button>
            </div>
          </div>
        </div>
        <p v-else class="empty-text">暂无预约</p>
      </div>
    </div>

    <!-- Reserve Dialog -->
    <el-dialog v-model="showDialog" title="预约座位" width="400px">
      <el-form :model="reserveForm" label-width="80px">
        <el-form-item label="日期">
          <el-date-picker v-model="reserveForm.reserveDate" type="date" value-format="YYYY-MM-DD" :disabled-date="d => d < new Date()" style="width:100%" />
        </el-form-item>
        <el-form-item label="开始时间">
          <el-time-select v-model="reserveForm.startTime" start="07:00" step="01:00" end="21:00" style="width:100%" />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-time-select v-model="reserveForm.endTime" start="08:00" step="01:00" end="22:00" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="submitReserve" :loading="submitting">确认预约</el-button>
      </template>
    </el-dialog>

    <AppFooter />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppNavbar from '@/components/AppNavbar.vue'
import BackButton from '@/components/BackButton.vue'
import AppFooter from '@/components/AppFooter.vue'
import { locationAPI, reservationAPI } from '@/api/study'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const locations = ref([])
const selectedLocation = ref(null)
const seats = ref([])
const myReservations = ref([])
const penalty = ref({ penaltyCount: 0, banUntil: null, isActive: false })

const showDialog = ref(false)
const submitting = ref(false)
const selectedSeat = ref(null)
const reserveForm = ref({ reserveDate: '', startTime: '', endTime: '' })

function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '' }
function seatClass(seat) {
  const rsv = seat.current_reservation_status
  if (seat.status === 'maintenance') return 'maintenance'
  if (rsv === 'pending' || rsv === 'checked_in') return 'reserved'
  if (seat.status === 'occupied') return 'occupied'
  return 'available'
}
function seatTitle(seat) {
  return `${seat.seat_code} ${seat.has_power ? '(有电源)' : ''} - ${seat.status}`
}
function statusType(s) {
  return { pending: 'warning', checked_in: 'success', completed: 'info', cancelled: 'info', no_show: 'danger' }[s] || 'info'
}
function statusText(s) {
  return { pending: '待签到', checked_in: '已签到', completed: '已完成', cancelled: '已取消', no_show: '违约' }[s] || s
}

async function fetchData() {
  try {
    const [locRes, resRes] = await Promise.all([
      locationAPI.getList(),
      userStore.isLoggedIn ? reservationAPI.getMy({ pageSize: 10 }) : Promise.resolve({ data: [] })
    ])
    locations.value = locRes.data || []
    myReservations.value = resRes.data || []

    if (userStore.isLoggedIn) {
      try {
        const penRes = await reservationAPI.getMyPenalty()
        penalty.value = penRes.data
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}

async function selectLocation(loc) {
  selectedLocation.value = loc
  try {
    const res = await locationAPI.getSeats(loc.id)
    seats.value = res.data || []
  } catch { seats.value = [] }
}

function openReserve(seat) {
  if (seat.status === 'maintenance' || seat.current_reservation_status) return
  if (!userStore.isLoggedIn) return ElMessage.warning('请先登录')
  if (penalty.value.isActive) return ElMessage.warning('你当前被禁止预约')
  selectedSeat.value = seat
  reserveForm.value = { reserveDate: new Date().toISOString().slice(0, 10), startTime: '', endTime: '' }
  showDialog.value = true
}

async function submitReserve() {
  const { reserveDate, startTime, endTime } = reserveForm.value
  if (!reserveDate || !startTime || !endTime) return ElMessage.warning('请填写完整预约信息')
  submitting.value = true
  try {
    await reservationAPI.reserve(selectedSeat.value.id, { reserveDate, startTime, endTime })
    ElMessage.success('预约成功')
    showDialog.value = false
    await selectLocation(selectedLocation.value)
    await fetchData()
  } catch (err) { ElMessage.error(err.message) }
  finally { submitting.value = false }
}

async function checkin(id) {
  try {
    await reservationAPI.checkin(id)
    ElMessage.success('签到成功')
    await fetchData()
  } catch (err) { ElMessage.error(err.message) }
}

async function cancel(id) {
  try {
    await reservationAPI.cancel(id)
    ElMessage.success('已取消预约')
    await fetchData()
    if (selectedLocation.value) await selectLocation(selectedLocation.value)
  } catch (err) { ElMessage.error(err.message) }
}

onMounted(fetchData)
</script>

<style scoped>
.page-wrapper { min-height: 100vh; background: var(--color-bg-primary); }
.page-title { font-family: var(--font-title); font-size: 1.8rem; margin-bottom: 24px; text-align: center; }

.ban-warning { padding: 14px 20px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; border-left: 3px solid var(--color-accent); background: rgba(139,37,0,0.06); }

.location-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
.location-card { padding: 16px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
.location-card:hover { transform: translateY(-2px); }
.location-card.active { border-color: var(--color-accent); }
.location-card h3 { font-family: var(--font-title); font-size: 1.1rem; margin-bottom: 4px; }
.loc-info { font-size: 0.8rem; color: var(--color-text-secondary); margin-bottom: 4px; }
.loc-seats { font-size: 0.85rem; color: var(--color-green); }

.seat-section { margin-bottom: 32px; }
.seat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); gap: 8px; padding: 20px; background: var(--glass-bg-card); border: var(--glass-border); border-radius: var(--border-radius); }
.seat-cell { width: 56px; height: 44px; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 0.65rem; cursor: pointer; transition: all 0.2s; border: 1px solid var(--color-border); background: rgba(245,240,232,0.9); }
.seat-cell.available { background: rgba(46,92,76,0.1); }
.seat-cell.available:hover { background: rgba(46,92,76,0.25); transform: scale(1.05); }
.seat-cell.occupied { background: rgba(44,44,44,0.15); cursor: not-allowed; opacity: 0.6; }
.seat-cell.reserved { background: rgba(139,37,0,0.12); cursor: not-allowed; opacity: 0.7; }
.seat-cell.maintenance { background: #eee; cursor: not-allowed; opacity: 0.4; }
.seat-label { font-size: 0.6rem; color: var(--color-text-secondary); }

.seat-legend { display: flex; gap: 16px; margin-top: 12px; justify-content: center; font-size: 0.8rem; color: var(--color-text-secondary); }
.seat-legend .dot { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 4px; vertical-align: middle; }
.dot.available { background: rgba(46,92,76,0.2); }
.dot.occupied { background: rgba(44,44,44,0.3); }
.dot.reserved { background: rgba(139,37,0,0.2); }
.dot.maintenance { background: #ddd; }

.section-block { margin-bottom: 32px; }
.section-title { font-family: var(--font-title); font-size: 1.1rem; margin-bottom: 12px; padding-left: 8px; border-left: 3px solid var(--color-accent); }
.reservation-list { display: flex; flex-direction: column; gap: 12px; }
.reservation-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; }
.res-info { display: flex; gap: 16px; font-size: 0.9rem; }
.res-date { font-weight: 600; }
.res-status { display: flex; align-items: center; gap: 8px; }
.empty-text { color: var(--color-text-secondary); font-size: 0.9rem; text-align: center; padding: 20px; }
</style>
