<template>
  <div class="page">
    <AppNavbar />
    <div class="chat-page container">
      <div class="chat-header card">
        <BackButton />
        <UserAvatar v-if="peerInfo" :avatar-url="peerInfo.avatarUrl" :nickname="peerInfo.nickname" :size="36" :clickable="true" :user-id="peerInfo.userId" @user-click="openProfileCard" />
        <div class="chat-peer-info" v-if="peerInfo">
          <span class="chat-peer-name">{{ peerInfo.nickname }}</span>
          <span class="chat-peer-status" :class="{ online: isPeerOnline }">{{ isPeerOnline ? '在线' : '离线' }}</span>
        </div>
        <div class="chat-more-wrap" v-if="peerInfo && peerInfo.userId !== currentUserId">
          <button class="chat-more-btn" @click="showMore = !showMore">⋮</button>
          <Transition name="dropdown">
            <div v-if="showMore" class="chat-more-dropdown">
              <button @click="openProfile">查看资料</button>
              <button @click="handleDeleteFriend" class="danger">删除好友</button>
              <button @click="handleBlockUser" class="danger">拉黑</button>
            </div>
          </Transition>
        </div>
      </div>

      <div class="chat-messages card" ref="messagesEl">
        <div v-for="msg in messageStore.currentMessages" :key="msg.id" class="pm-row" :class="{ 'pm-self': msg.senderId === currentUserId }">
          <template v-if="msg.senderId !== currentUserId">
            <UserAvatar :avatar-url="msg.senderAvatar" :nickname="msg.senderName" :size="32" :clickable="true" :user-id="msg.senderId" @user-click="openProfileCard" />
            <div class="pm-bubble pm-other-bubble" :class="{ 'pm-image-only': isImageOnly(msg) }">
              <div v-if="!isImageOnly(msg)" class="pm-text">{{ msg.content }}</div>
              <img v-if="msg.imageUrl" :src="msg.imageUrl" class="pm-image" @click="previewImage(msg.imageUrl)" />
            </div>
          </template>
          <template v-else>
            <div class="pm-bubble pm-self-bubble" :class="{ 'pm-image-only': isImageOnly(msg) }">
              <div v-if="!isImageOnly(msg)" class="pm-text">{{ msg.content }}</div>
              <img v-if="msg.imageUrl" :src="msg.imageUrl" class="pm-image" @click="previewImage(msg.imageUrl)" />
            </div>
            <UserAvatar :avatar-url="msg.senderAvatar" :nickname="msg.senderName" :size="32" :clickable="true" :user-id="msg.senderId" @user-click="openProfileCard" />
          </template>
        </div>
        <div v-if="!messageStore.currentMessages.length" class="chat-empty">暂无消息，打个招呼吧</div>
      </div>

      <div class="chat-input card">
        <div class="input-actions">
          <button class="pm-action-btn" @click="showEmoji = !showEmoji" title="表情">😊</button>
          <input type="file" ref="imageInput" accept="image/*" @change="handleImageSelect" hidden />
          <button class="pm-action-btn" @click="$refs.imageInput.click()" :disabled="sendingImage" title="发送图片">🖼</button>
        </div>
        <div class="emoji-panel" v-if="showEmoji" @click.stop>
          <span v-for="e in emojis" :key="e" class="emoji-item" @click="insertEmoji(e)">{{ e }}</span>
        </div>
        <input
          v-model="inputText"
          class="pm-input"
          placeholder="输入消息..."
          @keydown.enter="sendMessage"
          @compositionstart="isComposing = true"
          @compositionend="isComposing = false"
          maxlength="500"
        />
        <button class="pm-send-btn" @click="sendMessage" :disabled="!inputText.trim()">发送</button>
      </div>
    </div>
    <UserProfileCard
      v-if="profileUserId"
      :user-id="profileUserId"
      :visible="!!profileUserId"
      @close="profileUserId = null"
    />
    <Teleport to="body">
      <div v-if="previewUrl" class="image-preview-overlay" @click="previewUrl = null">
        <div class="image-preview-content" @click.stop>
          <img :src="previewUrl" class="image-preview-img" />
          <div class="image-preview-actions">
            <a :href="previewUrl" download class="image-preview-download">下载图片</a>
            <button class="image-preview-close" @click="previewUrl = null">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useMessageStore } from '@/stores/message'
import { useFriendStore } from '@/stores/friend'
import { getSocket } from '@/composables/useSocket'
import { ElMessage } from 'element-plus'
import AppNavbar from '@/components/AppNavbar.vue'
import BackButton from '@/components/BackButton.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import UserProfileCard from '@/components/UserProfileCard.vue'
import { chatAPI } from '@/api/study'

const route = useRoute()
const userStore = useUserStore()
const messageStore = useMessageStore()
const friendStore = useFriendStore()
const currentUserId = computed(() => userStore.user?.userId)
const convId = computed(() => parseInt(route.params.id, 10))

const messagesEl = ref(null)
const inputText = ref('')
const isComposing = ref(false)
const peerInfo = ref(null)
const isPeerOnline = ref(false)
const showMore = ref(false)
const profileUserId = ref(null)
const imageInput = ref(null)
const sendingImage = ref(false)
const showEmoji = ref(false)
const previewUrl = ref(null)

const emojis = [
  '😊','😂','🤣','❤️','👍','🎉','😘','🤔','😎','😢',
  '😤','🔥','💪','👋','🙏','😍','🥰','🤗','😴','🤮',
  '💯','✨','🌟','⭐','🎵','📚','✏️','🎓','🏆','👏',
  '🤝','💬','📌','🔔','☕','🍕','🌈','🐱','🐶','🦊'
]

function findPeerInfo() {
  const conv = messageStore.conversations.find(c => c.id === convId.value)
  if (conv) {
    peerInfo.value = { nickname: conv.peerNickname, avatarUrl: conv.peerAvatar, userId: conv.peerId }
  }
}

async function loadMessages() {
  await messageStore.fetchMessages(convId.value)
  await messageStore.markAsRead(convId.value)
  await nextTick()
  scrollToBottom()
}

function scrollToBottom() {
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}

function sendMessage() {
  if (isComposing.value || !inputText.value.trim() || !peerInfo.value) return
  const socket = getSocket()
  socket.emit('pm:send', {
    toUserId: peerInfo.value.userId,
    content: inputText.value.trim()
  })
  inputText.value = ''
}

function handlePmMessage(msg) {
  if (msg.conversationId === convId.value) {
    messageStore.handleIncomingMessage(msg)
    nextTick(scrollToBottom)
  }
}

function handlePmError(data) {
  ElMessage.warning(data.message || '消息发送失败')
}

function openProfile() {
  profileUserId.value = peerInfo.value.userId
  showMore.value = false
}

function openProfileCard(userId) {
  profileUserId.value = userId
}

async function handleDeleteFriend() {
  if (!confirm('确定删除好友？聊天记录将保留。')) return
  await friendStore.deleteFriend(peerInfo.value.userId)
  showMore.value = false
}

async function handleBlockUser() {
  if (!confirm('确定拉黑该用户？')) return
  await friendStore.blockUser(peerInfo.value.userId)
  showMore.value = false
}

function onClickOutsideMore(e) {
  const wrap = document.querySelector('.chat-more-wrap')
  if (wrap && !wrap.contains(e.target)) {
    showMore.value = false
  }
  const emojiPanel = document.querySelector('.emoji-panel')
  if (emojiPanel && !emojiPanel.contains(e.target) && !e.target.classList.contains('pm-action-btn')) {
    showEmoji.value = false
  }
}

async function handleImageSelect(e) {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过10MB')
    return
  }
  sendingImage.value = true
  try {
    const res = await chatAPI.uploadImage(file)
    const socket = getSocket()
    socket.emit('pm:send', {
      toUserId: peerInfo.value.userId,
      content: '',
      imageUrl: res.data.imageUrl
    })
  } catch (err) {
    ElMessage.error('图片上传失败')
  } finally {
    sendingImage.value = false
    e.target.value = ''
  }
}

function insertEmoji(emoji) {
  inputText.value += emoji
  showEmoji.value = false
}

function isImageOnly(msg) {
  return msg.imageUrl && (!msg.content || msg.content === '[图片]')
}

function previewImage(url) {
  previewUrl.value = url
}

watch(() => messageStore.currentMessages.length, () => {
  nextTick(scrollToBottom)
})

onMounted(async () => {
  await messageStore.fetchConversations()
  findPeerInfo()
  messageStore.currentConversation = { id: convId.value }
  await loadMessages()
  const socket = getSocket()
  socket.on('pm:message', handlePmMessage)
  socket.on('pm:error', handlePmError)
  document.addEventListener('click', onClickOutsideMore)
})

onUnmounted(() => {
  messageStore.currentConversation = null
  const socket = getSocket()
  socket.off('pm:message', handlePmMessage)
  socket.off('pm:error', handlePmError)
  document.removeEventListener('click', onClickOutsideMore)
})
</script>

<style scoped>
.page { min-height: 100vh; background: var(--color-bg-primary); }
.chat-page {
  display: flex; flex-direction: column;
  padding: calc(var(--nav-height) + 16px) 0 16px;
  max-width: 640px; height: 100vh;
  box-sizing: border-box;
}
.chat-header {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px; margin-bottom: 8px;
  overflow: visible;
}
.chat-peer-info { display: flex; flex-direction: column; }
.chat-peer-name { font-weight: 600; font-size: 0.95rem; }
.chat-peer-status { font-size: 0.75rem; color: var(--color-text-secondary); }
.chat-peer-status.online { color: #4caf50; }

.chat-messages {
  flex: 1; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
}
.chat-messages::-webkit-scrollbar { width: 4px; }
.chat-messages::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

.pm-row { display: flex; align-items: flex-end; gap: 8px; }
.pm-row.pm-self { justify-content: flex-end; }
.pm-bubble {
  max-width: 70%; padding: 10px 14px;
  border-radius: 12px; word-break: break-word;
}
.pm-other-bubble {
  background: var(--color-bg-secondary);
  border-bottom-left-radius: 4px;
}
.pm-self-bubble {
  background: var(--color-accent); color: #fff;
  border-bottom-right-radius: 4px;
}
.pm-text { font-size: 0.9rem; line-height: 1.5; }
.pm-image { max-width: 200px; border-radius: 8px; cursor: pointer; display: block; }
.pm-image-only { background: transparent !important; padding: 4px !important; }
.pm-image-only .pm-image { max-width: 240px; border-radius: 12px; }
.chat-empty {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: var(--color-text-secondary); font-size: 0.9rem;
}

.chat-input {
  position: relative;
  display: flex; gap: 8px; padding: 10px 12px; margin-top: 8px; align-items: center;
  z-index: 20;
  overflow: visible !important;
}
.input-actions {
  display: flex; gap: 4px; flex-shrink: 0;
}
.pm-action-btn {
  width: 32px; height: 32px; border: none; background: none;
  font-size: 1.1rem; cursor: pointer; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s;
}
.pm-action-btn:hover { background: var(--color-bg-secondary); }
.pm-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.emoji-panel {
  position: absolute; bottom: 100%; left: 12px; right: 12px;
  background: var(--color-bg-primary); border: 1px solid var(--color-border);
  border-radius: 12px; padding: 10px; margin-bottom: 6px;
  display: flex; flex-wrap: wrap; gap: 4px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1); max-height: 180px; overflow-y: auto;
  z-index: 100;
}
.emoji-item {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem; cursor: pointer; border-radius: 6px; transition: background 0.1s;
}
.emoji-item:hover { background: var(--color-bg-secondary); }
.pm-input {
  flex: 1; padding: 8px 14px;
  border: 1px solid var(--color-border); border-radius: 20px;
  background: var(--color-bg-primary); font-size: 0.9rem;
  font-family: var(--font-body); outline: none;
}
.pm-input:focus { border-color: var(--color-accent); }
.pm-send-btn {
  padding: 8px 18px; border-radius: 20px;
  background: var(--color-accent); color: #fff;
  border: none; cursor: pointer; font-size: 0.85rem;
  font-family: var(--font-body); transition: opacity 0.15s;
}
.pm-send-btn:disabled { opacity: 0.5; cursor: default; }
.pm-send-btn:not(:disabled):hover { opacity: 0.9; }

@media (max-width: 640px) {
  .chat-page { padding: calc(var(--nav-height) + 8px) 0 8px; }
  .pm-bubble { max-width: 80%; }
}

.chat-more-wrap { position: relative; margin-left: auto; }
.chat-more-btn { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--color-text-secondary); padding: 4px 8px; }
.chat-more-btn:hover { color: var(--color-accent); }
.chat-more-dropdown {
  position: absolute; top: 100%; right: 0; background: var(--color-bg-primary);
  border: 1px solid var(--color-border); border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1); z-index: 100; overflow: hidden; min-width: 120px;
}
.chat-more-dropdown button {
  display: block; width: 100%; padding: 10px 16px; background: none; border: none;
  font-size: 0.85rem; cursor: pointer; text-align: left; color: var(--color-text-primary);
  font-family: var(--font-body);
}
.chat-more-dropdown button:hover { background: var(--color-bg-secondary); }
.chat-more-dropdown button.danger { color: #c0392b; }

/* Dropdown transition for more menu */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Image preview overlay */
.image-preview-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.85); display: flex;
  align-items: center; justify-content: center;
}
.image-preview-content {
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  max-width: 90vw; max-height: 90vh;
}
.image-preview-img {
  max-width: 90vw; max-height: 75vh; border-radius: 8px; object-fit: contain;
}
.image-preview-actions { display: flex; gap: 12px; }
.image-preview-download {
  padding: 8px 20px; border-radius: 20px; background: var(--color-accent);
  color: #fff; text-decoration: none; font-size: 0.85rem; transition: opacity 0.15s;
}
.image-preview-download:hover { opacity: 0.9; }
.image-preview-close {
  padding: 8px 20px; border-radius: 20px; background: rgba(255,255,255,0.15);
  color: #fff; border: none; cursor: pointer; font-size: 0.85rem;
  font-family: var(--font-body);
}
.image-preview-close:hover { background: rgba(255,255,255,0.25); }
</style>
