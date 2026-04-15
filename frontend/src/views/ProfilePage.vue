<template>
  <div class="page-wrapper theme-profile">
    <AppNavbar />
    <div class="page-content container" style="margin-top: var(--nav-height); padding-top: 24px;">
      <BackButton />
      <div class="profile-layout" v-if="userStore.user">
        <!-- Left Sidebar - User Info -->
        <div class="profile-sidebar">
          <div class="profile-avatar-lg">
            <img v-if="userStore.user.avatar_url" :src="userStore.user.avatar_url" alt="avatar" />
            <div v-else class="avatar-placeholder-lg">{{ userStore.user.nickname?.[0] || '学' }}</div>
            <el-button size="small" @click="triggerUpload" class="avatar-upload-btn">更换头像</el-button>
            <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="uploadAvatar" />
          </div>

          <h2 class="profile-name">{{ userStore.user.nickname }}</h2>
          <p class="profile-username">@{{ userStore.user.username }}</p>

          <div class="profile-bio" v-if="userStore.user.bio">{{ userStore.user.bio }}</div>

          <div class="profile-level">
            <span class="seal" :class="`seal--level-${userStore.user.level_id || 1}`">{{ userStore.user.level_name || '书童' }}</span>
            <span class="profile-points">{{ stats.total_points || 0 }} 积分</span>
          </div>

          <div class="profile-stats-row">
            <div class="profile-stat">
              <span class="ps-val">{{ Math.floor((stats.total_study_minutes || 0) / 60) }}</span>
              <span class="ps-lbl">修习时辰</span>
            </div>
            <div class="profile-stat">
              <span class="ps-val">{{ stats.total_pomodoros || 0 }}</span>
              <span class="ps-lbl">番茄钟</span>
            </div>
            <div class="profile-stat">
              <span class="ps-val">{{ stats.checkin_streak || 0 }}</span>
              <span class="ps-lbl">连续签到</span>
            </div>
          </div>

          <div class="profile-actions">
            <el-button size="small" @click="showEdit = true">编辑资料</el-button>
            <el-button v-if="userStore.user?.roleName === 'user'" size="small" type="warning" @click="showApplyAdmin = true">申请管理员</el-button>
          </div>

          <!-- Quick Nav -->
          <div class="profile-quick-nav">
            <router-link to="/profile?tab=notifications">
              通知
              <span v-if="userStore.unreadCount" class="qn-badge">{{ userStore.unreadCount }}</span>
            </router-link>
            <router-link to="/profile?tab=points">积分明细</router-link>
            <router-link to="/profile?tab=penalty">预约/违约</router-link>
          </div>
        </div>

        <!-- Right Content -->
        <div class="profile-main">
          <div class="profile-tabs">
            <span :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'">概览</span>
            <span :class="{ active: activeTab === 'posts' }" @click="activeTab = 'posts'">我的文章</span>
            <span :class="{ active: activeTab === 'bookmarks' }" @click="activeTab = 'bookmarks'">我的收藏</span>
            <span :class="{ active: activeTab === 'proposals' }" @click="activeTab = 'proposals'">我的提案</span>
            <span :class="{ active: activeTab === 'notifications' }" @click="activeTab = 'notifications'">
              通知
              <span v-if="userStore.unreadCount" class="tab-badge">{{ userStore.unreadCount }}</span>
            </span>
          </div>

          <!-- Overview -->
          <div v-if="activeTab === 'overview'" class="tab-content">
            <!-- Recent Activity -->
            <div class="section-block">
              <h4 class="section-label">最近动态</h4>
              <div v-if="myPosts.length" class="activity-list">
                <div v-for="p in myPosts.slice(0, 5)" :key="p.id" class="activity-item" @click="$router.push('/community/posts/' + p.id)">
                  <span class="act-icon">📝</span>
                  <div class="act-info">
                    <span class="act-title">{{ p.title }}</span>
                    <span class="act-meta">{{ p.category }} · v{{ p.version }} · {{ timeAgo(p.created_at) }}</span>
                  </div>
                  <span class="act-stats">👀{{ p.view_count }} ❤️{{ p.like_count }}</span>
                </div>
              </div>
              <p v-else class="empty-sm">还没有写过文章，去<a href="/community/create">写一篇</a>吧</p>
            </div>

            <!-- Recent Points -->
            <div class="section-block">
              <h4 class="section-label">近期积分</h4>
              <div v-if="pointsLog.length" class="points-list">
                <div v-for="log in pointsLog.slice(0, 5)" :key="log.id" class="points-item">
                  <span class="pt-desc">{{ log.description }}</span>
                  <span class="pt-val" :class="{ positive: log.points > 0, negative: log.points < 0 }">{{ log.points > 0 ? '+' : '' }}{{ log.points }}</span>
                </div>
              </div>
              <p v-else class="empty-sm">暂无积分记录</p>
            </div>
          </div>

          <!-- My Posts -->
          <div v-if="activeTab === 'posts'" class="tab-content">
            <div class="post-manage-list">
              <div v-for="p in myPosts" :key="p.id" class="post-manage-item card">
                <div class="pmi-info" @click="$router.push('/community/posts/' + p.id)">
                  <div class="pmi-top">
                    <el-tag :type="p.status === 'published' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'" size="small">
                      {{ p.status === 'published' ? '已发布' : p.status === 'pending' ? '审核中' : '已拒绝' }}
                    </el-tag>
                    <span class="pmi-title">{{ p.title }}</span>
                  </div>
                  <div class="pmi-meta">
                    <span>{{ p.category }}</span>
                    <span>v{{ p.version }}</span>
                    <span>👀{{ p.view_count }} ❤️{{ p.like_count }} 💬{{ p.comment_count }}</span>
                    <span>{{ timeAgo(p.created_at) }}</span>
                  </div>
                </div>
                <div class="pmi-actions">
                  <router-link :to="'/community/posts/' + p.id + '/edit'" class="pmi-btn">编辑</router-link>
                </div>
              </div>
            </div>
            <p v-if="!myPosts.length" class="empty-text">还没有写过文章</p>
          </div>

          <!-- My Bookmarks -->
          <div v-if="activeTab === 'bookmarks'" class="tab-content">
            <div class="bookmark-list">
              <div v-for="b in myBookmarks" :key="b.id" class="bookmark-item card" @click="$router.push('/community/posts/' + b.id)">
                <h4 class="bm-title">{{ b.title }}</h4>
                <p v-if="b.summary" class="bm-summary">{{ b.summary }}</p>
                <div class="bm-meta">
                  <span>{{ b.author_name }}</span>
                  <span>👀{{ b.view_count }} ❤️{{ b.like_count }}</span>
                  <span>收藏于 {{ timeAgo(b.bookmarked_at) }}</span>
                </div>
              </div>
            </div>
            <p v-if="!myBookmarks.length" class="empty-text">还没有收藏过文章</p>
          </div>

          <!-- My Proposals -->
          <div v-if="activeTab === 'proposals'" class="tab-content">
            <div class="proposal-list">
              <div v-for="pr in myProposals" :key="pr.id" class="proposal-item card" @click="$router.push('/community/proposals/' + pr.id)">
                <div class="prl-top">
                  <el-tag :type="proposalTag(pr.status)" size="small">{{ proposalText(pr.status) }}</el-tag>
                  <span class="prl-title">{{ pr.title }}</span>
                </div>
                <div class="prl-meta">
                  <span>文章：{{ pr.post_title }}</span>
                  <span>{{ timeAgo(pr.created_at) }}</span>
                </div>
              </div>
            </div>
            <p v-if="!myProposals.length" class="empty-text">还没有提交过提案</p>
          </div>

          <!-- Notifications -->
          <div v-if="activeTab === 'notifications'" class="tab-content">
            <div class="notif-header" v-if="userStore.unreadCount">
              <el-button size="small" @click="markAllRead">全部标为已读</el-button>
            </div>
            <div class="notif-list">
              <div v-for="n in notifications" :key="n.id" class="notif-item" :class="{ unread: !n.is_read }">
                <div class="notif-title">{{ n.title }}</div>
                <div class="notif-content">{{ n.content }}</div>
                <div class="notif-time">{{ formatDate(n.created_at) }}</div>
              </div>
            </div>
            <p v-if="!notifications.length" class="empty-text">暂无通知</p>
          </div>

          <!-- Points Log (hidden tab, accessible from sidebar) -->
          <div v-if="activeTab === 'points'" class="tab-content">
            <div class="log-list">
              <div v-for="log in pointsLog" :key="log.id" class="log-item">
                <span class="log-desc">{{ log.description }}</span>
                <span class="log-points" :class="{ positive: log.points > 0, negative: log.points < 0 }">{{ log.points > 0 ? '+' : '' }}{{ log.points }}</span>
                <span class="log-time">{{ formatDate(log.created_at) }}</span>
              </div>
            </div>
            <p v-if="!pointsLog.length" class="empty-text">暂无积分记录</p>
          </div>

          <!-- Penalty (hidden tab) -->
          <div v-if="activeTab === 'penalty'" class="tab-content">
            <div class="penalty-info card" v-if="penalty.isActive">
              <p>⚠️ 本月违约 {{ penalty.penaltyCount }} 次，禁预约至 {{ formatDate(penalty.banUntil) }}</p>
            </div>
            <div v-else class="penalty-info card">✅ 无违约记录</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Dialog -->
    <el-dialog v-model="showEdit" title="编辑资料" width="440px">
      <el-form label-width="60px">
        <el-form-item label="昵称"><el-input v-model="editForm.nickname" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="editForm.email" /></el-form-item>
        <el-form-item label="签名"><el-input v-model="editForm.bio" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEdit = false">取消</el-button>
        <el-button type="primary" @click="saveProfile" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- Apply Admin Dialog -->
    <el-dialog v-model="showApplyAdmin" title="申请管理员" width="440px">
      <el-input v-model="applyReason" type="textarea" :rows="3" placeholder="请说明申请理由（至少5字）" />
      <template #footer>
        <el-button @click="showApplyAdmin = false">取消</el-button>
        <el-button type="primary" @click="submitApplyAdmin" :loading="saving">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppNavbar from '@/components/AppNavbar.vue'
import BackButton from '@/components/BackButton.vue'
import { userAPI, pointsAPI, notificationAPI, adminAPI } from '@/api/user'
import { postAPI, bookmarkAPI, proposalAPI } from '@/api/community'
import { reservationAPI } from '@/api/study'
import { useUserStore } from '@/stores/user'
import { useTimeAgo } from '@/composables/useTimeAgo'
import { ElMessage } from 'element-plus'

const route = useRoute()
const userStore = useUserStore()
const userId = computed(() => userStore.user?.userId)

const activeTab = ref('overview')
const stats = ref({})
const myPosts = ref([])
const myBookmarks = ref([])
const myProposals = ref([])
const pointsLog = ref([])
const notifications = ref([])
const penalty = ref({ isActive: false })
const saving = ref(false)
const showEdit = ref(false)
const showApplyAdmin = ref(false)
const applyReason = ref('')
const fileInput = ref(null)

const editForm = reactive({ nickname: '', email: '', bio: '' })

// Watch route query for tab
watch(() => route.query.tab, (tab) => {
  if (tab) activeTab.value = tab
}, { immediate: true })

const { timeAgo } = useTimeAgo()

function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '' }

function proposalTag(s) { return { open: 'warning', merged: 'success', rejected: 'danger', closed: 'info' }[s] || 'info' }
function proposalText(s) { return { open: '待审核', merged: '已合并', rejected: '已拒绝', closed: '已关闭' }[s] || s }

async function fetchStats() {
  if (!userId.value) return
  try { const res = await userAPI.getUserStats(userId.value); stats.value = res.data || {} } catch { /* */ }
}
async function fetchMyPosts() {
  try { const res = await postAPI.getMy({ pageSize: 50 }); myPosts.value = res.data || [] } catch { /* */ }
}
async function fetchBookmarks() {
  try { const res = await bookmarkAPI.getMy({ pageSize: 50 }); myBookmarks.value = res.data || [] } catch { /* */ }
}
async function fetchMyProposals() {
  try { const res = await proposalAPI.getMy({ pageSize: 50 }); myProposals.value = res.data || [] } catch { /* */ }
}
async function fetchPointsLog() {
  try { const res = await pointsAPI.getPointsLog({ pageSize: 30 }); pointsLog.value = res.data || [] } catch { /* */ }
}
async function fetchNotifications() {
  try { const res = await notificationAPI.getList({ pageSize: 30 }); notifications.value = res.data || [] } catch { /* */ }
}
async function fetchPenalty() {
  try { const res = await reservationAPI.getMyPenalty(); penalty.value = res.data || { isActive: false } } catch { /* */ }
}

watch(showEdit, (v) => {
  if (v && userStore.user) {
    editForm.nickname = userStore.user.nickname || ''
    editForm.email = userStore.user.email || ''
    editForm.bio = userStore.user.bio || ''
  }
})

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

async function submitApplyAdmin() {
  if (!applyReason.value || applyReason.value.length < 5) return ElMessage.warning('理由至少5字')
  saving.value = true
  try {
    await adminAPI.applyAdmin(applyReason.value)
    ElMessage.success('申请已提交')
    showApplyAdmin.value = false
  } catch (err) { ElMessage.error(err.message) }
  finally { saving.value = false }
}

async function markAllRead() {
  try {
    await notificationAPI.markAllRead()
    userStore.unreadCount = 0
    notifications.value.forEach(n => n.is_read = 1)
  } catch { /* */ }
}

onMounted(() => {
  fetchStats()
  fetchMyPosts()
  fetchBookmarks()
  fetchMyProposals()
  fetchPointsLog()
  fetchNotifications()
  fetchPenalty()
})
</script>

<style scoped>
.page-wrapper { min-height: 100vh; background: var(--color-bg-primary); }

.profile-layout { display: flex; gap: 24px; }

/* Left Sidebar */
.profile-sidebar { width: 280px; flex-shrink: 0; }
.profile-avatar-lg { text-align: center; margin-bottom: 12px; }
.profile-avatar-lg img { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid var(--color-border); }
.avatar-placeholder-lg { width: 120px; height: 120px; border-radius: 50%; background: var(--color-accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-family: var(--font-title); margin: 0 auto; }
.avatar-upload-btn { margin-top: 8px; }
.profile-name { font-family: var(--font-title); font-size: 1.4rem; text-align: center; margin-bottom: 2px; }
.profile-username { text-align: center; font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 8px; }
.profile-bio { font-size: 0.9rem; color: var(--color-text-secondary); text-align: center; margin-bottom: 12px; padding: 0 12px; }
.profile-level { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 16px; }
.profile-points { font-size: 0.85rem; color: var(--color-gold); font-weight: 600; }

.profile-stats-row { display: flex; justify-content: center; gap: 20px; margin-bottom: 16px; padding: 12px 0; border-top: 1px solid var(--color-border-light); border-bottom: 1px solid var(--color-border-light); }
.profile-stat { text-align: center; }
.ps-val { display: block; font-family: var(--font-mono); font-size: 1.2rem; font-weight: 700; color: var(--color-accent); }
.ps-lbl { display: block; font-size: 0.75rem; color: var(--color-text-secondary); }

.profile-actions { display: flex; justify-content: center; gap: 8px; margin-bottom: 16px; }
.profile-quick-nav { display: flex; flex-direction: column; gap: 2px; }
.profile-quick-nav a { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; font-size: 0.85rem; color: var(--color-text-secondary); text-decoration: none; border-radius: 6px; transition: all 0.15s; }
.profile-quick-nav a:hover { background: var(--color-bg-secondary); color: var(--color-text-primary); }
.qn-badge { min-width: 18px; height: 18px; border-radius: 9px; background: var(--color-accent); color: #fff; font-size: 0.7rem; display: flex; align-items: center; justify-content: center; padding: 0 5px; }

/* Right Content */
.profile-main { flex: 1; min-width: 0; }
.profile-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--color-border-light); margin-bottom: 20px; }
.profile-tabs span { padding: 10px 16px; font-size: 0.9rem; color: var(--color-text-secondary); cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
.profile-tabs span:hover { color: var(--color-text-primary); }
.profile-tabs span.active { color: var(--color-accent); border-bottom-color: var(--color-accent); font-weight: 600; }
.tab-badge { min-width: 16px; height: 16px; border-radius: 8px; background: var(--color-accent); color: #fff; font-size: 0.65rem; display: inline-flex; align-items: center; justify-content: center; padding: 0 4px; margin-left: 4px; vertical-align: middle; }
.tab-content { }

/* Section Blocks */
.section-block { margin-bottom: 24px; }
.section-label { font-family: var(--font-title); font-size: 1rem; margin-bottom: 12px; padding-left: 8px; border-left: 3px solid var(--color-accent); }

/* Activity */
.activity-list { display: flex; flex-direction: column; gap: 4px; }
.activity-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: background 0.15s; }
.activity-item:hover { background: var(--color-bg-secondary); }
.act-icon { font-size: 1rem; }
.act-info { flex: 1; min-width: 0; }
.act-title { display: block; font-size: 0.9rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.act-meta { font-size: 0.75rem; color: var(--color-text-secondary); }
.act-stats { font-size: 0.8rem; color: var(--color-text-secondary); flex-shrink: 0; }

/* Post Manage */
.post-manage-list { display: flex; flex-direction: column; gap: 10px; }
.post-manage-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; cursor: pointer; }
.post-manage-item:hover { transform: none; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.pmi-info { flex: 1; min-width: 0; }
.pmi-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.pmi-title { font-size: 0.95rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pmi-meta { font-size: 0.8rem; color: var(--color-text-secondary); display: flex; gap: 12px; }
.pmi-actions { flex-shrink: 0; margin-left: 12px; }
.pmi-btn { font-size: 0.85rem; color: var(--color-accent); text-decoration: none; padding: 4px 10px; border: 1px solid var(--color-accent); border-radius: 4px; transition: all 0.2s; }
.pmi-btn:hover { background: var(--color-accent-light); }

/* Bookmarks */
.bookmark-list { display: flex; flex-direction: column; gap: 10px; }
.bookmark-item { padding: 16px 18px; cursor: pointer; }
.bm-title { font-size: 0.95rem; font-weight: 500; margin-bottom: 4px; }
.bm-summary { font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.bm-meta { font-size: 0.8rem; color: var(--color-text-secondary); display: flex; gap: 12px; }

/* Proposals */
.proposal-list { display: flex; flex-direction: column; gap: 10px; }
.proposal-item { padding: 14px 18px; cursor: pointer; }
.prl-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.prl-title { font-size: 0.9rem; font-weight: 500; }
.prl-meta { font-size: 0.8rem; color: var(--color-text-secondary); display: flex; gap: 12px; }

/* Notifications */
.notif-header { margin-bottom: 12px; text-align: right; }
.notif-list { display: flex; flex-direction: column; gap: 2px; }
.notif-item { padding: 12px 16px; border-radius: 6px; transition: background 0.15s; }
.notif-item.unread { background: var(--color-accent-light); border-left: 3px solid var(--color-accent); }
.notif-title { font-size: 0.9rem; font-weight: 500; margin-bottom: 2px; }
.notif-content { font-size: 0.85rem; color: var(--color-text-secondary); }
.notif-time { font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 2px; }

/* Points */
.log-list { display: flex; flex-direction: column; gap: 2px; }
.log-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-radius: 6px; }
.log-item:nth-child(odd) { background: var(--glass-bg-card); }
.log-desc { flex: 1; font-size: 0.9rem; }
.log-points { font-family: var(--font-mono); font-weight: 600; font-size: 0.9rem; }
.log-points.positive { color: var(--color-green); }
.log-points.negative { color: var(--color-accent); }
.log-time { font-size: 0.75rem; color: var(--color-text-secondary); }

/* Penalty */
.penalty-info { padding: 16px; }

.empty-text { text-align: center; color: var(--color-text-secondary); padding: 40px; }
.empty-sm { text-align: center; color: var(--color-text-secondary); padding: 20px; font-size: 0.9rem; }
.empty-sm a { color: var(--color-accent); }

@media (max-width: 768px) {
  .profile-layout { flex-direction: column; }
  .profile-sidebar { width: 100%; text-align: center; }
  .profile-quick-nav { flex-direction: row; flex-wrap: wrap; justify-content: center; }
  .profile-tabs { overflow-x: auto; }
}
</style>
