<template>
  <div class="page-wrapper">
    <AppNavbar />
    <div class="page-content container" style="margin-top: var(--nav-height); padding-top: 24px;">
      <h2 class="page-title">我的书斋</h2>

      <!-- Profile Card -->
      <div class="profile-card glass-card" v-if="userStore.user">
        <div class="profile-avatar">
          <img v-if="userStore.user.avatar_url" :src="userStore.user.avatar_url" alt="avatar" />
          <div v-else class="avatar-placeholder">{{ userStore.user.nickname?.[0] || '学' }}</div>
          <el-button size="small" @click="triggerUpload">更换头像</el-button>
          <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="uploadAvatar" />
        </div>
        <div class="profile-info">
          <div class="info-row"><label>昵称</label><span>{{ userStore.user.nickname }}</span></div>
          <div class="info-row"><label>等级</label><span class="seal" :class="`seal--level-${userStore.user.level_id || 1}`">{{ userStore.user.level_name || '书童' }}</span></div>
          <div class="info-row"><label>积分</label><span class="points-value">{{ stats.total_points || 0 }}</span></div>
          <div class="info-row"><label>签名</label><span>{{ userStore.user.bio || '暂无签名' }}</span></div>
          <el-button size="small" @click="showEdit = true" style="margin-top:8px">编辑书斋</el-button>
        </div>
      </div>

      <!-- Tabs -->
      <el-tabs v-model="activeTab" class="profile-tabs">
        <!-- Study Stats -->
        <el-tab-pane label="修习数据" name="stats">
          <div class="stats-grid">
            <div class="stat-card card"><span class="stat-val">{{ Math.floor((stats.total_study_minutes || 0) / 60) }}</span><span class="stat-lbl">总修习时辰</span></div>
            <div class="stat-card card"><span class="stat-val">{{ stats.total_pomodoros || 0 }}</span><span class="stat-lbl">番茄钟次数</span></div>
            <div class="stat-card card"><span class="stat-val">{{ stats.checkin_streak || 0 }} 🔥</span><span class="stat-lbl">连续签到</span></div>
            <div class="stat-card card"><span class="stat-val">{{ stats.daily_points || 0 }}</span><span class="stat-lbl">今日积分</span></div>
          </div>
        </el-tab-pane>

        <!-- Points Log -->
        <el-tab-pane label="积分明细" name="points">
          <div class="log-list">
            <div v-for="log in pointsLog" :key="log.id" class="log-item">
              <span class="log-desc">{{ log.description }}</span>
              <span class="log-points" :class="{ positive: log.points > 0, negative: log.points < 0 }">{{ log.points > 0 ? '+' : '' }}{{ log.points }}</span>
              <span class="log-time">{{ formatDate(log.created_at) }}</span>
            </div>
            <p v-if="!pointsLog.length" class="empty-text">暂无积分记录</p>
          </div>
        </el-tab-pane>

        <!-- Notifications -->
        <el-tab-pane label="通知" name="notifications">
          <div class="notif-list">
            <div v-for="n in notifications" :key="n.id" class="notif-item" :class="{ unread: !n.is_read }">
              <div class="notif-title">{{ n.title }}</div>
              <div class="notif-content">{{ n.content }}</div>
              <div class="notif-time">{{ formatDate(n.created_at) }}</div>
            </div>
            <p v-if="!notifications.length" class="empty-text">暂无通知</p>
          </div>
        </el-tab-pane>

        <!-- Penalty -->
        <el-tab-pane label="预约/违约" name="penalty">
          <div class="penalty-info card" v-if="penalty.isActive">
            <p>⚠️ 本月违约 {{ penalty.penaltyCount }} 次，禁预约至 {{ formatDate(penalty.banUntil) }}</p>
          </div>
          <div v-else class="penalty-info card">
            <p>✅ 当前无违约记录，可正常预约座位</p>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- Edit Dialog -->
    <el-dialog v-model="showEdit" title="编辑书斋" width="450px">
      <el-form :model="editForm" label-width="60px">
        <el-form-item label="昵称"><el-input v-model="editForm.nickname" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="editForm.email" /></el-form-item>
        <el-form-item label="签名"><el-input v-model="editForm.bio" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEdit = false">取消</el-button>
        <el-button type="primary" @click="saveProfile" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <AppFooter />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useUserStore } from '@/stores/user'
import { userAPI, pointsAPI, notificationAPI } from '@/api/user'
import { reservationAPI } from '@/api/study'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const activeTab = ref('stats')
const showEdit = ref(false)
const saving = ref(false)
const fileInput = ref(null)

const stats = ref({})
const pointsLog = ref([])
const notifications = ref([])
const penalty = ref({ penaltyCount: 0, banUntil: null, isActive: false })

const editForm = reactive({ nickname: '', email: '', bio: '' })

function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '' }

async function fetchStats() {
  try {
    if (userStore.user) {
      const res = await userAPI.getUserStats(userStore.user.userId)
      stats.value = res.data || {}
    }
  } catch { /* ignore */ }
}

async function fetchPointsLog() {
  try {
    const res = await pointsAPI.getPointsLog({ pageSize: 20 })
    pointsLog.value = res.data || []
  } catch { /* ignore */ }
}

async function fetchNotifications() {
  try {
    const res = await notificationAPI.getList({ pageSize: 30 })
    notifications.value = res.data || []
  } catch { /* ignore */ }
}

async function fetchPenalty() {
  try {
    const res = await reservationAPI.getMyPenalty()
    penalty.value = res.data
  } catch { /* ignore */ }
}

function triggerUpload() { fileInput.value?.click() }

async function uploadAvatar(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    await userAPI.uploadAvatar(file)
    await userStore.fetchProfile()
    ElMessage.success('头像已更新')
  } catch (err) { ElMessage.error(err.message) }
}

async function saveProfile() {
  saving.value = true
  try {
    await userAPI.updateProfile(editForm)
    await userStore.fetchProfile()
    ElMessage.success('资料已更新')
    showEdit.value = false
  } catch (err) { ElMessage.error(err.message) }
  finally { saving.value = false }
}

function openEdit() {
  editForm.nickname = userStore.user?.nickname || ''
  editForm.email = userStore.user?.email || ''
  editForm.bio = userStore.user?.bio || ''
  showEdit.value = true
}

onMounted(() => {
  openEdit()
  fetchStats()
  fetchPointsLog()
  fetchNotifications()
  fetchPenalty()
})
</script>

<style scoped>
.page-wrapper { min-height: 100vh; background: var(--color-bg-primary); }
.page-title { font-family: var(--font-title); font-size: 1.8rem; margin-bottom: 20px; text-align: center; }

.profile-card { display: flex; gap: 32px; padding: 28px; margin-bottom: 24px; }
.profile-avatar { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.profile-avatar img { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid var(--color-border); }
.avatar-placeholder { width: 80px; height: 80px; border-radius: 50%; background: var(--color-accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-family: var(--font-title); }
.profile-info { flex: 1; }
.info-row { display: flex; gap: 12px; margin-bottom: 8px; font-size: 0.95rem; }
.info-row label { color: var(--color-text-secondary); min-width: 50px; }
.points-value { font-family: var(--font-mono); font-weight: 700; color: var(--color-accent); }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stat-card { padding: 20px; text-align: center; }
.stat-val { display: block; font-family: var(--font-mono); font-size: 1.5rem; font-weight: 700; color: var(--color-accent); margin-bottom: 4px; }
.stat-lbl { display: block; font-size: 0.85rem; color: var(--color-text-secondary); }

.log-list { display: flex; flex-direction: column; gap: 8px; }
.log-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: var(--glass-bg-card); border-radius: 6px; font-size: 0.9rem; }
.log-desc { flex: 1; }
.log-points { font-family: var(--font-mono); font-weight: 600; min-width: 60px; text-align: right; }
.log-points.positive { color: var(--color-green); }
.log-points.negative { color: var(--color-accent); }
.log-time { color: var(--color-text-secondary); font-size: 0.8rem; min-width: 80px; text-align: right; }

.notif-list { display: flex; flex-direction: column; gap: 8px; }
.notif-item { padding: 12px 16px; border-radius: 6px; background: var(--glass-bg-card); }
.notif-item.unread { border-left: 3px solid var(--color-accent); }
.notif-title { font-weight: 600; margin-bottom: 4px; }
.notif-content { font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 4px; }
.notif-time { font-size: 0.75rem; color: var(--color-text-secondary); }

.penalty-info { padding: 16px; }
.empty-text { text-align: center; color: var(--color-text-secondary); padding: 30px; }

@media (max-width: 768px) {
  .profile-card { flex-direction: column; align-items: center; text-align: center; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
