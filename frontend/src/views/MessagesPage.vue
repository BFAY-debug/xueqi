<template>
  <div class="page">
    <AppNavbar />
    <div class="page-body container">
      <!-- Header -->
      <div class="messages-header">
        <h2>消息</h2>
        <span v-if="totalUnread" class="unread-badge">{{ totalUnread }}</span>
      </div>

      <!-- Tab Bar -->
      <div class="msg-tabs">
        <span class="msg-tab" :class="{ active: activeTab === 'messages' }" @click="activeTab = 'messages'">消息</span>
        <span class="msg-tab" :class="{ active: activeTab === 'friends' }" @click="switchToFriends">好友</span>
        <span class="msg-tab" :class="{ active: activeTab === 'requests' }" @click="switchToRequests">
          申请
          <span v-if="friendStore.unreadRequestCount" class="tab-badge">{{ friendStore.unreadRequestCount }}</span>
        </span>
      </div>

      <!-- Tab: Messages (existing conversation list) -->
      <template v-if="activeTab === 'messages'">
        <div class="conversations-list" v-if="messageStore.conversations.length">
          <div
            v-for="conv in messageStore.conversations"
            :key="conv.id"
            class="conv-card card"
            @click="openChat(conv)"
          >
            <UserAvatar :avatar-url="conv.peerAvatar" :nickname="conv.peerName" :size="44" />
            <div class="conv-info">
              <div class="conv-top">
                <span class="conv-name">{{ conv.peerName }}</span>
                <span class="conv-time">{{ formatTime(conv.lastMessageAt) }}</span>
              </div>
              <div class="conv-bottom">
                <span class="conv-preview">{{ conv.lastMessage || '暂无消息' }}</span>
                <span v-if="conv.unreadCount" class="conv-unread">{{ conv.unreadCount }}</span>
              </div>
            </div>
          </div>
        </div>
        <AppEmpty v-else text="暂无消息，去书院找人聊聊吧" />
      </template>

      <!-- Tab: Friends -->
      <template v-if="activeTab === 'friends'">
        <div class="friend-search">
          <input v-model="friendSearch" placeholder="搜索好友..." class="friend-search-input" />
        </div>
        <div class="friends-grid" v-if="filteredFriends.length">
          <div v-for="f in filteredFriends" :key="f.id" class="friend-card card" @click="openFriendChat(f)">
            <div class="friend-avatar-wrap">
              <UserAvatar :avatar-url="f.avatar_url" :nickname="f.username" :size="44" />
            </div>
            <div class="friend-info">
              <span class="friend-name">{{ f.username }}</span>
              <span class="friend-bio">{{ f.bio || '暂无签名' }}</span>
            </div>
          </div>
        </div>
        <AppEmpty v-else text="暂无好友，去认识一些学友吧" />
      </template>

      <!-- Tab: Requests -->
      <template v-if="activeTab === 'requests'">
        <!-- User Search -->
        <div class="user-search">
          <input v-model="userSearchQuery" placeholder="搜索用户昵称或用户名..." class="friend-search-input" @input="onUserSearch" />
          <div v-if="searchResults.length" class="search-results">
            <div v-for="u in searchResults" :key="u.id" class="req-card card">
              <UserAvatar :avatar-url="u.avatar_url" :nickname="u.username" :size="40" />
              <div class="req-info">
                <span class="req-name">{{ u.username }}</span>
                <span class="friend-bio">{{ u.bio || '暂无签名' }}</span>
              </div>
              <div class="req-actions">
                <button v-if="u.friendStatus === 'none'" class="btn-accept" @click="handleSendRequest(u)">添加好友</button>
                <button v-else-if="u.friendStatus === 'request_sent'" class="btn-reject" disabled>已申请</button>
                <button v-else-if="u.friendStatus === 'friend'" class="btn-reject" disabled>已好友</button>
                <button v-else-if="u.friendStatus === 'request_received'" class="btn-accept" @click="handleAcceptFromSearch(u)">接受</button>
              </div>
            </div>
          </div>
          <div v-else-if="userSearchQuery.trim() && searchDone && !searchResults.length" class="search-empty">
            未找到匹配的用户
          </div>
        </div>

        <div class="req-sub-tabs">
          <span :class="{ active: reqSubTab === 'incoming' }" @click="reqSubTab = 'incoming'">收到</span>
          <span :class="{ active: reqSubTab === 'outgoing' }" @click="switchToOutgoing">已发出</span>
        </div>
        <!-- Incoming -->
        <template v-if="reqSubTab === 'incoming'">
          <div v-if="friendStore.incomingRequests.length" class="requests-list">
            <div v-for="req in friendStore.incomingRequests" :key="req.id" class="req-card card">
              <UserAvatar :avatar-url="req.sender_avatar" :nickname="req.sender_username" :size="40" />
              <div class="req-info">
                <span class="req-name">{{ req.sender_username }}</span>
                <span class="req-msg" v-if="req.message">"{{ req.message }}"</span>
                <span class="req-time">{{ formatTime(req.created_at) }}</span>
              </div>
              <div class="req-actions">
                <button class="btn-accept" @click="handleAccept(req)">接受</button>
                <button class="btn-reject" @click="handleReject(req.id)">拒绝</button>
              </div>
            </div>
          </div>
          <AppEmpty v-else text="暂无好友申请" />
        </template>
        <!-- Outgoing -->
        <template v-if="reqSubTab === 'outgoing'">
          <div v-if="friendStore.outgoingRequests.length" class="requests-list">
            <div v-for="req in friendStore.outgoingRequests" :key="req.id" class="req-card card">
              <UserAvatar :avatar-url="req.receiver_avatar" :nickname="req.receiver_username" :size="40" />
              <div class="req-info">
                <span class="req-name">{{ req.receiver_username }}</span>
                <span class="req-status" :class="'status-' + req.status">{{ req.status === 'pending' ? '等待回复' : '已拒绝' }}</span>
              </div>
            </div>
          </div>
          <AppEmpty v-else text="暂无发出的申请" />
        </template>
      </template>
    </div>

    <!-- Profile Card (shared across tabs) -->
    <UserProfileCard
      v-if="profileUserId"
      :user-id="profileUserId"
      :visible="!!profileUserId"
      @close="profileUserId = null"
      @open-chat="handleOpenChat"
    />

    <AppFooter />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessageStore } from '@/stores/message'
import { useFriendStore } from '@/stores/friend'
import { friendAPI } from '@/api/friend'
import AppNavbar from '@/components/AppNavbar.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppEmpty from '@/components/AppEmpty.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import UserProfileCard from '@/components/UserProfileCard.vue'

const messageStore = useMessageStore()
const friendStore = useFriendStore()
const router = useRouter()

const activeTab = ref('messages')
const reqSubTab = ref('incoming')
const friendSearch = ref('')
const profileUserId = ref(null)
const userSearchQuery = ref('')
const searchResults = ref([])
const searchDone = ref(false)
let searchTimer = null

const totalUnread = computed(() => messageStore.unreadTotal + friendStore.unreadRequestCount)

const filteredFriends = computed(() => {
  const keyword = friendSearch.value.trim().toLowerCase()
  if (!keyword) return friendStore.friends
  return friendStore.friends.filter(f =>
    (f.username || '').toLowerCase().includes(keyword)
  )
})

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  if (diffMs < 60000) return '刚刚'
  if (diffMs < 3600000) return Math.floor(diffMs / 60000) + '分钟前'
  if (diffMs < 86400000) return Math.floor(diffMs / 3600000) + '小时前'
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function openChat(conv) {
  router.push(`/messages/${conv.id}`)
}

async function switchToFriends() {
  if (!friendStore.friends.length) {
    await friendStore.fetchFriends()
  }
  activeTab.value = 'friends'
}

async function switchToRequests() {
  if (!friendStore.incomingRequests.length && !friendStore.outgoingRequests.length) {
    await Promise.all([
      friendStore.fetchIncomingRequests(),
      friendStore.fetchOutgoingRequests()
    ])
  }
  activeTab.value = 'requests'
}

async function switchToOutgoing() {
  if (!friendStore.outgoingRequests.length) {
    await friendStore.fetchOutgoingRequests()
  }
  reqSubTab.value = 'outgoing'
}

async function handleAccept(req) {
  try {
    const result = await friendStore.acceptRequest(req.id)
    if (result?.conversationId) {
      router.push('/messages/' + result.conversationId)
    }
  } catch (e) {
    console.warn('Accept request failed:', e.message)
  }
}

async function handleReject(id) {
  try {
    await friendStore.rejectRequest(id)
  } catch (e) {
    console.warn('Reject request failed:', e.message)
  }
}

async function openFriendChat(friend) {
  try {
    const conv = await messageStore.openConversation(friend.id)
    if (conv) {
      router.push('/messages/' + conv.id)
    }
  } catch (e) {
    console.warn('Open friend chat failed:', e.message)
  }
}

function handleOpenChat({ userId, conversationId }) {
  router.push(`/messages/${conversationId}`)
}

function onUserSearch() {
  clearTimeout(searchTimer)
  const q = userSearchQuery.value.trim()
  if (!q) {
    searchResults.value = []
    searchDone.value = false
    return
  }
  searchTimer = setTimeout(async () => {
    try {
      const res = await friendAPI.searchUsers(q)
      searchResults.value = res.data || []
      searchDone.value = true
    } catch (e) {
      console.warn('Search users failed:', e.message)
    }
  }, 400)
}

async function handleSendRequest(user) {
  try {
    await friendStore.sendRequest(user.id)
    user.friendStatus = 'request_sent'
  } catch (e) {
    console.warn('Send request failed:', e.message)
  }
}

async function handleAcceptFromSearch(user) {
  const req = friendStore.incomingRequests.find(r => r.sender_id === user.id)
  if (req) {
    await handleAccept(req)
    user.friendStatus = 'friend'
  }
}

onMounted(async () => {
  await Promise.all([
    messageStore.fetchConversations(),
    messageStore.fetchUnreadCount(),
    friendStore.fetchUnreadRequestCount()
  ])
  messageStore.setupSocketListeners()
  friendStore.setupSocketListeners()
})

onUnmounted(() => {
  clearTimeout(searchTimer)
  messageStore.removeSocketListeners()
  friendStore.removeSocketListeners()
})
</script>

<style scoped>
/* ── Page Layout ─────────────────────────────────────── */
.page { min-height: 100vh; background: var(--color-bg-primary); }
.page-body { padding: calc(var(--nav-height) + 32px) 0 48px; max-width: 640px; }

/* ── Header ──────────────────────────────────────────── */
.messages-header {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 20px;
}
.messages-header h2 { font-family: var(--font-title); font-size: 1.4rem; }
.unread-badge {
  min-width: 20px; height: 20px; padding: 0 6px;
  border-radius: 10px; background: var(--color-accent); color: #fff;
  font-size: 0.75rem; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
}

/* ── Tab Bar ─────────────────────────────────────────── */
.msg-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border-light);
  margin-bottom: 20px;
  gap: 0;
}
.msg-tab {
  position: relative;
  padding: 10px 20px;
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color 0.2s;
  font-family: var(--font-body);
  user-select: none;
}
.msg-tab:hover {
  color: var(--color-text-primary);
}
.msg-tab.active {
  color: var(--color-accent);
  font-weight: 600;
}
.msg-tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 20px;
  right: 20px;
  height: 2px;
  background: var(--color-accent);
  border-radius: 1px;
}

/* ── Tab Badge ───────────────────────────────────────── */
.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--color-accent);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 600;
  margin-left: 4px;
  vertical-align: middle;
  line-height: 1;
}

/* ── Conversations List ──────────────────────────────── */
.conversations-list { display: flex; flex-direction: column; gap: 8px; }
.conv-card {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 16px; cursor: pointer; transition: transform 0.15s;
}
.conv-card:hover { transform: translateX(4px); }
.conv-info { flex: 1; min-width: 0; }
.conv-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.conv-name { font-weight: 600; font-size: 0.95rem; }
.conv-time { font-size: 0.75rem; color: var(--color-text-secondary); }
.conv-bottom { display: flex; justify-content: space-between; align-items: center; }
.conv-preview {
  font-size: 0.85rem; color: var(--color-text-secondary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 300px;
}
.conv-unread {
  min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 9px; background: var(--color-accent); color: #fff;
  font-size: 0.7rem; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

/* ── Friend Search ───────────────────────────────────── */
.friend-search {
  margin-bottom: 16px;
}
.friend-search-input {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid var(--color-border-light);
  border-radius: 20px;
  background: var(--glass-bg-card);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.friend-search-input::placeholder {
  color: var(--ink-light);
}
.friend-search-input:focus {
  border-color: var(--color-accent);
}

/* ── Friends Grid ────────────────────────────────────── */
.friends-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.friend-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  cursor: pointer;
  transition: transform 0.15s, background 0.2s;
}
.friend-card:hover {
  transform: translateX(4px);
  background: var(--glass-bg-hover);
}
.friend-avatar-wrap {
  flex-shrink: 0;
}
.friend-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.friend-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--color-text-primary);
}
.friend-bio {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── User Search in Requests Tab ──────────────────────── */
.user-search {
  margin-bottom: 16px;
}
.search-results {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.search-empty {
  text-align: center;
  color: var(--ink-light);
  font-size: 0.85rem;
  padding: 16px 0;
}

/* ── Request Sub Tabs ────────────────────────────────── */
.req-sub-tabs {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--color-border-light);
}
.req-sub-tabs span {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: color 0.2s, background 0.2s;
}
.req-sub-tabs span:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
}
.req-sub-tabs span.active {
  color: var(--color-accent);
  font-weight: 600;
  background: var(--color-accent-light);
}

/* ── Requests List ───────────────────────────────────── */
.requests-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.req-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
}
.req-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.req-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-text-primary);
}
.req-msg {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-style: italic;
}
.req-time {
  font-size: 0.72rem;
  color: var(--ink-light);
}
.req-status {
  font-size: 0.8rem;
}
.req-status.status-pending {
  color: var(--color-gold);
}
.req-status.status-rejected {
  color: var(--ink-light);
}
.req-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.req-actions .btn-accept,
.req-actions .btn-reject {
  padding: 5px 14px;
  font-size: 0.8rem;
}

/* ── Accept / Reject Buttons ─────────────────────────── */
.btn-accept {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 18px;
  background: var(--color-green);
  color: #fff;
  border: none;
  border-radius: 20px;
  font-family: var(--font-body);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-accept:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
}
.btn-accept:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-reject {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 18px;
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: 20px;
  font-family: var(--font-body);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-reject:hover:not(:disabled) {
  background: var(--color-bg-secondary);
}
.btn-reject:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
