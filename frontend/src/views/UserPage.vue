<template>
  <div class="page-wrapper">
    <AppNavbar />
    <div class="page-content container" style="margin-top: var(--nav-height); padding-top: 24px;">
      <BackButton />

      <div v-if="loading" class="loading-state">
        <span class="loading-spinner"></span>
        <span>加载中...</span>
      </div>

      <div v-else-if="error" class="error-state">
        <p>{{ error }}</p>
        <button class="btn-retry" @click="fetchData">重试</button>
      </div>

      <div v-else-if="userInfo" class="user-layout">
        <!-- Left Sidebar -->
        <div class="user-sidebar card">
          <div class="user-avatar-section">
            <div class="avatar-wrapper">
              <img v-if="userInfo.avatar_url" :src="userInfo.avatar_url" alt="avatar" class="user-avatar" />
              <div v-else class="avatar-placeholder">{{ userInfo.username?.[0] || '?' }}</div>
            </div>
            <h2 class="user-name">{{ userInfo.username }}</h2>
            <p v-if="userInfo.account_id" class="user-account-id">@{{ userInfo.account_id }}</p>
            <p v-if="userInfo.bio" class="user-bio">{{ userInfo.bio }}</p>

            <div class="user-level">
              <span class="seal" :class="`seal--level-${userInfo.level_id || 1}`">{{ userInfo.level_name || '书童' }}</span>
              <span class="user-points">{{ stats.total_points || 0 }} 积分</span>
            </div>
          </div>

          <div class="user-stats-row">
            <div class="user-stat">
              <span class="us-val">{{ Math.floor((stats.total_study_minutes || 0) / 60) }}</span>
              <span class="us-lbl">修习小时</span>
            </div>
            <div class="user-stat">
              <span class="us-val">{{ stats.total_pomodoros || 0 }}</span>
              <span class="us-lbl">番茄钟</span>
            </div>
            <div class="user-stat">
              <span class="us-val">{{ stats.total_points || 0 }}</span>
              <span class="us-lbl">总积分</span>
            </div>
          </div>

          <div class="user-follow-stats">
            <div class="follow-stat" @click="activeTab = 'following'">
              <span class="fs-val">{{ stats.following_count || 0 }}</span>
              <span class="fs-lbl">关注</span>
            </div>
            <div class="follow-stat" @click="activeTab = 'followers'">
              <span class="fs-val">{{ stats.follower_count || 0 }}</span>
              <span class="fs-lbl">粉丝</span>
            </div>
          </div>

          <!-- Actions -->
          <div v-if="!isSelf" class="user-actions">
            <button
              class="btn-follow"
              :class="{ following: isFollowing }"
              :disabled="followLoading"
              @click="toggleFollow"
            >
              {{ followLoading ? '...' : isFollowing ? '已关注' : '+ 关注' }}
            </button>
            <button v-if="friendStatus === 'friend'" class="btn-message" @click="openChat">
              发消息
            </button>
          </div>
          <div v-else class="user-actions">
            <router-link to="/profile" class="btn-self">我的主页</router-link>
          </div>
        </div>

        <!-- Right Content -->
        <div class="user-main">
          <div class="user-tabs">
            <span :class="{ active: activeTab === 'posts' }" @click="activeTab = 'posts'">文章</span>
            <span :class="{ active: activeTab === 'following' }" @click="activeTab = 'following'">关注</span>
            <span :class="{ active: activeTab === 'followers' }" @click="activeTab = 'followers'">粉丝</span>
          </div>

          <!-- Posts -->
          <div v-if="activeTab === 'posts'" class="tab-content">
            <div v-if="posts.length" class="post-list">
              <div
                v-for="p in posts"
                :key="p.id"
                class="post-item card"
                @click="$router.push('/community/posts/' + p.id)"
              >
                <h4 class="post-title">{{ p.title }}</h4>
                <p v-if="p.summary" class="post-summary">{{ p.summary }}</p>
                <div class="post-meta">
                  <span>{{ p.category }}</span>
                  <span>v{{ p.version }}</span>
                  <span>{{ timeAgo(p.created_at) }}</span>
                  <span>👀{{ p.view_count }} ❤️{{ p.like_count }} 💬{{ p.comment_count }}</span>
                </div>
              </div>
            </div>
            <div v-if="loadingPosts" class="loading-more">加载中...</div>
            <p v-if="!posts.length && !loadingPosts" class="empty-text">暂无文章</p>
          </div>

          <!-- Following -->
          <div v-if="activeTab === 'following'" class="tab-content">
            <div class="follow-list">
              <div v-for="u in followingList" :key="u.id" class="follow-item card" @click="$router.push('/user/' + u.id)">
                <UserAvatar :avatar-url="u.avatar_url" :nickname="u.username" :size="36" />
                <span class="follow-name">{{ u.username }}</span>
              </div>
            </div>
            <p v-if="!followingList.length" class="empty-text">暂无关注</p>
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppNavbar from '@/components/AppNavbar.vue'
import BackButton from '@/components/BackButton.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { userAPI } from '@/api/user'
import { postAPI } from '@/api/community'
import { followAPI } from '@/api/follow'
import { useUserStore } from '@/stores/user'
import { useFriendStore } from '@/stores/friend'
import { useMessageStore } from '@/stores/message'
import { useTimeAgo } from '@/composables/useTimeAgo'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const friendStore = useFriendStore()
const messageStore = useMessageStore()
const { timeAgo } = useTimeAgo()

const userId = computed(() => parseInt(route.params.id, 10))
const isSelf = computed(() => userStore.user?.userId === userId.value)

const loading = ref(true)
const error = ref('')
const userInfo = ref(null)
const stats = ref({})
const isFollowing = ref(false)
const followLoading = ref(false)
const friendStatus = ref('none')

const activeTab = ref('posts')
const posts = ref([])
const loadingPosts = ref(false)
const followingList = ref([])
const followerList = ref([])

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const userRes = await userAPI.getUserById(userId.value)
    userInfo.value = userRes.data

    const statsRes = await userAPI.getUserStats(userId.value)
    stats.value = statsRes.data || {}

    if (!isSelf.value && userStore.isLoggedIn) {
      try {
        const followRes = await followAPI.check(userId.value)
        isFollowing.value = followRes.data?.following || false
      } catch { /* ignore */ }

      try {
        friendStatus.value = await friendStore.getFriendStatus(userId.value)
      } catch { /* ignore */ }
    }

    fetchPosts()
  } catch (e) {
    error.value = e.response?.data?.message || e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function fetchPosts() {
  loadingPosts.value = true
  try {
    const res = await postAPI.getUserPosts(userId.value, { pageSize: 20 })
    posts.value = res.data || []
  } catch { /* ignore */ }
  finally { loadingPosts.value = false }
}

async function fetchFollowing() {
  try {
    const res = await followAPI.getFollowing(userId.value, { pageSize: 50 })
    followingList.value = Array.isArray(res.data) ? res.data : res.data?.data || []
  } catch { /* ignore */ }
}

async function fetchFollowers() {
  try {
    const res = await followAPI.getFollowers(userId.value, { pageSize: 50 })
    followerList.value = Array.isArray(res.data) ? res.data : res.data?.data || []
  } catch { /* ignore */ }
}

async function toggleFollow() {
  if (followLoading.value) return
  followLoading.value = true
  try {
    await followAPI.toggle(userId.value)
    isFollowing.value = !isFollowing.value
    // Update local stats count
    if (isFollowing.value) {
      stats.value.follower_count = (stats.value.follower_count || 0) + 1
    } else {
      stats.value.follower_count = Math.max(0, (stats.value.follower_count || 1) - 1)
    }
  } catch { /* ignore */ }
  finally { followLoading.value = false }
}

async function openChat() {
  try {
    const conv = await messageStore.openConversation(userId.value)
    if (conv) router.push('/messages/' + conv.id)
  } catch { /* ignore */ }
}

watch(activeTab, (tab) => {
  if (tab === 'following') fetchFollowing()
  if (tab === 'followers') fetchFollowers()
})

watch(() => route.params.id, () => {
  if (route.params.id) fetchData()
})

onMounted(() => fetchData())
</script>

<style scoped>
.page-wrapper { min-height: 100vh; background: var(--color-bg-primary); }

.user-layout { display: flex; gap: 24px; }

/* Sidebar */
.user-sidebar {
  width: 280px;
  flex-shrink: 0;
  padding: 24px;
}
.user-avatar-section { text-align: center; margin-bottom: 16px; }
.avatar-wrapper {
  width: 100px; height: 100px;
  margin: 0 auto 12px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--color-border-light);
}
.user-avatar { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder {
  width: 100px; height: 100px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 2rem;
  font-family: var(--font-title);
  margin: 0 auto;
}
.user-name {
  font-family: var(--font-title);
  font-size: 1.3rem;
  margin-bottom: 4px;
}
.user-account-id {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}
.user-bio {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
  word-break: break-word;
}
.user-level {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 16px;
}
.user-points {
  font-size: 0.85rem;
  color: var(--color-gold);
  font-weight: 600;
}

.user-stats-row {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 12px 0;
  border-top: 1px solid var(--color-border-light);
  border-bottom: 1px solid var(--color-border-light);
  margin-bottom: 12px;
}
.user-stat { text-align: center; }
.us-val {
  display: block;
  font-family: var(--font-mono);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-accent);
}
.us-lbl { display: block; font-size: 0.75rem; color: var(--color-text-secondary); }

.user-follow-stats {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-bottom: 16px;
}
.follow-stat {
  text-align: center;
  cursor: pointer;
  transition: opacity 0.2s;
}
.follow-stat:hover { opacity: 0.7; }
.fs-val { display: block; font-size: 1rem; font-weight: 600; }
.fs-lbl { display: block; font-size: 0.75rem; color: var(--color-text-secondary); }

/* Actions */
.user-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}
.btn-follow {
  padding: 8px 24px;
  border-radius: 20px;
  border: 1px solid var(--color-accent);
  background: var(--color-accent);
  color: #fff;
  font-family: var(--font-body);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-follow.following {
  background: transparent;
  color: var(--color-accent);
}
.btn-follow:hover { transform: translateY(-1px); }
.btn-follow:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-message {
  padding: 8px 18px;
  border-radius: 20px;
  border: 1px solid var(--color-border-light);
  background: transparent;
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-message:hover { background: var(--color-bg-secondary); }

.btn-self {
  padding: 8px 24px;
  border-radius: 20px;
  border: 1px solid var(--color-border-light);
  background: transparent;
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  font-size: 0.9rem;
  text-decoration: none;
  transition: all 0.2s;
}
.btn-self:hover { background: var(--color-bg-secondary); color: var(--color-text-primary); }

/* Main */
.user-main { flex: 1; min-width: 0; }
.user-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--color-border-light);
  margin-bottom: 20px;
}
.user-tabs span {
  padding: 10px 16px;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}
.user-tabs span:hover { color: var(--color-text-primary); }
.user-tabs span.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
  font-weight: 600;
}

/* Posts */
.post-list { display: flex; flex-direction: column; gap: 10px; }
.post-item {
  padding: 16px 18px;
  cursor: pointer;
  transition: all 0.15s;
}
.post-item:hover { transform: none; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.post-title { font-size: 0.95rem; font-weight: 500; margin-bottom: 4px; }
.post-summary {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.post-meta {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  display: flex;
  gap: 12px;
}

/* Follow List */
.follow-list { display: flex; flex-direction: column; gap: 8px; }
.follow-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.15s;
}
.follow-item:hover { transform: none; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.follow-name { font-size: 0.9rem; }

/* States */
.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 0;
  color: var(--color-text-secondary);
}
.loading-spinner {
  display: inline-block;
  width: 28px; height: 28px;
  border: 3px solid var(--color-border-light);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.error-state p { color: var(--color-accent); margin: 0; }
.btn-retry {
  padding: 6px 16px;
  border: 1px solid var(--color-accent);
  border-radius: 16px;
  background: transparent;
  color: var(--color-accent);
  cursor: pointer;
  font-size: 0.85rem;
}
.empty-text { text-align: center; color: var(--color-text-secondary); padding: 40px; }
.loading-more { text-align: center; color: var(--color-text-secondary); padding: 16px; font-size: 0.85rem; }

@media (max-width: 768px) {
  .user-layout { flex-direction: column; }
  .user-sidebar { width: 100%; }
}
</style>
