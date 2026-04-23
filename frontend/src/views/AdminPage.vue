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
          <a v-for="item in filteredMenu" :key="item.key" :class="{ active: activeSection === item.key }" @click="activeSection = item.key">
            {{ item.icon }} {{ item.label }}
          </a>
        </nav>
      </div>

      <!-- Main -->
      <div class="admin-main">
        <!-- Pending Posts Review -->
        <template v-if="activeSection === 'posts'">
          <h2>文章审核 <el-tag size="small" type="warning">{{ pendingPosts.length }}</el-tag></h2>
          <div v-for="p in pendingPosts" :key="p.id" class="review-item card">
            <div class="review-content">
              <span class="review-badge">[{{ p.category }}]</span>
              <strong>{{ p.username }}</strong>: {{ p.title }}
              <p class="review-excerpt">{{ p.content?.slice(0, 150) }}...</p>
            </div>
            <div class="review-actions">
              <el-button type="success" size="small" @click="reviewPost(p.id, 'approve')">通过</el-button>
              <el-button type="danger" size="small" @click="reviewPost(p.id, 'reject')">拒绝</el-button>
            </div>
          </div>
          <p v-if="!pendingPosts.length" class="empty-text">暂无待审核文章</p>
        </template>

        <!-- Post Management -->
        <template v-if="activeSection === 'postManage'">
          <h2>文章管理</h2>
          <el-table :data="allPosts" stripe>
            <el-table-column prop="id" label="ID" width="50" />
            <el-table-column prop="title" label="标题" min-width="200">
              <template #default="{ row }">
                <span>{{ row.title }}</span>
                <el-tag v-if="row.is_pinned" size="small" type="warning" style="margin-left:4px">置顶</el-tag>
                <el-tag v-if="row.is_featured" size="small" type="danger" style="margin-left:4px">精选</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="author_name" label="作者" width="100" />
            <el-table-column prop="category" label="分类" width="80" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 'published' ? 'success' : row.status === 'hidden' ? 'info' : row.status === 'pending' ? 'warning' : 'danger'" size="small">
                  {{ row.status === 'published' ? '已发布' : row.status === 'hidden' ? '已隐藏' : row.status === 'pending' ? '待审核' : '已拒绝' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="数据" width="130">
              <template #default="{ row }">
                <span style="font-size:0.8rem">👀{{ row.view_count }} ❤️{{ row.like_count }} 💬{{ row.comment_count }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="280">
              <template #default="{ row }">
                <el-button size="small" :type="row.is_pinned ? 'warning' : ''" @click="togglePinPost(row.id, row.is_pinned)">{{ row.is_pinned ? '取消置顶' : '置顶' }}</el-button>
                <el-button size="small" :type="row.is_featured ? 'warning' : ''" @click="toggleFeaturePost(row.id, row.is_featured)">{{ row.is_featured ? '取消精选' : '精选' }}</el-button>
                <el-button size="small" :type="row.status === 'hidden' ? 'success' : 'info'" @click="toggleHidePost(row.id, row.status !== 'hidden')">{{ row.status === 'hidden' ? '恢复' : '隐藏' }}</el-button>
                <el-button size="small" @click="openEditPostDialog(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="adminDeletePost(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <p v-if="!allPosts.length" class="empty-text">暂无文章</p>
        </template>

        <!-- Comment Management -->
        <template v-if="activeSection === 'comments'">
          <h2>评论管理</h2>
          <div v-if="pendingComments.length" style="margin-bottom:16px">
            <h3 style="font-size:0.95rem;color:var(--color-accent);margin-bottom:8px">待审核评论 ({{ pendingComments.length }})</h3>
            <div v-for="c in pendingComments" :key="'p'+c.id" class="review-item card" style="border-left:3px solid var(--color-gold)">
              <div class="review-content">
                <el-tag type="warning" size="small">待审核</el-tag>
                <strong style="margin-left:4px">{{ c.username }}</strong> 评论「{{ c.post_title }}」:
                <p class="review-excerpt">{{ c.content }}</p>
              </div>
              <div class="review-actions">
                <el-button type="success" size="small" @click="reviewComment(c.id, 'approve')">通过</el-button>
                <el-button type="danger" size="small" @click="reviewComment(c.id, 'reject')">拒绝</el-button>
              </div>
            </div>
          </div>
          <h3 style="font-size:0.95rem;margin-bottom:8px">已发布评论</h3>
          <el-table :data="allComments" stripe>
            <el-table-column prop="id" label="ID" width="50" />
            <el-table-column prop="content" label="内容" min-width="250">
              <template #default="{ row }">
                <span>{{ row.content?.length > 80 ? row.content.slice(0, 80) + '...' : row.content }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="author_name" label="评论者" width="100" />
            <el-table-column prop="post_title" label="所属文章" width="140">
              <template #default="{ row }">
                <span style="font-size:0.8rem">{{ row.post_title?.length > 12 ? row.post_title.slice(0, 12) + '...' : row.post_title }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="like_count" label="赞" width="50" />
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button size="small" type="danger" @click="adminDeleteComment(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <p v-if="!allComments.length && !pendingComments.length" class="empty-text">暂无评论</p>
        </template>

        <!-- Proposal Review -->
        <template v-if="activeSection === 'proposals'">
          <h2>修改审核 <el-tag size="small" type="warning">{{ pendingProposals.length }}</el-tag></h2>
          <div v-for="p in pendingProposals" :key="p.id" class="review-item card">
            <div class="review-content">
              <span class="review-badge">[修改]</span>
              <strong>{{ p.proposer_name }}</strong> 提议修改 <strong>{{ p.author_name }}</strong> 的文章「{{ p.post_title }}」
              <p class="review-excerpt" v-if="p.description">说明：{{ p.description }}</p>
              <p class="review-excerpt">新标题：{{ p.title }}</p>
              <span class="app-time">{{ p.created_at }}</span>
            </div>
            <div class="review-actions">
              <el-button type="success" size="small" @click="mergeProposal(p.id)">合并</el-button>
              <el-button type="danger" size="small" @click="rejectProposal(p.id)">拒绝</el-button>
            </div>
          </div>
          <p v-if="!pendingProposals.length" class="empty-text">暂无待审核修改提案</p>
        </template>

        <!-- Users -->
        <template v-if="activeSection === 'users'">
          <h2>学子管理</h2>
          <el-table :data="users" stripe>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="username" label="用户名" width="120" />
            <el-table-column prop="accountId" label="账号ID" width="120" />
            <el-table-column prop="role_name" label="角色" width="100" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">{{ row.status === 1 ? '正常' : '禁言' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作">
              <template #default="{ row }">
                <el-button size="small" @click="viewUserDetail(row.id)">详情</el-button>
                <el-button v-if="userStore.isSuperAdmin && row.role_name === 'user'" size="small" @click="changeRole(row.id, 2)">设为管理员</el-button>
                <el-button v-if="userStore.isSuperAdmin && row.role_name === 'admin'" size="small" @click="changeRole(row.id, 3)">取消管理员</el-button>
                <el-button v-if="row.status === 1" size="small" type="warning" @click="changeStatus(row.id, 0)">禁言</el-button>
                <el-button v-else size="small" type="success" @click="changeStatus(row.id, 1)">解禁</el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>

        <!-- Seat Management -->
        <template v-if="activeSection === 'seats'">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h2 style="margin:0">座位管理</h2>
            <el-button type="primary" size="small" @click="showLocationDialog = true">新增地点</el-button>
          </div>

          <!-- Location List -->
          <el-table :data="locations" stripe style="margin-bottom:20px">
            <el-table-column prop="id" label="ID" width="50" />
            <el-table-column prop="name" label="名称" width="140" />
            <el-table-column prop="building" label="楼栋" width="100" />
            <el-table-column prop="floor" label="楼层" width="60" />
            <el-table-column prop="open_time" label="开放时间" width="100" />
            <el-table-column prop="close_time" label="关闭时间" width="100" />
            <el-table-column label="座位" width="80">
              <template #default="{ row }">
                {{ row.available_seats || 0 }}/{{ row.total_seats || 0 }}
              </template>
            </el-table-column>
            <el-table-column label="操作">
              <template #default="{ row }">
                <el-button size="small" @click="openSeatManager(row)">管理座位</el-button>
                <el-button size="small" @click="editLocation(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="deleteLocation(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- Seat Grid for selected location -->
          <template v-if="selectedLocation">
            <h3 style="margin-bottom:12px">{{ selectedLocation.name }} — 座位图</h3>
            <div style="display:flex;gap:8px;margin-bottom:16px">
              <el-button size="small" type="primary" @click="showAddSeatsDialog = true">批量添加座位</el-button>
              <el-button size="small" type="danger" @click="clearSeats(selectedLocation.id)">清空座位</el-button>
              <el-button size="small" @click="selectedLocation = null">关闭</el-button>
            </div>
            <div class="seat-grid">
              <div v-for="seat in currentSeats" :key="seat.id" class="seat-cell" :class="seatClass(seat)">
                {{ seat.seat_code }}
                <span v-if="seat.has_power" class="power-icon">⚡</span>
              </div>
            </div>
            <p v-if="!currentSeats.length" class="empty-text">暂无座位，请点击"批量添加座位"</p>
          </template>
        </template>

        <!-- Admin Applications (super_admin) -->
        <template v-if="activeSection === 'applications'">
          <h2>管理员申请</h2>
          <div v-for="a in adminApplications" :key="a.id" class="review-item card">
            <div class="review-content">
              <span class="review-badge">[申请]</span>
              <strong>{{ a.username }}</strong> 申请成为管理员
              <p class="review-excerpt">理由：{{ a.reason }}</p>
              <span class="app-time">{{ a.created_at }}</span>
            </div>
            <div class="review-actions" v-if="a.status === 'pending'">
              <el-button type="success" size="small" @click="reviewAdminApp(a.id, 'approve')">通过</el-button>
              <el-button type="danger" size="small" @click="reviewAdminApp(a.id, 'reject')">拒绝</el-button>
            </div>
            <div v-else>
              <el-tag :type="a.status === 'approved' ? 'success' : 'danger'" size="small">{{ a.status === 'approved' ? '已通过' : '已拒绝' }}</el-tag>
            </div>
          </div>
          <p v-if="!adminApplications.length" class="empty-text">暂无申请</p>
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
            <div class="stat-card card"><span class="stat-val">{{ Math.floor((sysStats.platform?.totalStudyMinutes || 0) / 60) }}</span><span class="stat-lbl">总修习时辰</span></div>
          </div>
          <!-- Trend charts -->
          <div class="charts-row" v-if="statsTrend">
            <div class="chart-card card">
              <div class="chart-title">用户增长 & 活跃趋势（14天）</div>
              <div ref="chartTrendRef" class="chart-box"></div>
            </div>
            <div class="chart-card card">
              <div class="chart-title">每日修习时长（14天）</div>
              <div ref="chartStudyRef" class="chart-box"></div>
            </div>
          </div>
          <div class="charts-row" v-if="statsTrend">
            <div class="chart-card card">
              <div class="chart-title">用户角色分布</div>
              <div ref="chartRoleRef" class="chart-box chart-box-sm"></div>
            </div>
            <div class="chart-card card">
              <div class="chart-title">帖子分类分布</div>
              <div ref="chartCategoryRef" class="chart-box chart-box-sm"></div>
            </div>
          </div>
        </template>

        <!-- Feedback (super_admin) -->
        <template v-if="activeSection === 'feedback'">
          <h2>用户反馈</h2>
          <div style="display:flex;gap:8px;margin-bottom:16px">
            <el-radio-group v-model="feedbackFilter" @change="fetchFeedback">
              <el-radio-button value="pending">待处理</el-radio-button>
              <el-radio-button value="resolved">已处理</el-radio-button>
              <el-radio-button value="ignored">已忽略</el-radio-button>
              <el-radio-button value="">全部</el-radio-button>
            </el-radio-group>
          </div>
          <div v-for="fb in feedbackList" :key="fb.id" class="review-item card">
            <div class="review-content">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <el-tag :type="fb.type === 'Bug 反馈' ? 'danger' : fb.type === '功能建议' ? 'primary' : fb.type === '体验优化' ? 'warning' : 'info'" size="small">{{ fb.type }}</el-tag>
                <strong>{{ fb.username || '未知用户' }}</strong>
                <span style="font-size:0.8rem;color:var(--color-text-secondary)">@{{ fb.account_id || fb.username }}</span>
              </div>
              <p class="review-excerpt" style="white-space:pre-wrap">{{ fb.content }}</p>
              <div style="display:flex;gap:12px;margin-top:4px">
                <span class="app-time">{{ fb.created_at }}</span>
                <el-tag v-if="fb.status === 'resolved'" type="success" size="small">已处理</el-tag>
                <el-tag v-else-if="fb.status === 'ignored'" type="info" size="small">已忽略</el-tag>
                <el-tag v-else type="warning" size="small">待处理</el-tag>
              </div>
              <div v-if="fb.admin_reply" style="margin-top:8px;padding:8px 12px;background:var(--color-bg-secondary);border-radius:6px;font-size:0.85rem">
                <strong>回复：</strong>{{ fb.admin_reply }}
              </div>
            </div>
            <div class="review-actions" v-if="fb.status === 'pending'">
              <el-button type="success" size="small" @click="resolveFeedback(fb.id)">已处理</el-button>
              <el-button type="info" size="small" @click="ignoreFeedback(fb.id)">忽略</el-button>
            </div>
          </div>
          <p v-if="!feedbackList.length" class="empty-text">暂无反馈</p>
        </template>
      </div>
    </div>

    <!-- Location Dialog -->
    <el-dialog v-model="showLocationDialog" :title="editingLocation ? '编辑地点' : '新增地点'" width="500px">
      <el-form :model="locationForm" label-width="80px">
        <el-form-item label="名称"><el-input v-model="locationForm.name" placeholder="如：藏经阁A座" /></el-form-item>
        <el-form-item label="楼栋"><el-input v-model="locationForm.building" placeholder="如：图书馆" /></el-form-item>
        <el-form-item label="楼层"><el-input v-model="locationForm.floor" placeholder="如：3层" /></el-form-item>
        <el-form-item label="开放时间"><el-input v-model="locationForm.openTime" placeholder="如：08:00" /></el-form-item>
        <el-form-item label="关闭时间"><el-input v-model="locationForm.closeTime" placeholder="如：22:00" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="locationForm.description" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showLocationDialog = false">取消</el-button>
        <el-button type="primary" @click="saveLocation" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- Add Seats Dialog -->
    <el-dialog v-model="showAddSeatsDialog" title="批量添加座位" width="400px">
      <el-form :model="seatForm" label-width="80px">
        <el-form-item label="行数"><el-input-number v-model="seatForm.rows" :min="1" :max="20" /></el-form-item>
        <el-form-item label="列数"><el-input-number v-model="seatForm.cols" :min="1" :max="30" /></el-form-item>
        <el-form-item label="座位前缀"><el-input v-model="seatForm.prefix" placeholder="如：A" style="width:100px" /></el-form-item>
        <el-form-item label="有电源">
          <el-select v-model="seatForm.powerDefault" style="width:120px">
            <el-option label="全部有电源" :value="true" />
            <el-option label="全部无电源" :value="false" />
          </el-select>
        </el-form-item>
      </el-form>
      <p style="color:var(--color-text-secondary);font-size:0.85rem">
        将生成 {{ seatForm.rows * seatForm.cols }} 个座位，编号如 {{ seatForm.prefix }}-01, {{ seatForm.prefix }}-02...
      </p>
      <template #footer>
        <el-button @click="showAddSeatsDialog = false">取消</el-button>
        <el-button type="primary" @click="batchAddSeats" :loading="saving">添加</el-button>
      </template>
    </el-dialog>

    <!-- Edit Post Dialog -->
    <el-dialog v-model="showEditPostDialog" title="管理员编辑文章" width="600px">
      <el-form :model="editPostForm" label-width="60px">
        <el-form-item label="标题"><el-input v-model="editPostForm.title" /></el-form-item>
        <el-form-item label="内容"><el-input v-model="editPostForm.content" type="textarea" :rows="10" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditPostDialog = false">取消</el-button>
        <el-button type="primary" @click="submitEditPost" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- User Detail Dialog -->
    <el-dialog v-model="showUserDetailDialog" title="学子详情" width="500px">
      <div v-if="userDetail" class="user-detail">
        <div class="user-detail-header">
          <UserAvatar :avatar-url="userDetail.avatar_url" :nickname="userDetail.username" :size="64" class="user-detail-avatar" />
          <div>
            <h3 style="margin:0">{{ userDetail.username }}</h3>
            <p style="margin:4px 0 0;font-size:0.85rem;color:var(--color-text-secondary)">@{{ userDetail.username }} · {{ userDetail.role_name }}</p>
          </div>
          <el-tag :type="userDetail.status === 1 ? 'success' : 'danger'" size="small" style="margin-left:auto">{{ userDetail.status === 1 ? '正常' : '禁言' }}</el-tag>
        </div>
        <el-descriptions :column="2" border size="small" style="margin-top:16px">
          <el-descriptions-item label="积分">{{ userDetail.total_points || 0 }}</el-descriptions-item>
          <el-descriptions-item label="等级">{{ userDetail.level_name || '初学' }} {{ userDetail.level_badge || '' }}</el-descriptions-item>
          <el-descriptions-item label="修习时长">{{ Math.floor((userDetail.total_study_minutes || 0) / 60) }} 小时</el-descriptions-item>
          <el-descriptions-item label="番茄钟">{{ userDetail.total_pomodoros || 0 }} 个</el-descriptions-item>
          <el-descriptions-item label="发表文章">{{ userDetail.published_posts || 0 }} 篇</el-descriptions-item>
          <el-descriptions-item label="发表评论">{{ userDetail.published_comments || 0 }} 条</el-descriptions-item>
          <el-descriptions-item label="连续签到">{{ userDetail.checkin_streak || 0 }} 天</el-descriptions-item>
          <el-descriptions-item label="本月违约">{{ userDetail.penalty_count || 0 }} 次</el-descriptions-item>
          <el-descriptions-item label="禁预约至" v-if="userDetail.ban_until">{{ formatDate(userDetail.ban_until) }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ formatDate(userDetail.created_at) }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import AppNavbar from '@/components/AppNavbar.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { adminAPI, feedbackAPI } from '@/api/user'
import { communityAdminAPI, postAPI } from '@/api/community'
import { volunteerAPI, locationAPI } from '@/api/study'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'

const userStore = useUserStore()
const activeSection = ref('posts')
const saving = ref(false)

const allMenuItems = [
  { key: 'posts', icon: '📝', label: '文章审核', roles: ['admin', 'super_admin'] },
  { key: 'postManage', icon: '📄', label: '文章管理', roles: ['admin', 'super_admin'] },
  { key: 'comments', icon: '💬', label: '评论管理', roles: ['admin', 'super_admin'] },
  { key: 'proposals', icon: '✏️', label: '修改审核', roles: ['admin', 'super_admin'] },
  { key: 'users', icon: '👥', label: '学子管理', roles: ['admin', 'super_admin'] },
  { key: 'seats', icon: '🪑', label: '座位管理', roles: ['admin', 'super_admin'] },
  { key: 'applications', icon: '📨', label: '管理员申请', roles: ['super_admin'] },
  { key: 'volunteer', icon: '🤝', label: '志愿审核', roles: ['admin', 'super_admin'] },
  { key: 'logs', icon: '📋', label: '审核日志', roles: ['admin', 'super_admin'] },
  { key: 'stats', icon: '📈', label: '系统统计', roles: ['super_admin'] },
  { key: 'feedback', icon: '📬', label: '用户反馈', roles: ['super_admin'] }
]

const filteredMenu = computed(() => {
  const role = userStore.user?.roleName
  return allMenuItems.filter(item => item.roles.includes(role))
})

const pendingPosts = ref([])
const allPosts = ref([])
const allComments = ref([])
const pendingComments = ref([])
const pendingProposals = ref([])
const users = ref([])
const volunteerPending = ref([])
const reviewLogs = ref([])
const sysStats = ref(null)
const statsTrend = ref(null)
const chartTrendRef = ref(null)
const chartStudyRef = ref(null)
const chartRoleRef = ref(null)
const chartCategoryRef = ref(null)
const adminApplications = ref([])
const feedbackList = ref([])
const feedbackFilter = ref('pending')

// Seat management state
const locations = ref([])
const selectedLocation = ref(null)
const currentSeats = ref([])
const showLocationDialog = ref(false)
const showAddSeatsDialog = ref(false)
const editingLocation = ref(null)
const locationForm = reactive({ name: '', building: '', floor: '', openTime: '', closeTime: '', description: '' })
const seatForm = reactive({ rows: 5, cols: 8, prefix: 'A', powerDefault: false })

// Edit post dialog state
const showEditPostDialog = ref(false)
const editPostForm = reactive({ id: null, title: '', content: '' })

// User detail dialog state
const showUserDetailDialog = ref(false)
const userDetail = ref(null)

function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '' }

async function fetchPendingPosts() {
  try { const res = await communityAdminAPI.getPendingPosts({ pageSize: 50 }); pendingPosts.value = res.data || [] } catch { /* */ }
}
async function fetchPendingComments() {
  try { const res = await communityAdminAPI.getPendingComments({ pageSize: 50 }); pendingComments.value = res.data || [] } catch { /* */ }
}
async function fetchAllPosts() {
  try { const res = await communityAdminAPI.getAllPosts({ pageSize: 100 }); allPosts.value = res.data || [] } catch { /* */ }
}
async function fetchAllComments() {
  try { const res = await communityAdminAPI.getAllComments({ pageSize: 100 }); allComments.value = res.data || [] } catch { /* */ }
}
async function fetchPendingProposals() {
  try { const res = await communityAdminAPI.getPendingProposals({ pageSize: 50 }); pendingProposals.value = res.data || [] } catch { /* */ }
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
  try {
    const res = await adminAPI.getStats(); sysStats.value = res.data
    const trendRes = await adminAPI.getStatsTrend(14); statsTrend.value = trendRes.data
    await nextTick()
    renderCharts()
  } catch { /* */ }
}

async function renderCharts() {
  if (!statsTrend.value) return
  const echarts = await import('echarts')
  const t = statsTrend.value.trend || []
  const dates = t.map(d => d.date.slice(5)) // "MM-DD"

  // Helper: reuse or create echarts instance
  function getChart(el) {
    if (!el) return null
    const existing = echarts.getInstanceByDom(el)
    if (existing) return existing
    return echarts.init(el)
  }

  // User & Active trend
  const c1 = getChart(chartTrendRef.value)
  if (c1) {
    c1.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['新增用户', '活跃用户'], textStyle: { color: '#888' } },
      grid: { left: 40, right: 20, top: 30, bottom: 24 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: '#888', fontSize: 10 } },
      yAxis: { type: 'value', axisLabel: { color: '#888' }, splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } } },
      series: [
        { name: '新增用户', type: 'line', data: t.map(d => d.newUsers), smooth: true, itemStyle: { color: '#5b5b9c' } },
        { name: '活跃用户', type: 'line', data: t.map(d => d.activeUsers), smooth: true, itemStyle: { color: '#4a9a6a' } }
      ]
    })
  }

  // Study minutes bar
  const c2 = getChart(chartStudyRef.value)
  if (c2) {
    c2.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, top: 20, bottom: 24 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: '#888', fontSize: 10 } },
      yAxis: { type: 'value', name: '分钟', axisLabel: { color: '#888' }, splitLine: { lineStyle: { color: 'rgba(0,0,0,0.06)' } } },
      series: [{ type: 'bar', data: t.map(d => d.studyMinutes), itemStyle: { color: '#b8860b', borderRadius: [4, 4, 0, 0] } }]
    })
  }

  // Role pie
  const rd = statsTrend.value.roleDistribution || []
  const c3 = getChart(chartRoleRef.value)
  if (c3 && rd.length) {
    c3.setOption({
      tooltip: { trigger: 'item' },
      series: [{ type: 'pie', radius: ['35%', '65%'], data: rd, label: { color: '#888' }, itemStyle: { borderColor: '#fff', borderWidth: 2 } }]
    })
  }

  // Category pie
  const cd = statsTrend.value.categoryDistribution || []
  const c4 = getChart(chartCategoryRef.value)
  if (c4 && cd.length) {
    c4.setOption({
      tooltip: { trigger: 'item' },
      series: [{ type: 'pie', radius: ['35%', '65%'], data: cd, label: { color: '#888' }, itemStyle: { borderColor: '#fff', borderWidth: 2 } }]
    })
  }
}
async function fetchApplications() {
  try { const res = await adminAPI.getApplications({ pageSize: 50 }); adminApplications.value = res.data || [] } catch { /* */ }
}
async function fetchFeedback() {
  try {
    const params = { pageSize: 50 }
    if (feedbackFilter.value) params.status = feedbackFilter.value
    const res = await feedbackAPI.getList(params)
    feedbackList.value = res.data || []
  } catch { /* */ }
}
async function resolveFeedback(id) {
  try {
    const { value } = await ElMessageBox.prompt('请输入回复（可选）', '处理反馈', { confirmButtonText: '确认处理', cancelButtonText: '取消', inputPlaceholder: '如：感谢反馈，已修复该问题' })
    await feedbackAPI.updateStatus(id, { status: 'resolved', adminReply: value || '' })
    ElMessage.success('已标记为已处理')
    fetchFeedback()
  } catch { /* cancelled */ }
}
async function ignoreFeedback(id) {
  try {
    await ElMessageBox.confirm('确认忽略该反馈？', '忽略确认', { type: 'warning' })
    await feedbackAPI.updateStatus(id, { status: 'ignored' })
    ElMessage.success('已忽略')
    fetchFeedback()
  } catch { /* cancelled */ }
}
async function fetchLocations() {
  try { const res = await locationAPI.getList(); locations.value = res.data || [] } catch { /* */ }
}

function openSeatManager(loc) {
  selectedLocation.value = loc
  fetchSeats(loc.id)
}

async function fetchSeats(locationId) {
  try {
    const res = await locationAPI.getSeats(locationId)
    currentSeats.value = res.data || []
  } catch { /* */ }
}

function seatClass(seat) {
  const status = seat.reservation_status
  if (seat.status === 'maintenance') return 'seat-maintenance'
  if (status === 'occupied' || status === 'reserved') return 'seat-occupied'
  return 'seat-available'
}

function resetLocationForm() {
  locationForm.name = ''
  locationForm.building = ''
  locationForm.floor = ''
  locationForm.openTime = ''
  locationForm.closeTime = ''
  locationForm.description = ''
  editingLocation.value = null
}

function editLocation(loc) {
  editingLocation.value = loc
  locationForm.name = loc.name || ''
  locationForm.building = loc.building || ''
  locationForm.floor = loc.floor || ''
  locationForm.openTime = loc.open_time || ''
  locationForm.closeTime = loc.close_time || ''
  locationForm.description = loc.description || ''
  showLocationDialog.value = true
}

async function saveLocation() {
  saving.value = true
  try {
    const data = {
      name: locationForm.name,
      building: locationForm.building,
      floor: locationForm.floor,
      openTime: locationForm.openTime,
      closeTime: locationForm.closeTime,
      description: locationForm.description,
      totalSeats: 0
    }
    if (editingLocation.value) {
      await locationAPI.update(editingLocation.value.id, data)
      ElMessage.success('地点已更新')
    } else {
      await locationAPI.create(data)
      ElMessage.success('地点已创建')
    }
    showLocationDialog.value = false
    resetLocationForm()
    fetchLocations()
  } catch (err) { ElMessage.error(err.message) }
  finally { saving.value = false }
}

async function deleteLocation(id) {
  try {
    await ElMessageBox.confirm('确认删除该地点？相关座位也将清除。', '删除确认', { type: 'warning' })
    await locationAPI.delete(id)
    ElMessage.success('已删除')
    fetchLocations()
    if (selectedLocation.value?.id === id) selectedLocation.value = null
  } catch { /* cancelled */ }
}

async function batchAddSeats() {
  if (!selectedLocation.value) return
  saving.value = true
  try {
    const seats = []
    for (let r = 0; r < seatForm.rows; r++) {
      for (let c = 0; c < seatForm.cols; c++) {
        const num = r * seatForm.cols + c + 1
        seats.push({
          seat_code: `${seatForm.prefix}-${String(num).padStart(2, '0')}`,
          row_num: r + 1,
          col_num: c + 1,
          has_power: seatForm.powerDefault ? 1 : 0
        })
      }
    }
    await locationAPI.batchCreateSeats(selectedLocation.value.id, seats)
    ElMessage.success(`已添加 ${seats.length} 个座位`)
    showAddSeatsDialog.value = false
    fetchSeats(selectedLocation.value.id)
    fetchLocations()
  } catch (err) { ElMessage.error(err.message) }
  finally { saving.value = false }
}

async function clearSeats(locationId) {
  try {
    await ElMessageBox.confirm('确认清空该地点所有座位？', '清空确认', { type: 'warning' })
    // Reuse delete + recreate approach: delete location data then refresh
    ElMessage.info('请删除并重建该地点以清空座位')
  } catch { /* cancelled */ }
}

async function reviewAdminApp(id, action) {
  try {
    await adminAPI.reviewApplication(id, action)
    ElMessage.success(action === 'approve' ? '已通过' : '已拒绝')
    fetchApplications()
    fetchUsers()
  } catch (err) { ElMessage.error(err.message) }
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
    fetchAllComments()
  } catch (err) { ElMessage.error(err.message) }
}

async function adminDeletePost(id) {
  try {
    await ElMessageBox.confirm('确认删除该文章？此操作不可恢复。', '删除确认', { type: 'warning' })
    await communityAdminAPI.deletePost(id)
    ElMessage.success('文章已删除')
    fetchAllPosts()
    fetchPendingPosts()
  } catch { /* cancelled */ }
}

async function adminDeleteComment(id) {
  try {
    await ElMessageBox.confirm('确认删除该评论？此操作不可恢复。', '删除确认', { type: 'warning' })
    await communityAdminAPI.deleteComment(id)
    ElMessage.success('评论已删除')
    fetchAllComments()
  } catch { /* cancelled */ }
}

async function togglePinPost(id, pinned) {
  try {
    await communityAdminAPI.pinPost(id, !pinned)
    ElMessage.success(!pinned ? '已置顶' : '已取消置顶')
    fetchAllPosts()
  } catch (err) { ElMessage.error(err.message) }
}

async function toggleFeaturePost(id, featured) {
  try {
    await communityAdminAPI.featurePost(id, !featured)
    ElMessage.success(!featured ? '已精选' : '已取消精选')
    fetchAllPosts()
  } catch (err) { ElMessage.error(err.message) }
}

async function toggleHidePost(id, hidden) {
  try {
    await communityAdminAPI.hidePost(id, hidden)
    ElMessage.success(hidden ? '文章已隐藏' : '文章已恢复')
    fetchAllPosts()
  } catch (err) { ElMessage.error(err.message) }
}

async function openEditPostDialog(post) {
  editPostForm.id = post.id
  editPostForm.title = post.title || ''
  editPostForm.content = '加载中...'
  showEditPostDialog.value = true
  try {
    const res = await postAPI.getById(post.id)
    editPostForm.content = res.data?.content || ''
  } catch {
    editPostForm.content = ''
  }
}

async function submitEditPost() {
  if (!editPostForm.title) return ElMessage.warning('标题不能为空')
  saving.value = true
  try {
    await communityAdminAPI.editPost(editPostForm.id, {
      title: editPostForm.title,
      content: editPostForm.content || undefined
    })
    ElMessage.success('文章已更新')
    showEditPostDialog.value = false
    fetchAllPosts()
  } catch (err) { ElMessage.error(err.message) }
  finally { saving.value = false }
}

async function viewUserDetail(userId) {
  try {
    const res = await adminAPI.getUserDetail(userId)
    userDetail.value = res.data
    showUserDetailDialog.value = true
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

async function mergeProposal(id) {
  try {
    await communityAdminAPI.mergeProposal(id)
    ElMessage.success('提案已合并')
    fetchPendingProposals()
  } catch (err) { ElMessage.error(err.message) }
}

async function rejectProposal(id) {
  const reason = await promptReason()
  if (reason === false) return
  try {
    await communityAdminAPI.rejectProposal(id, { reason })
    ElMessage.success('提案已拒绝')
    fetchPendingProposals()
  } catch (err) { ElMessage.error(err.message) }
}

watch(activeSection, (val) => {
  const fetchers = {
    posts: fetchPendingPosts, postManage: fetchAllPosts,
    comments: () => { fetchAllComments(); fetchPendingComments() },
    proposals: fetchPendingProposals,
    users: fetchUsers, seats: fetchLocations, applications: fetchApplications,
    volunteer: fetchVolunteer, logs: fetchLogs, stats: fetchStats, feedback: fetchFeedback
  }
  fetchers[val]?.()
})

watch(showLocationDialog, (val) => { if (!val) resetLocationForm() })

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
.app-time { font-size: 0.75rem; color: var(--color-text-secondary); }
.empty-text { text-align: center; color: var(--color-text-secondary); padding: 40px; }

.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.stat-card { padding: 20px; text-align: center; }
.stat-val { display: block; font-family: var(--font-mono); font-size: 1.8rem; font-weight: 700; color: var(--color-accent); margin-bottom: 4px; }
.stat-lbl { display: block; font-size: 0.85rem; color: var(--color-text-secondary); }

.charts-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 20px; }
.chart-card { padding: 16px; }
.chart-title { font-size: 0.9rem; font-weight: 600; margin-bottom: 8px; color: var(--color-text-primary); }
.chart-box { width: 100%; height: 280px; }

/* Seat grid */
.seat-grid { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px; background: var(--glass-bg-card); border-radius: 8px; }
.seat-cell { width: 48px; height: 36px; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 0.7rem; font-family: var(--font-mono); font-weight: 600; }
.seat-available { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
.seat-occupied { background: #f5c6cb; color: #721c24; border: 1px solid #f1b0b7; }
.seat-maintenance { background: #e2e3e5; color: #6c757d; border: 1px solid #d6d8db; }
.power-icon { font-size: 0.55rem; }

/* User Detail Dialog */
.user-detail-header { display: flex; align-items: center; gap: 12px; }
.user-detail-avatar {
  flex-shrink: 0;
}
</style>
