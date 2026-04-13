<template>
  <div class="admin-page">
    <AppNavbar />
    <div class="admin-layout">
      <!-- Sidebar -->
      <div class="admin-sidebar">
        <div class="sidebar-header">
          <h3>管理后台</h3>
          <router-link to="/" class="back-link">回到前台</router-link>
        </div>
        <nav class="sidebar-nav">
          <a v-for="item in menuItems" :key="item.key" :class="{ active: activeSection === item.key }" @click="activeSection = item.key">
            {{ item.icon }} {{ item.label }}
          </a>
        </nav>
      </div>

      <!-- Main -->
      <div class="admin-main">
        <!-- Pending Posts -->
        <template v-if="activeSection === 'posts'">
          <h2>待审核帖子</h2>
          <div v-for="p in pendingPosts" :key="p.id" class="review-item card">
            <div class="review-content">
              <span class="review-badge">[帖子]</span>
              <strong>{{ p.username }}</strong>: {{ p.title }}
              <p class="review-excerpt">{{ p.content?.slice(0, 100) }}...</p>
            </div>
            <div class="review-actions">
              <el-button type="success" size="small" @click="reviewPost(p.id, 'approve')">通过</el-button>
              <el-button type="danger" size="small" @click="reviewPost(p.id, 'reject')">拒绝</el-button>
            </div>
          </div>
          <p v-if="!pendingPosts.length" class="empty-text">暂无待审核帖子</p>
        </template>

        <!-- Pending Comments -->
        <template v-if="activeSection === 'comments'">
          <h2>待审核评论</h2>
          <div v-for="c in pendingComments" :key="c.id" class="review-item card">
            <div class="review-content">
              <span class="review-badge">[评论]</span>
              <strong>{{ c.username }}</strong> 评论「{{ c.post_title }}」:
              <p class="review-excerpt">{{ c.content }}</p>
            </div>
            <div class="review-actions">
              <el-button type="success" size="small" @click="reviewComment(c.id, 'approve')">通过</el-button>
              <el-button type="danger" size="small" @click="reviewComment(c.id, 'reject')">拒绝</el-button>
            </div>
          </div>
          <p v-if="!pendingComments.length" class="empty-text">暂无待审核评论</p>
        </template>

        <!-- Pending Books -->
        <template v-if="activeSection === 'books'">
          <h2>待审核书籍</h2>
          <div v-for="b in pendingBooks" :key="b.id" class="review-item card">
            <div class="review-content">
              <span class="review-badge">[书籍]</span>
              {{ b.submitter_name }} 推送「{{ b.title }}」- {{ b.author }}
            </div>
            <div class="review-actions">
              <el-button type="success" size="small" @click="reviewBook(b.id, 'approve')">通过</el-button>
              <el-button type="danger" size="small" @click="reviewBook(b.id, 'reject')">拒绝</el-button>
            </div>
          </div>
          <p v-if="!pendingBooks.length" class="empty-text">暂无待审核书籍</p>
        </template>

        <!-- Users -->
        <template v-if="activeSection === 'users'">
          <h2>学子管理</h2>
          <el-table :data="users" stripe>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="username" label="用户名" width="120" />
            <el-table-column prop="nickname" label="昵称" width="120" />
            <el-table-column prop="role_name" label="角色" width="100" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">{{ row.status === 1 ? '正常' : '禁言' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作">
              <template #default="{ row }">
                <el-button v-if="userStore.isSuperAdmin && row.role_name === 'user'" size="small" @click="changeRole(row.id, 2)">设为管理员</el-button>
                <el-button v-if="userStore.isSuperAdmin && row.role_name === 'admin'" size="small" @click="changeRole(row.id, 3)">取消管理员</el-button>
                <el-button v-if="row.status === 1" size="small" type="warning" @click="changeStatus(row.id, 0)">禁言</el-button>
                <el-button v-else size="small" type="success" @click="changeStatus(row.id, 1)">解禁</el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>

        <!-- Volunteer -->
        <template v-if="activeSection === 'volunteer'">
          <h2>志愿审核</h2>
          <div v-for="v in volunteerPending" :key="v.id" class="review-item card">
            <div class="review-content">
              <span class="review-badge">[志愿]</span>
              {{ v.username }} 申请「{{ v.task_name }}」
              <span class="reward">奖励: -{{ v.reward_penalty }}违约 +{{ v.reward_points }}积分</span>
            </div>
            <div class="review-actions">
              <el-button type="success" size="small" @click="confirmVolunteer(v.id)">确认完成</el-button>
              <el-button type="danger" size="small" @click="rejectVolunteer(v.id)">拒绝</el-button>
            </div>
          </div>
          <p v-if="!volunteerPending.length" class="empty-text">暂无待确认志愿</p>
        </template>

        <!-- Review Logs -->
        <template v-if="activeSection === 'logs'">
          <h2>审核日志</h2>
          <el-table :data="reviewLogs" stripe>
            <el-table-column prop="reviewer_name" label="审核人" width="100" />
            <el-table-column prop="target_type" label="类型" width="80" />
            <el-table-column prop="action" label="操作" width="80">
              <template #default="{ row }">
                <el-tag :type="row.action === 'approve' ? 'success' : 'danger'" size="small">{{ row.action === 'approve' ? '通过' : '拒绝' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="reason" label="原因" />
            <el-table-column prop="created_at" label="时间" width="160" />
          </el-table>
        </template>

        <!-- Stats (super_admin) -->
        <template v-if="activeSection === 'stats'">
          <h2>系统统计</h2>
          <div class="stats-grid" v-if="sysStats">
            <div class="stat-card card"><span class="stat-val">{{ sysStats.users?.total || 0 }}</span><span class="stat-lbl">注册用户</span></div>
            <div class="stat-card card"><span class="stat-val">{{ sysStats.users?.activeToday || 0 }}</span><span class="stat-lbl">今日活跃</span></div>
            <div class="stat-card card"><span class="stat-val">{{ sysStats.content?.publishedPosts || 0 }}</span><span class="stat-lbl">已发布帖子</span></div>
            <div class="stat-card card"><span class="stat-val">{{ sysStats.content?.pendingPosts || 0 }}</span><span class="stat-lbl">待审帖子</span></div>
            <div class="stat-card card"><span class="stat-val">{{ sysStats.content?.pendingBooks || 0 }}</span><span class="stat-lbl">待审书籍</span></div>
            <div class="stat-card card"><span class="stat-val">{{ Math.floor((sysStats.platform?.totalStudyMinutes || 0) / 60) }}</span><span class="stat-lbl">总修习时辰</span></div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import AppNavbar from '@/components/AppNavbar.vue'
import { adminAPI } from '@/api/user'
import { communityAdminAPI } from '@/api/community'
import { bookAPI, volunteerAPI } from '@/api/study'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'

const userStore = useUserStore()
const activeSection = ref('posts')

const menuItems = [
  { key: 'posts', icon: '📝', label: '帖子审核' },
  { key: 'comments', icon: '💬', label: '评论审核' },
  { key: 'books', icon: '📚', label: '书籍审核' },
  { key: 'users', icon: '👥', label: '学子管理' },
  { key: 'volunteer', icon: '🤝', label: '志愿审核' },
  { key: 'logs', icon: '📋', label: '审核日志' },
  { key: 'stats', icon: '📈', label: '系统统计' }
]

const pendingPosts = ref([])
const pendingComments = ref([])
const pendingBooks = ref([])
const users = ref([])
const volunteerPending = ref([])
const reviewLogs = ref([])
const sysStats = ref(null)

async function fetchPendingPosts() {
  try { const res = await communityAdminAPI.getPendingPosts({ pageSize: 50 }); pendingPosts.value = res.data || [] } catch { /* */ }
}
async function fetchPendingComments() {
  try { const res = await communityAdminAPI.getPendingComments({ pageSize: 50 }); pendingComments.value = res.data || [] } catch { /* */ }
}
async function fetchPendingBooks() {
  try { const res = await bookAPI.getPending({ pageSize: 50 }); pendingBooks.value = res.data || [] } catch { /* */ }
}
async function fetchUsers() {
  try { const res = await adminAPI.getUsers({ pageSize: 100 }); users.value = res.data || [] } catch { /* */ }
}
async function fetchVolunteer() {
  try { const res = await volunteerAPI.getPending({ pageSize: 50 }); volunteerPending.value = res.data || [] } catch { /* */ }
}
async function fetchLogs() {
  try { const res = await communityAdminAPI.getReviewLogs({ pageSize: 50 }); reviewLogs.value = res.data || [] } catch { /* */ }
}
async function fetchStats() {
  try { const res = await adminAPI.getStats(); sysStats.value = res.data } catch { /* */ }
}

async function reviewPost(id, action) {
  const reason = action === 'reject' ? await promptReason() : ''
  if (action === 'reject' && reason === false) return
  try {
    await communityAdminAPI.reviewPost(id, { action, reason })
    ElMessage.success(action === 'approve' ? '已通过' : '已拒绝')
    fetchPendingPosts()
  } catch (err) { ElMessage.error(err.message) }
}

async function reviewComment(id, action) {
  const reason = action === 'reject' ? await promptReason() : ''
  if (action === 'reject' && reason === false) return
  try {
    await communityAdminAPI.reviewComment(id, { action, reason })
    ElMessage.success(action === 'approve' ? '已通过' : '已拒绝')
    fetchPendingComments()
  } catch (err) { ElMessage.error(err.message) }
}

async function reviewBook(id, action) {
  const reason = action === 'reject' ? await promptReason() : ''
  if (action === 'reject' && reason === false) return
  try {
    await bookAPI.review(id, { action, reason })
    ElMessage.success(action === 'approve' ? '已通过' : '已拒绝')
    fetchPendingBooks()
  } catch (err) { ElMessage.error(err.message) }
}

async function promptReason() {
  try {
    const { value } = await ElMessageBox.prompt('请输入拒绝原因', '拒绝', { confirmButtonText: '确认', cancelButtonText: '取消' })
    return value || ''
  } catch { return false }
}

async function changeRole(userId, roleId) {
  try {
    await adminAPI.changeRole(userId, roleId)
    ElMessage.success('角色已变更')
    fetchUsers()
  } catch (err) { ElMessage.error(err.message) }
}

async function changeStatus(userId, status) {
  try {
    await adminAPI.changeStatus(userId, status)
    ElMessage.success(status === 0 ? '已禁言' : '已解禁')
    fetchUsers()
  } catch (err) { ElMessage.error(err.message) }
}

async function confirmVolunteer(id) {
  try { await volunteerAPI.confirm(id); ElMessage.success('已确认'); fetchVolunteer() } catch (err) { ElMessage.error(err.message) }
}

async function rejectVolunteer(id) {
  try { await volunteerAPI.reject(id); ElMessage.success('已拒绝'); fetchVolunteer() } catch (err) { ElMessage.error(err.message) }
}

watch(activeSection, (val) => {
  const fetchers = { posts: fetchPendingPosts, comments: fetchPendingComments, books: fetchPendingBooks, users: fetchUsers, volunteer: fetchVolunteer, logs: fetchLogs, stats: fetchStats }
  fetchers[val]?.()
})

onMounted(() => { fetchPendingPosts(); fetchStats() })
</script>

<style scoped>
.admin-page { min-height: 100vh; background: var(--color-bg-primary); }
.admin-layout { display: flex; margin-top: var(--nav-height); }

.admin-sidebar { width: 220px; background: var(--color-bg-secondary); padding: 20px 0; min-height: calc(100vh - var(--nav-height)); border-right: 1px solid var(--color-border-light); }
.sidebar-header { padding: 0 20px 16px; border-bottom: 1px solid var(--color-border-light); margin-bottom: 8px; }
.sidebar-header h3 { font-family: var(--font-title); font-size: 1.1rem; margin-bottom: 4px; }
.back-link { font-size: 0.8rem; color: var(--color-accent); text-decoration: none; }

.sidebar-nav { display: flex; flex-direction: column; }
.sidebar-nav a { padding: 10px 20px; font-size: 0.9rem; cursor: pointer; color: var(--color-text-primary); text-decoration: none; transition: all 0.2s; }
.sidebar-nav a:hover { background: rgba(139,37,0,0.05); color: var(--color-accent); }
.sidebar-nav a.active { background: var(--color-accent-light); color: var(--color-accent); border-right: 3px solid var(--color-accent); font-weight: 600; }

.admin-main { flex: 1; padding: 24px; }
.admin-main h2 { font-family: var(--font-title); font-size: 1.3rem; margin-bottom: 16px; }

.review-item { display: flex; align-items: flex-start; justify-content: space-between; padding: 14px 18px; margin-bottom: 10px; }
.review-badge { font-size: 0.75rem; padding: 1px 6px; border-radius: 3px; background: rgba(74,107,138,0.1); color: var(--color-blue); margin-right: 8px; }
.review-content { flex: 1; font-size: 0.9rem; }
.review-excerpt { font-size: 0.85rem; color: var(--color-text-secondary); margin-top: 4px; }
.reward { font-size: 0.8rem; color: var(--color-green); margin-left: 8px; }
.review-actions { display: flex; gap: 6px; flex-shrink: 0; margin-left: 12px; }
.empty-text { text-align: center; color: var(--color-text-secondary); padding: 40px; }

.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.stat-card { padding: 20px; text-align: center; }
.stat-val { display: block; font-family: var(--font-mono); font-size: 1.8rem; font-weight: 700; color: var(--color-accent); margin-bottom: 4px; }
.stat-lbl { display: block; font-size: 0.85rem; color: var(--color-text-secondary); }
</style>
