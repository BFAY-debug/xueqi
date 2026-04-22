<template>
  <Teleport to="body">
    <Transition name="profile-card">
      <div v-if="visible" class="profile-overlay" @click.self="handleClose">
        <div class="profile-card" @click.stop>
          <!-- Close button -->
          <button class="profile-close" @click="handleClose" aria-label="关闭">&times;</button>

          <!-- Loading state -->
          <div v-if="loading" class="profile-loading">
            <span class="loading-spinner"></span>
            <span>加载中...</span>
          </div>

          <!-- Error state -->
          <div v-else-if="error" class="profile-error">
            <p>{{ error }}</p>
            <button class="btn-outline btn-sm" @click="fetchData">重试</button>
          </div>

          <!-- Content -->
          <template v-else-if="userInfo">
            <div class="profile-header">
              <div class="avatar-wrapper">
                <UserAvatar
                  :avatarUrl="userInfo.avatar_url"
                  :nickname="userInfo.nickname"
                  :size="64"
                />
                <span
                  v-if="isOnline"
                  class="online-badge"
                  title="在线"
                ></span>
              </div>
              <h3 class="profile-nickname">{{ userInfo.nickname }}</h3>
              <p v-if="userInfo.bio" class="profile-bio">{{ userInfo.bio }}</p>
              <button class="btn-view-page" @click="goToUserPage">查看主页</button>
            </div>

            <div class="profile-actions">
              <!-- Status: self -->
              <div v-if="friendStatus === 'self'" class="status-text">
                这是你自己
              </div>

              <!-- Status: none — send friend request -->
              <template v-else-if="friendStatus === 'none'">
                <div v-if="!showRequestInput" class="action-row">
                  <button class="btn-primary btn-action" @click="showRequestInput = true">
                    添加好友
                  </button>
                </div>
                <div v-else class="request-input-wrapper">
                  <textarea
                    ref="requestInputRef"
                    v-model="requestMessage"
                    class="request-input"
                    placeholder="添加一句话介绍自己（可选）"
                    rows="2"
                    maxlength="200"
                    @keydown.enter.ctrl="handleSendRequest"
                  ></textarea>
                  <div class="request-input-actions">
                    <button class="btn-outline btn-sm" @click="showRequestInput = false">取消</button>
                    <button
                      class="btn-primary btn-sm"
                      :disabled="sendingRequest"
                      @click="handleSendRequest"
                    >
                      {{ sendingRequest ? '发送中...' : '发送申请' }}
                    </button>
                  </div>
                </div>
              </template>

              <!-- Status: request_sent -->
              <div v-else-if="friendStatus === 'request_sent'" class="action-row">
                <button class="btn-disabled" disabled>已发送申请</button>
              </div>

              <!-- Status: request_received — accept / reject -->
              <div v-else-if="friendStatus === 'request_received'" class="action-row">
                <button
                  class="btn-accept"
                  :disabled="acceptingRequest"
                  @click="handleAccept"
                >
                  {{ acceptingRequest ? '处理中...' : '接受' }}
                </button>
                <button
                  class="btn-reject"
                  :disabled="rejectingRequest"
                  @click="handleReject"
                >
                  {{ rejectingRequest ? '处理中...' : '拒绝' }}
                </button>
              </div>

              <!-- Status: friend — chat / menu -->
              <div v-else-if="friendStatus === 'friend'" class="action-row">
                <button class="btn-primary btn-action" @click="handleOpenChat">
                  发消息
                </button>
                <div class="dropdown-wrapper">
                  <button class="btn-menu" @click="showMenu = !showMenu" aria-label="更多操作">
                    &#8942;
                  </button>
                  <Transition name="dropdown">
                    <div v-if="showMenu" class="dropdown-menu">
                      <button class="dropdown-item dropdown-item--danger" @click="handleDeleteFriend">
                        删除好友
                      </button>
                      <button class="dropdown-item dropdown-item--danger" @click="handleBlock">
                        拉黑
                      </button>
                    </div>
                  </Transition>
                </div>
              </div>

              <!-- Status: blocked — unblock -->
              <div v-else-if="friendStatus === 'blocked'" class="action-row">
                <button
                  class="btn-outline btn-action"
                  :disabled="unblocking"
                  @click="handleUnblock"
                >
                  {{ unblocking ? '处理中...' : '取消拉黑' }}
                </button>
              </div>

              <!-- Status: blocked_by -->
              <div v-else-if="friendStatus === 'blocked_by'" class="status-text status-text--muted">
                对方已屏蔽你
              </div>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { userAPI } from '@/api/user'
import { useFriendStore } from '@/stores/friend'
import { useMessageStore } from '@/stores/message'
import UserAvatar from '@/components/UserAvatar.vue'

const props = defineProps({
  userId: { type: Number, required: true },
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'open-chat'])

const router = useRouter()
const friendStore = useFriendStore()
const messageStore = useMessageStore()

// State
const loading = ref(false)
const error = ref('')
const userInfo = ref(null)
const friendStatus = ref('none')
const isOnline = ref(false)

// Friend request
const showRequestInput = ref(false)
const requestMessage = ref('')
const sendingRequest = ref(false)
const requestInputRef = ref(null)

// Accept / reject
const acceptingRequest = ref(false)
const rejectingRequest = ref(false)

// Friend actions
const showMenu = ref(false)
const unblocking = ref(false)

// Watch visibility to fetch data
watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      showMenu.value = false
      showRequestInput.value = false
      requestMessage.value = ''
      error.value = ''
      await fetchData()
    }
  },
  { immediate: true }
)

// Watch showRequestInput to auto-focus
watch(showRequestInput, async (val) => {
  if (val) {
    await nextTick()
    requestInputRef.value?.focus()
  }
})

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const userRes = await userAPI.getUserById(props.userId)
    userInfo.value = userRes.data

    // Fetch friend status separately so user info still shows if this fails
    try {
      friendStatus.value = await friendStore.getFriendStatus(props.userId)
    } catch {
      friendStatus.value = 'none'
    }

    const onlineList = messageStore.onlineUsers || []
    isOnline.value = onlineList.some(u => u.userId === props.userId)
  } catch (e) {
    error.value = e.response?.data?.message || e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function handleClose() {
  showMenu.value = false
  emit('close')
}

function goToUserPage() {
  emit('close')
  router.push('/user/' + props.userId)
}

// ── Friend Request ────────────────────────────────────
async function handleSendRequest() {
  if (sendingRequest.value) return
  sendingRequest.value = true
  try {
    await friendStore.sendRequest(props.userId, requestMessage.value.trim())
    friendStatus.value = 'request_sent'
    showRequestInput.value = false
    requestMessage.value = ''
  } catch (e) {
    error.value = e.response?.data?.message || e.message || '发送申请失败'
  } finally {
    sendingRequest.value = false
  }
}

// ── Accept / Reject ───────────────────────────────────
function findIncomingRequestId() {
  const req = friendStore.incomingRequests.find(
    r => r.senderId === props.userId || r.sender_id === props.userId
  )
  return req?.id || req?.requestId || null
}

async function handleAccept() {
  if (acceptingRequest.value) return
  const requestId = findIncomingRequestId()
  if (!requestId) {
    error.value = '未找到好友请求'
    return
  }
  acceptingRequest.value = true
  try {
    const result = await friendStore.acceptRequest(requestId)
    friendStatus.value = 'friend'
    // Navigate to chat if conversationId is available
    if (result?.conversationId) {
      emit('open-chat', { userId: props.userId, conversationId: result.conversationId })
    }
  } catch (e) {
    error.value = e.response?.data?.message || e.message || '操作失败'
  } finally {
    acceptingRequest.value = false
  }
}

async function handleReject() {
  if (rejectingRequest.value) return
  const requestId = findIncomingRequestId()
  if (!requestId) {
    error.value = '未找到好友请求'
    return
  }
  rejectingRequest.value = true
  try {
    await friendStore.rejectRequest(requestId)
    friendStatus.value = 'none'
  } catch (e) {
    error.value = e.response?.data?.message || e.message || '操作失败'
  } finally {
    rejectingRequest.value = false
  }
}

// ── Chat ──────────────────────────────────────────────
async function handleOpenChat() {
  try {
    const conv = await messageStore.openConversation(props.userId)
    if (conv) {
      emit('close')
      router.push('/messages/' + conv.id)
    }
  } catch (e) {
    error.value = e.response?.data?.message || e.message || '打开对话失败'
  }
}

// ── Friend management ─────────────────────────────────
async function handleDeleteFriend() {
  showMenu.value = false
  try {
    await friendStore.deleteFriend(props.userId)
    friendStatus.value = 'none'
  } catch (e) {
    error.value = e.response?.data?.message || e.message || '删除好友失败'
  }
}

async function handleBlock() {
  showMenu.value = false
  try {
    await friendStore.blockUser(props.userId)
    friendStatus.value = 'blocked'
  } catch (e) {
    error.value = e.response?.data?.message || e.message || '拉黑失败'
  }
}

async function handleUnblock() {
  if (unblocking.value) return
  unblocking.value = true
  try {
    await friendStore.unblockUser(props.userId)
    friendStatus.value = 'none'
  } catch (e) {
    error.value = e.response?.data?.message || e.message || '取消拉黑失败'
  } finally {
    unblocking.value = false
  }
}
</script>

<style scoped>
/* ── Overlay ────────────────────────────────────────── */
.profile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Card ───────────────────────────────────────────── */
.profile-card {
  position: relative;
  background: var(--color-bg-primary);
  border: var(--glass-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(44, 44, 44, 0.12);
  max-width: 320px;
  width: 90vw;
  padding: 24px;
  font-family: var(--font-body);
  color: var(--color-text-primary);
}

.profile-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
  line-height: 1;
}

.profile-close:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

/* ── Header ─────────────────────────────────────────── */
.profile-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 20px;
}

.avatar-wrapper {
  position: relative;
  margin-bottom: 12px;
}

.online-badge {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #4CAF50;
  border: 2.5px solid var(--color-bg-primary);
}

.profile-nickname {
  font-family: var(--font-title);
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 6px;
}

.profile-bio {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0 0 8px;
  line-height: 1.5;
  word-break: break-word;
}

.btn-view-page {
  display: inline-block;
  padding: 4px 14px;
  border: 1px solid var(--color-border-light);
  border-radius: 14px;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 4px;
}
.btn-view-page:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border-color: var(--color-accent);
}

/* ── Loading / Error ────────────────────────────────── */
.profile-loading,
.profile-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px 0;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.loading-spinner {
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 3px solid var(--color-border-light);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.profile-error p {
  margin: 0;
  color: var(--color-accent);
}

/* ── Actions ────────────────────────────────────────── */
.profile-actions {
  border-top: 1px solid var(--color-border-light);
  padding-top: 16px;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.status-text {
  text-align: center;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  padding: 8px 0;
}

.status-text--muted {
  color: var(--ink-light);
  font-style: italic;
}

/* ── Buttons ────────────────────────────────────────── */
.btn-action {
  flex: 1;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 18px;
  background-color: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 20px;
  font-family: var(--font-body);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--color-accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(139, 37, 0, 0.3);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 18px;
  background: transparent;
  color: var(--color-accent);
  border: 1px solid var(--color-accent);
  border-radius: 20px;
  font-family: var(--font-body);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-outline:hover:not(:disabled) {
  background-color: var(--color-accent-light);
}

.btn-outline:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-sm {
  padding: 5px 14px;
  font-size: 0.8rem;
}

.btn-disabled {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 18px;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: 20px;
  font-family: var(--font-body);
  font-size: 0.9rem;
  cursor: not-allowed;
  width: 100%;
}

.btn-accept {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 18px;
  background: var(--color-green, #2E5C4C);
  color: #fff;
  border: none;
  border-radius: 20px;
  font-family: var(--font-body);
  font-size: 0.9rem;
  cursor: pointer;
  flex: 1;
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
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: 20px;
  font-family: var(--font-body);
  font-size: 0.9rem;
  cursor: pointer;
  flex: 1;
  transition: all 0.2s;
}

.btn-reject:hover:not(:disabled) {
  background: var(--color-border-light);
}

.btn-reject:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-menu {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: 1px solid var(--color-border-light);
  border-radius: 50%;
  font-size: 1.1rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-menu:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

/* ── Request Input ──────────────────────────────────── */
.request-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.request-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm, 8px);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: 0.85rem;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.request-input:focus {
  border-color: var(--color-accent);
}

.request-input::placeholder {
  color: var(--ink-light, #8B8B8B);
}

.request-input-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* ── Dropdown Menu ──────────────────────────────────── */
.dropdown-wrapper {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: var(--color-bg-primary);
  border: var(--glass-border);
  border-radius: var(--border-radius-sm, 8px);
  box-shadow: 0 4px 16px rgba(44, 44, 44, 0.12);
  min-width: 120px;
  overflow: hidden;
  z-index: 10;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 10px 14px;
  background: none;
  border: none;
  font-family: var(--font-body);
  font-size: 0.85rem;
  color: var(--color-text-primary);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: var(--color-bg-secondary);
}

.dropdown-item--danger {
  color: var(--color-accent);
}

/* ── Transitions ────────────────────────────────────── */
.profile-card-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.profile-card-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.profile-card-enter-from {
  opacity: 0;
  transform: scale(0.92);
}

.profile-card-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

.dropdown-enter-active {
  transition: all 0.15s ease;
}

.dropdown-leave-active {
  transition: all 0.1s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
