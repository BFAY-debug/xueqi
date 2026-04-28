<template>
  <div class="page-wrapper theme-profile">
    <div class="page-content container" style="margin-top: var(--nav-height); padding-top: 24px;">
      <BackButton />
      <div class="profile-layout" v-if="userStore.user">
        <!-- Left Sidebar - User Info -->
        <div class="profile-sidebar">
          <!-- Progress Ring + Avatar -->
          <div class="profile-avatar-lg">
            <div class="progress-ring-wrapper">
              <svg class="progress-ring" width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="62" stroke="var(--color-border-light)" stroke-width="4" fill="none" />
                <circle cx="70" cy="70" r="62" :stroke="levelColor" stroke-width="4" fill="none"
                  stroke-linecap="round"
                  :stroke-dasharray="ringCircumference"
                  :stroke-dashoffset="ringOffset"
                  transform="rotate(-90 70 70)"
                  class="progress-ring__circle" />
              </svg>
              <div class="avatar-inside-ring">
                <img v-if="userStore.user.avatar_url" :src="userStore.user.avatar_url" alt="avatar" />
                <div v-else class="avatar-placeholder-lg">{{ userStore.user.username?.[0] || '学' }}</div>
              </div>
            </div>
            <el-button size="small" @click="triggerUpload" class="avatar-upload-btn">更换头像</el-button>
            <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="uploadAvatar" />
          </div>

          <h2 class="profile-name">{{ userStore.user.username }}</h2>
          <p class="profile-username">@{{ userStore.user.accountId || userStore.user.username }}</p>

          <div class="profile-bio" v-if="userStore.user.bio">{{ userStore.user.bio }}</div>

          <div class="profile-level">
            <span class="seal" :class="`seal--level-${userStore.user.level_id || 1}`">{{ userStore.user.level_name || '书童' }}</span>
            <span class="profile-points">{{ stats.total_points || 0 }} 积分</span>
          </div>

          <!-- Streak Bar -->
          <div class="streak-section">
            <div class="streak-header">
              <span class="streak-flame" :class="streakClass">{{ streakIcon }}</span>
              <span class="streak-count">{{ stats.checkin_streak || 0 }} 天连续</span>
              <button
                class="checkin-btn"
                :class="{ 'checked': checkedToday, 'loading': checkinLoading }"
                :disabled="checkedToday || checkinLoading"
                @click="handleDailyCheckin"
              >
                {{ checkinLoading ? '...' : (checkedToday ? '已签到 ✓' : '每日签到') }}
              </button>
            </div>
            <div class="streak-week">
              <span v-for="(d, i) in weekDays" :key="i" class="streak-day" :class="{ done: checkedDays.includes(i) }">
                {{ d }}
              </span>
            </div>
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
              <span class="ps-val">{{ stats.total_points || 0 }}</span>
              <span class="ps-lbl">总积分</span>
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
            <span :class="{ active: activeTab === 'following' }" @click="activeTab = 'following'">关注</span>
            <span :class="{ active: activeTab === 'followers' }" @click="activeTab = 'followers'">粉丝</span>
            <span :class="{ active: activeTab === 'chats' }" @click="activeTab = 'chats'">我的论谈</span>
            <span :class="{ active: activeTab === 'proposals' }" @click="activeTab = 'proposals'">我的提案</span>
            <span :class="{ active: activeTab === 'notifications' }" @click="activeTab = 'notifications'">
              通知
              <span v-if="userStore.unreadCount" class="tab-badge">{{ userStore.unreadCount }}</span>
            </span>
          </div>

          <!-- Overview -->
          <div v-if="activeTab === 'overview'" class="tab-content">
            <!-- Badge Grid -->
            <div class="section-block">
              <h4 class="section-label">成就徽章</h4>
              <div class="badge-grid">
                <div v-for="badge in badges" :key="badge.id" class="badge-card card" :class="{ unlocked: badge.unlocked }">
                  <span class="badge-icon">{{ badge.icon }}</span>
                  <span class="badge-name">{{ badge.name }}</span>
                  <span class="badge-rarity" :class="`rarity-${badge.rarity}`">{{ badge.rarityLabel }}</span>
                </div>
              </div>
            </div>

            <!-- Weekly Study Chart -->
            <div class="section-block">
              <h4 class="section-label">本周修习</h4>
              <div class="mini-chart">
                <div class="chart-bars">
                  <div v-for="(val, i) in weeklyStudy" :key="i" class="chart-col">
                    <span class="chart-bar-val" v-if="val > 0">{{ val }}m</span>
                    <div class="chart-bar" :style="{ height: Math.max(val / maxWeekly * 100, 4) + '%' }"></div>
                    <span class="chart-day-label">{{ weekDays[i] }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Recent Activity -->
            <div class="section-block">
              <h4 class="section-label">最近动态</h4>
              <div v-if="myPosts.length" class="activity-list">
                <div v-for="p in myPosts.slice(0, 5)" :key="p.id" class="activity-item" @click="$router.push('/community/posts/' + p.id)">
                  <span class="act-icon">📝</span>
                  <div class="act-info">
                    <span class="act-title">{{ p.title }}</span>
                    <span class="act-meta">{{ categoryMap[p.category] || p.category }} · v{{ p.version }} · {{ timeAgo(p.created_at) }}</span>
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
                    <span>{{ categoryMap[p.category] || p.category }}</span>
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

          <!-- Following -->
          <div v-if="activeTab === 'following'" class="tab-content">
            <div class="follow-list">
              <div v-for="u in followingList" :key="u.id" class="follow-item card" @click="$router.push('/user/' + u.id)">
                <UserAvatar :avatar-url="u.avatar_url" :nickname="u.username" :size="36" />
                <span class="follow-name">{{ u.username }}</span>
              </div>
            </div>
            <p v-if="!followingList.length" class="empty-text">还没有关注任何人</p>
          </div>

          <!-- Followers -->
          <div v-if="activeTab === 'followers'" class="tab-content">
            <div class="follow-list">
              <div v-for="u in followerList" :key="u.id" class="follow-item card" @click="$router.push('/user/' + u.id)">
                <UserAvatar :avatar-url="u.avatar_url" :nickname="u.username" :size="36" />
                <span class="follow-name">{{ u.username }}</span>
              </div>
            </div>
            <p v-if="!followerList.length" class="empty-text">暂无粉丝</p>
          </div>

          <!-- My Chat Rooms -->
          <div v-if="activeTab === 'chats'" class="tab-content">
            <div class="chat-room-list">
              <div v-for="room in myChatRooms" :key="room.room_id" class="chat-room-item card" @click="openChatRoom(room.room_id)">
                <div class="cri-info">
                  <span class="cri-icon">🏮</span>
                  <div class="cri-detail">
                    <span class="cri-name">{{ room.room_name || `书院 ${room.room_id}` }}</span>
                    <span class="cri-last" v-if="room.last_message">{{ room.last_message }}</span>
                  </div>
                </div>
                <span class="cri-time" v-if="room.last_time">{{ timeAgo(room.last_time) }}</span>
              </div>
            </div>
            <p v-if="!myChatRooms.length" class="empty-text">还没有参与过论谈</p>
          </div>

          <!-- Notifications -->
          <div v-if="activeTab === 'notifications'" class="tab-content">
            <div class="notif-header" v-if="userStore.unreadCount">
              <el-button size="small" @click="markAllRead">全部标为已读</el-button>
            </div>
            <div class="notif-list">
              <div v-for="n in notifications" :key="n.id" class="notif-item" :class="{ unread: !n.is_read, clickable: n.related_id }" @click="handleNotifClick(n)">
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

    <UserProfileCard v-if="profileCardUserId" :user-id="profileCardUserId" :visible="!!profileCardUserId" @close="profileCardUserId = null" />

    <!-- Edit Dialog -->
    <el-dialog v-model="showEdit" title="编辑资料" width="440px">
      <el-form label-width="80px">
        <el-form-item label="账号ID"><el-input v-model="editForm.accountId" placeholder="3-20位字母、数字、下划线" /></el-form-item>
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
import { useRoute, useRouter } from 'vue-router'
import BackButton from '@/components/BackButton.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import UserProfileCard from '@/components/UserProfileCard.vue'
import { userAPI, pointsAPI, notificationAPI, adminAPI } from '@/api/user'
import { postAPI, bookmarkAPI, proposalAPI } from '@/api/community'
import { followAPI } from '@/api/follow'
import { reservationAPI, chatAPI } from '@/api/study'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { useTimeAgo } from '@/composables/useTimeAgo'
import { compressImage } from '@/utils/compressImage'
import { ElMessage } from 'element-plus'
import { useFormatDate } from '@/composables/useFormatDate'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { formatDate } = useFormatDate()
const chatStore = useChatStore()
const userId = computed(() => userStore.user?.userId)

const activeTab = ref('overview')
const categoryMap = { experience: '修习心得', question: '求学问路', resource: '典籍推荐', general: '杂谈' }
const followingList = ref([])
const followerList = ref([])
const profileCardUserId = ref(null)
const stats = ref({})
const myPosts = ref([])
const myBookmarks = ref([])
const myProposals = ref([])
const pointsLog = ref([])
const notifications = ref([])
const penalty = ref({ isActive: false })
const myChatRooms = ref([])
const saving = ref(false)
const checkinLoading = ref(false)
const showEdit = ref(false)
const showApplyAdmin = ref(false)
const applyReason = ref('')
const fileInput = ref(null)

const editForm = reactive({ email: '', bio: '', accountId: '' })

// Gamification computed
const weekDays = ['一', '二', '三', '四', '五', '六', '日']

// Level progress ring
const levelThresholds = [0, 100, 300, 600, 1000, 2000, 5000]
const levelProgress = computed(() => {
  const lvl = userStore.user?.level_id || 1
  const pts = stats.value.total_points || 0
  const low = levelThresholds[Math.min(lvl - 1, levelThresholds.length - 1)] || 0
  const high = levelThresholds[Math.min(lvl, levelThresholds.length - 1)] || (low + 1000)
  if (high <= low) return 1
  return Math.min(1, Math.max(0, (pts - low) / (high - low)))
})
const ringCircumference = 2 * Math.PI * 62
const ringOffset = computed(() => ringCircumference * (1 - levelProgress.value))
const levelColor = computed(() => {
  const lvl = userStore.user?.level_id || 1
  const colors = ['#4CAF50', '#2196F3', '#FF5722', '#E91E63', '#9C27B0', '#8B2500']
  return colors[Math.min(lvl - 1, colors.length - 1)]
})

// Streak
const checkedToday = computed(() => {
  const lastDate = stats.value.last_study_date
  if (!lastDate) return false
  const today = new Date().toLocaleDateString('sv-SE')
  return new Date(lastDate).toLocaleDateString('sv-SE') === today
})

const checkedDays = computed(() => {
  // Only show check-in days within the current week (Mon-Sun), capped by streak
  const streak = stats.value.checkin_streak || 0
  const todayIndex = (new Date().getDay() + 6) % 7 // Monday=0
  const daysThisWeek = Math.min(streak, todayIndex + 1)
  return Array.from({ length: daysThisWeek }, (_, i) => todayIndex - i)
})

const streakClass = computed(() => {
  const s = stats.value.checkin_streak || 0
  if (s >= 365) return 'streak-legendary'
  if (s >= 100) return 'streak-gold'
  if (s >= 30) return 'streak-silver'
  if (s >= 7) return 'streak-bronze'
  return ''
})

const streakIcon = computed(() => {
  const s = stats.value.checkin_streak || 0
  if (s >= 365) return '🔥'
  if (s >= 100) return '🔥'
  if (s >= 30) return '🔥'
  if (s >= 7) return '🔥'
  return '🕯'
})

// Badges (computed from stats)
const badges = computed(() => {
  const streak = stats.value.checkin_streak || 0
  const studyMin = stats.value.total_study_minutes || 0
  const pomodoros = stats.value.total_pomodoros || 0
  const pts = stats.value.total_points || 0
  const postCount = myPosts.value.length
  return [
    { id: 'streak-7', name: '七日如一', icon: '🔥', unlocked: streak >= 7, rarity: 'common', rarityLabel: '凡' },
    { id: 'streak-30', name: '月常不懈', icon: '🌙', unlocked: streak >= 30, rarity: 'rare', rarityLabel: '珍' },
    { id: 'streak-100', name: '百日成钢', icon: '⚔️', unlocked: streak >= 100, rarity: 'epic', rarityLabel: '极' },
    { id: 'study-10h', name: '初窥门径', icon: '📖', unlocked: studyMin >= 600, rarity: 'common', rarityLabel: '凡' },
    { id: 'study-50h', name: '小有所成', icon: '📚', unlocked: studyMin >= 3000, rarity: 'rare', rarityLabel: '珍' },
    { id: 'study-200h', name: '博览群书', icon: '🏛️', unlocked: studyMin >= 12000, rarity: 'epic', rarityLabel: '极' },
    { id: 'post-1', name: '初出茅庐', icon: '✍️', unlocked: postCount >= 1, rarity: 'common', rarityLabel: '凡' },
    { id: 'post-10', name: '文思泉涌', icon: '📝', unlocked: postCount >= 10, rarity: 'rare', rarityLabel: '珍' },
    { id: 'pomodoro-10', name: '番茄十枚', icon: '🍅', unlocked: pomodoros >= 10, rarity: 'common', rarityLabel: '凡' },
    { id: 'pomodoro-50', name: '番茄丰收', icon: '🍅', unlocked: pomodoros >= 50, rarity: 'rare', rarityLabel: '珍' },
    { id: 'points-1000', name: '学富五车', icon: '💎', unlocked: pts >= 1000, rarity: 'epic', rarityLabel: '极' },
    { id: 'points-5000', name: '一代宗师', icon: '👑', unlocked: pts >= 5000, rarity: 'legendary', rarityLabel: '传' },
  ]
})

// Weekly study chart (simulated from total — evenly distributed for demo)
const weeklyStudy = computed(() => {
  const total = stats.value.total_study_minutes || 0
  const avg = Math.round(total / 30) // rough daily average
  // Generate slight variation
  return [0,1,2,3,4,5,6].map(i => {
    const dayOfWeek = (new Date().getDay() + 6) % 7
    return i <= dayOfWeek ? Math.round(avg * (0.6 + Math.random() * 0.8)) : 0
  })
})
const maxWeekly = computed(() => Math.max(...weeklyStudy.value, 1))

// Watch route query for tab
watch(() => route.query.tab, (tab) => {
  if (tab) activeTab.value = tab
}, { immediate: true })

const { timeAgo } = useTimeAgo()



function proposalTag(s) { return { open: 'warning', merged: 'success', rejected: 'danger', closed: 'info' }[s] || 'info' }
function proposalText(s) { return { open: '待审核', merged: '已合并', rejected: '已拒绝', closed: '已关闭' }[s] || '未知' }

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
async function fetchMyChatRooms() {
  try { const res = await chatAPI.getMyRooms(); myChatRooms.value = res.data || [] } catch { /* */ }
}
function openChatRoom(roomId) {
  chatStore.openChat(roomId)
}

watch(showEdit, (v) => {
  if (v && userStore.user) {
    editForm.email = userStore.user.email || ''
    editForm.bio = userStore.user.bio || ''
    editForm.accountId = userStore.user.accountId || ''
  }
})

function triggerUpload() { fileInput.value?.click() }

async function uploadAvatar(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    saving.value = true
    const compressed = await compressImage(file, { maxWidth: 300, maxHeight: 300, quality: 0.85 })
    await userAPI.uploadAvatar(compressed)
    await userStore.fetchProfile()
    ElMessage.success('头像已更新')
  } catch (err) { ElMessage.error(err.message) }
  finally { saving.value = false }
}

async function handleDailyCheckin() {
  if (checkedToday.value || checkinLoading.value) return
  checkinLoading.value = true
  try {
    const res = await pointsAPI.dailyCheckin()
    const data = res.data
    if (data.alreadyCheckedIn) {
      ElMessage.info('今日已签到')
    } else {
      ElMessage.success(`签到成功！连续 ${data.streak} 天，获得 ${data.streak > 0 ? Math.min(data.streak, 30) : 1} 积分`)
    }
    await fetchStats()
  } catch (e) {
    ElMessage.error(e.message || '签到失败')
  } finally {
    checkinLoading.value = false
  }
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

function handleNotifClick(n) {
  if (!n.related_id) return
  // Mark as read
  if (!n.is_read) {
    n.is_read = 1
    notificationAPI.markRead(n.id).catch(() => {})
    userStore.unreadCount = Math.max(0, (userStore.unreadCount || 0) - 1)
  }
  const t = n.related_type
  if (t === 'post') {
    router.push(`/community/posts/${n.related_id}`)
  } else if (t === 'comment' || t === 'mention') {
    router.push(`/community/posts/${n.related_id}#comment-${n.related_id}`)
  }
}

function openProfile(userId) { profileCardUserId.value = userId }

async function fetchFollowing() {
  if (!userId.value) return
  try {
    const res = await followAPI.getFollowing(userId.value, { pageSize: 50 })
    followingList.value = Array.isArray(res.data) ? res.data : res.data?.data || []
  } catch { /* ignore */ }
}

async function fetchFollowers() {
  if (!userId.value) return
  try {
    const res = await followAPI.getFollowers(userId.value, { pageSize: 50 })
    followerList.value = Array.isArray(res.data) ? res.data : res.data?.data || []
  } catch { /* ignore */ }
}

watch(activeTab, (tab) => {
  if (tab === 'following') fetchFollowing()
  if (tab === 'followers') fetchFollowers()
})

onMounted(() => {
  fetchStats()
  fetchMyPosts()
  fetchBookmarks()
  fetchMyProposals()
  fetchPointsLog()
  fetchNotifications()
  fetchPenalty()
  fetchMyChatRooms()
})
</script>

<style scoped>
.page-wrapper { min-height: 100vh; background: var(--color-bg-primary); }

.profile-layout { display: flex; gap: 24px; }

/* Left Sidebar */
.profile-sidebar { width: 280px; flex-shrink: 0; }

/* Progress Ring */
.profile-avatar-lg { text-align: center; margin-bottom: 12px; }
.progress-ring-wrapper {
  position: relative;
  width: 140px; height: 140px;
  margin: 0 auto;
}
.progress-ring {
  position: absolute;
  top: 0; left: 0;
  transform: rotate(-90deg);
}
.progress-ring__circle {
  transition: stroke-dashoffset 1.5s ease;
}
.avatar-inside-ring {
  position: absolute;
  top: 8px; left: 8px;
  width: 124px; height: 124px;
  border-radius: 50%;
  overflow: hidden;
}
.avatar-inside-ring img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder-lg {
  width: 124px; height: 124px; border-radius: 50%;
  background: var(--color-accent); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 2.5rem; font-family: var(--font-title);
}
.avatar-upload-btn { margin-top: 8px; }
.profile-name { font-family: var(--font-title); font-size: 1.4rem; text-align: center; margin-bottom: 2px; }
.profile-username { text-align: center; font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 8px; }
.profile-bio { font-size: 0.9rem; color: var(--color-text-secondary); text-align: center; margin-bottom: 12px; padding: 0 12px; }
.profile-level { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 16px; }
.profile-points { font-size: 0.85rem; color: var(--color-gold); font-weight: 600; }

/* Streak Section */
.streak-section {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--color-bg-secondary);
  border-radius: var(--border-radius-sm);
}
.streak-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 8px;
}
.streak-flame { font-size: 1.2rem; }
.streak-flame.streak-bronze { filter: brightness(1.2); }
.streak-flame.streak-silver { filter: brightness(1.3); }
.streak-flame.streak-gold { filter: brightness(1.4); }
.streak-flame.streak-legendary { filter: brightness(1.5); }
.streak-count {
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-accent);
}
.checkin-btn {
  margin-left: auto;
  padding: 4px 16px;
  border-radius: 16px;
  border: 1px solid var(--color-accent);
  background: var(--color-accent);
  color: #fff;
  font-size: 0.8rem;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.checkin-btn:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
}
.checkin-btn:disabled {
  cursor: default;
  transform: none;
}
.checkin-btn.checked {
  background: transparent;
  color: var(--color-text-secondary);
  border-color: var(--color-border-light);
}
.checkin-btn.loading {
  opacity: 0.7;
}
.streak-week {
  display: flex;
  gap: 4px;
  justify-content: center;
}
.streak-day {
  width: 28px; height: 28px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.7rem;
  background: var(--glass-bg-card);
  border: 1px solid var(--color-border-light);
  color: var(--color-text-secondary);
  transition: all 0.2s;
}
.streak-day.done {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}

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

/* Badge Grid */
.badge-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.badge-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  text-align: center;
  opacity: 0.4;
  transition: all 0.3s;
}
.badge-card.unlocked {
  opacity: 1;
}
.badge-card.unlocked:hover {
  transform: translateY(-4px);
}
.badge-icon { font-size: 1.8rem; }
.badge-name {
  font-family: var(--font-title);
  font-size: 0.8rem;
  color: var(--color-text-primary);
}
.badge-rarity {
  font-size: 0.65rem;
  padding: 1px 6px;
  border-radius: 3px;
}
.rarity-common { background: var(--color-bg-secondary); color: var(--color-text-secondary); }
.rarity-rare { background: rgba(33, 150, 243, 0.15); color: var(--color-blue); }
.rarity-epic { background: rgba(156, 39, 176, 0.15); color: var(--level-5, #9C27B0); }
.rarity-legendary { background: rgba(184, 134, 11, 0.15); color: var(--color-gold); }

/* Weekly Study Chart */
.mini-chart {
  padding: 16px;
  background: var(--glass-bg-card);
  border: var(--glass-border);
  border-radius: var(--border-radius);
}
.chart-bars {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 120px;
}
.chart-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}
.chart-bar-val {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}
.chart-bar {
  width: 100%;
  max-width: 32px;
  background: linear-gradient(to top, var(--color-green), rgba(46, 92, 76, 0.5));
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: height 0.6s ease;
}
.chart-day-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-top: 6px;
}

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
.notif-item.clickable { cursor: pointer; }
.notif-item.clickable:hover { background: var(--color-bg-secondary); }
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

/* Chat Rooms */
.chat-room-list { display: flex; flex-direction: column; gap: 10px; }
.chat-room-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; cursor: pointer; }
.chat-room-item:hover { transform: none; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.cri-info { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.cri-icon { font-size: 1.2rem; }
.cri-detail { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.cri-name { font-size: 0.95rem; font-weight: 500; }
.cri-last { font-size: 0.8rem; color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cri-time { font-size: 0.75rem; color: var(--color-text-secondary); flex-shrink: 0; }

.empty-text { text-align: center; color: var(--color-text-secondary); padding: 40px; }

.follow-list { display: flex; flex-direction: column; gap: 8px; }
.follow-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; cursor: pointer; transition: all 0.15s; }
.follow-item:hover { transform: none; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.follow-name { font-size: 0.9rem; }
.empty-sm { text-align: center; color: var(--color-text-secondary); padding: 20px; font-size: 0.9rem; }
.empty-sm a { color: var(--color-accent); }

@media (max-width: 768px) {
  .profile-layout { flex-direction: column; }
  .profile-sidebar { width: 100%; text-align: center; }
  .profile-quick-nav { flex-direction: row; flex-wrap: wrap; justify-content: center; }
  .profile-tabs { overflow-x: auto; }
}
</style>
