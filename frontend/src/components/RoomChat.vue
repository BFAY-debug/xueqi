<template>
  <div class="chat-panel chat-dark" :class="{ compact }">
    <div class="chat-header">
      <span class="chat-title">学堂论谈</span>
      <span v-if="typingName" class="typing-indicator">{{ typingName }} 正在输入...</span>
    </div>
    <div class="chat-messages" ref="messagesContainer">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="msg-wrapper"
        :class="{
          'msg-self': msg.type === 'user' && msg.userId === currentUserId,
          'msg-anonymous': msg.type === 'anonymous',
          'msg-system': msg.type === 'system'
        }"
      >
        <!-- System message -->
        <div v-if="msg.type === 'system'" class="msg-system-text">
          ── {{ msg.content }} ──
        </div>
        <!-- Anonymous message -->
        <template v-else-if="msg.type === 'anonymous'">
          <div class="msg-bubble msg-anon-bubble">
            <div class="msg-avatar avatar-anon">🎭</div>
            <div class="msg-body">
              <span class="msg-name name-anon">匿名学子</span>
              <div class="msg-text msg-text-anon">{{ msg.content }}</div>
              <img v-if="msg.imageUrl" :src="msg.imageUrl" class="msg-image" @click="previewImage(msg.imageUrl)" />
            </div>
          </div>
          <div class="msg-time">{{ formatTime(msg.createdAt) }}</div>
        </template>
        <!-- Other user message -->
        <template v-else-if="msg.userId !== currentUserId">
          <div class="msg-bubble msg-other">
            <UserAvatar :avatar-url="msg.avatarUrl" :nickname="msg.nickname" :size="28" />
            <div class="msg-body">
              <span class="msg-name">{{ msg.nickname }}</span>
              <div class="msg-text">{{ msg.content }}</div>
              <img v-if="msg.imageUrl" :src="msg.imageUrl" class="msg-image" @click="previewImage(msg.imageUrl)" />
            </div>
          </div>
          <div class="msg-time">{{ formatTime(msg.createdAt) }}</div>
        </template>
        <!-- Self message -->
        <template v-else>
          <div class="msg-bubble msg-self-bubble">
            <div class="msg-body">
              <div class="msg-text">{{ msg.content }}</div>
              <img v-if="msg.imageUrl" :src="msg.imageUrl" class="msg-image" @click="previewImage(msg.imageUrl)" />
              <span v-if="msg.readCount !== undefined" class="msg-read-count">{{ msg.readCount > 0 ? `已读 ${msg.readCount}` : '未读' }}</span>
            </div>
            <UserAvatar :avatar-url="msg.avatarUrl" :nickname="msg.nickname" :size="28" />
          </div>
          <div class="msg-time msg-time-self">{{ formatTime(msg.createdAt) }}</div>
        </template>
      </div>
      <div v-if="!messages.length" class="chat-empty">暂无消息，打个招呼吧</div>
    </div>
    <div class="chat-input-row">
      <button
        class="anon-toggle"
        :class="{ active: isAnonymous }"
        @click="isAnonymous = !isAnonymous"
        :title="isAnonymous ? '匿名模式已开启' : '点击开启匿名模式'"
      >🎭</button>
      <button class="img-upload-btn" @click="triggerImageUpload" title="发送图片">📷</button>
      <input ref="imageInput" type="file" accept="image/*" style="display:none" @change="handleImageSelect" />
      <div v-if="pendingImage" class="pending-image">
        <img :src="pendingImage.thumb" />
        <button class="pending-remove" @click="clearPendingImage">✕</button>
      </div>
      <input
        v-model="inputText"
        class="chat-input"
        :placeholder="isAnonymous ? '匿名发言中...' : '说说你在修习什么...'"
        @keydown.enter="sendMessage"
        @compositionstart="isComposing = true"
        @compositionend="isComposing = false"
        @input="onInput"
        maxlength="500"
      />
      <button class="chat-send" @click="sendMessage" :disabled="!inputText.trim() && !pendingImage">发送</button>
    </div>

    <!-- Image preview overlay -->
    <Transition name="fade">
      <div v-if="previewUrl" class="image-preview-overlay" @click="previewUrl = null">
        <img :src="previewUrl" class="image-preview-full" />
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { getSocket } from '@/composables/useSocket'
import { chatAPI } from '@/api/study'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import UserAvatar from './UserAvatar.vue'

const props = defineProps({
  roomId: { type: Number, required: true },
  compact: { type: Boolean, default: false }
})

const userStore = useUserStore()
const chatStore = useChatStore()
const currentUserId = computed(() => userStore.user?.userId)

const messages = ref([])
const inputText = ref('')
const typingName = ref('')
const isAnonymous = ref(false)
const messagesContainer = ref(null)
const isComposing = ref(false)
const pendingImage = ref(null)
const imageInput = ref(null)
const previewUrl = ref(null)
let typingTimer = null

function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.2)
  } catch { /* ignore */ }
}

async function loadMessages() {
  if (!props.roomId) return
  try {
    const res = await chatAPI.getMessages(props.roomId, 50)
    messages.value = res.data || []
    await nextTick()
    scrollToBottom()
    markRoomRead()
  } catch { /* ignore */ }
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function previewImage(url) { previewUrl.value = url }

function triggerImageUpload() { imageInput.value?.click() }

function handleImageSelect(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) { alert('图片大小不能超过 2MB'); return }
  const reader = new FileReader()
  reader.onload = (ev) => { pendingImage.value = { file, thumb: ev.target.result } }
  reader.readAsDataURL(file)
}

function clearPendingImage() {
  pendingImage.value = null
  if (imageInput.value) imageInput.value.value = ''
}

async function sendMessage() {
  if (isComposing.value) return
  const content = inputText.value.trim()
  if (!content && !pendingImage.value) return

  const msgType = isAnonymous.value ? 'anonymous' : 'user'
  let imageUrl = null

  if (pendingImage.value) {
    try {
      const res = await chatAPI.uploadImage(pendingImage.value.file)
      imageUrl = res.data?.imageUrl || null
    } catch { /* fallback */ }
    clearPendingImage()
  }

  const optimisticMsg = {
    id: `local-${Date.now()}`,
    roomId: props.roomId,
    userId: msgType === 'anonymous' ? null : currentUserId.value,
    nickname: msgType === 'anonymous' ? '匿名学子' : (userStore.user?.nickname || userStore.user?.username || '我'),
    content, imageUrl, type: msgType,
    createdAt: new Date().toISOString(),
    readCount: 0
  }
  messages.value.push(optimisticMsg)
  nextTick(scrollToBottom)

  const sock = getSocket()
  sock.emit('chat:message', { roomId: props.roomId, content, imageUrl, anonymous: isAnonymous.value })
  inputText.value = ''
  stopTyping()
}

function onInput() {
  if (isComposing.value) return
  const sock = getSocket()
  if (inputText.value.trim()) {
    sock.emit('chat:typing', props.roomId)
    clearTimeout(typingTimer)
    typingTimer = setTimeout(stopTyping, 3000)
  } else {
    stopTyping()
  }
}

function stopTyping() {
  clearTimeout(typingTimer)
  const sock = getSocket()
  sock.emit('chat:stopTyping', props.roomId)
}

function markRoomRead() {
  if (!props.roomId || !currentUserId.value) return
  const sock = getSocket()
  sock.emit('chat:markRead', { roomId: props.roomId })
}

function onChatMessage(msg) {
  if (msg.roomId !== props.roomId) return
  if (msg.type !== 'system' && msg.userId === currentUserId.value) {
    const localIdx = messages.value.findIndex(
      m => String(m.id).startsWith('local-') && m.content === msg.content && m.type === msg.type
    )
    if (localIdx !== -1) {
      messages.value[localIdx] = { ...msg, readCount: 0 }
      nextTick(scrollToBottom)
      return
    }
  }
  messages.value.push({ ...msg, readCount: 0 })
  nextTick(scrollToBottom)
  if (msg.type === 'user' && msg.userId !== currentUserId.value) {
    chatStore.incrementUnread()
    playNotifSound()
    markRoomRead()
  }
}

function onChatTyping(data) {
  if (data.userId === currentUserId.value) return
  typingName.value = data.nickname || '某人'
}

function onChatStopTyping() { typingName.value = '' }

function onOnlineUsers(data) {
  if (data.roomId === props.roomId) {
    chatStore.setOnlineUsers(data.users || [])
  }
}

function onReadUpdate(data) {
  if (data.roomId !== props.roomId) return
  messages.value.forEach(m => {
    if (m.type === 'user' && m.userId === currentUserId.value) {
      m.readCount = (m.readCount || 0) + 1
    }
  })
}

let prevRoomId = null

watch(() => props.roomId, (newId) => {
  if (newId && newId !== prevRoomId) {
    messages.value = []
    typingName.value = ''
    loadMessages()
    prevRoomId = newId
  }
})

onMounted(() => {
  loadMessages()
  const sock = getSocket()
  sock.on('chat:message', onChatMessage)
  sock.on('chat:typing', onChatTyping)
  sock.on('chat:stopTyping', onChatStopTyping)
  sock.on('room:onlineUsers', onOnlineUsers)
  sock.on('chat:readUpdate', onReadUpdate)
})

onUnmounted(() => {
  const sock = getSocket()
  sock.off('chat:message', onChatMessage)
  sock.off('chat:typing', onChatTyping)
  sock.off('chat:stopTyping', onChatStopTyping)
  sock.off('room:onlineUsers', onOnlineUsers)
  sock.off('chat:readUpdate', onReadUpdate)
  clearTimeout(typingTimer)
})
</script>

<style scoped>
/* ── Dark theme variables ── */
.chat-dark {
  --chat-bg: #1e1e2e;
  --chat-header-bg: #2a2a3e;
  --chat-text: #e0e0e0;
  --chat-text-muted: #888;
  --chat-bubble-self: #3a3a5c;
  --chat-bubble-other: #2a2a3e;
  --chat-bubble-anon: #3a3a3e;
  --chat-input-bg: #2a2a3e;
  --chat-accent: #5b5b9c;
  --chat-border: rgba(255,255,255,0.08);
}

.chat-panel {
  background: var(--chat-bg);
  padding: 0;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.chat-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; flex-shrink: 0;
  border-left: 3px solid var(--chat-accent);
}
.chat-title { font-size: 1rem; color: var(--chat-text); font-weight: 600; }

/* Messages — flex: 1 for auto sizing */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 4px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 100px;
}
.chat-messages::-webkit-scrollbar { width: 4px; }
.chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

.chat-empty { text-align: center; color: var(--chat-text-muted); font-size: 0.85rem; padding: 30px 0; }

.msg-wrapper { animation: msg-slide-in 0.25s ease; }
@keyframes msg-slide-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

.msg-system-text { text-align: center; font-size: 0.75rem; color: var(--chat-text-muted); padding: 4px 0; }

.msg-bubble { display: flex; align-items: flex-start; gap: 8px; max-width: 75%; }
.msg-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--chat-accent); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; flex-shrink: 0;
}
.self-avatar { background: #4a9a6a; }
.avatar-anon { background: #6a6a7a; font-size: 0.85rem; }
.msg-other { align-self: flex-start; }
.msg-body { display: flex; flex-direction: column; gap: 2px; }
.msg-name { font-size: 0.75rem; color: var(--chat-text-muted); }
.name-anon { font-style: italic; }

.msg-other .msg-text {
  background: var(--chat-bubble-other);
  border: 1px solid var(--chat-border);
  border-radius: 4px 12px 12px 12px;
  padding: 8px 12px; font-size: 0.85rem; color: var(--chat-text);
  word-break: break-word;
}

.msg-anon-bubble { align-self: flex-start; }
.msg-text-anon {
  background: var(--chat-bubble-anon);
  border: 1px dashed rgba(255,255,255,0.15);
  border-radius: 4px 12px 12px 12px;
  padding: 8px 12px; font-size: 0.85rem; color: var(--chat-text);
  word-break: break-word; font-style: italic;
}

.msg-self { display: flex; flex-direction: column; align-items: flex-end; }
.msg-self-bubble { flex-direction: row-reverse; align-self: flex-end; }
.msg-self-bubble .msg-text {
  background: var(--chat-bubble-self);
  border-radius: 12px 4px 12px 12px;
  padding: 8px 12px; font-size: 0.85rem; color: var(--chat-text);
  word-break: break-word;
}

.msg-image { max-width: 200px; max-height: 150px; border-radius: 6px; cursor: pointer; margin-top: 4px; object-fit: cover; }
.msg-image:hover { opacity: 0.9; }
.msg-read-count { font-size: 0.65rem; color: var(--chat-text-muted); align-self: flex-end; }

.image-preview-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center;
  z-index: 10000; cursor: pointer;
}
.image-preview-full { max-width: 90vw; max-height: 90vh; border-radius: 8px; object-fit: contain; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.msg-time { font-size: 0.65rem; color: var(--chat-text-muted); margin-left: 36px; margin-top: 2px; }
.msg-time-self { margin-left: 0; margin-right: 36px; text-align: right; }

.typing-indicator {
  font-size: 0.8rem; font-style: italic; color: var(--chat-text-muted);
  animation: typing-pulse 1.5s ease-in-out infinite;
}
@keyframes typing-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

/* Input row */
.chat-input-row {
  display: flex; gap: 8px; padding: 10px 14px; align-items: center;
  border-top: 1px solid var(--chat-border); flex-shrink: 0;
}
.anon-toggle, .img-upload-btn {
  width: 32px; height: 32px; border-radius: 50%;
  border: 1px solid var(--chat-border); background: transparent;
  cursor: pointer; font-size: 0.9rem;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; flex-shrink: 0; color: var(--chat-text);
}
.anon-toggle:hover, .img-upload-btn:hover { background: rgba(255,255,255,0.06); }
.anon-toggle.active { background: rgba(106, 106, 122, 0.3); border-color: rgba(255,255,255,0.2); }

.pending-image { position: relative; width: 36px; height: 36px; flex-shrink: 0; }
.pending-image img { width: 36px; height: 36px; object-fit: cover; border-radius: 4px; border: 1px solid var(--chat-border); }
.pending-remove {
  position: absolute; top: -4px; right: -4px; width: 16px; height: 16px;
  border-radius: 50%; background: #e74c3c; color: #fff; border: none;
  cursor: pointer; font-size: 0.6rem;
  display: flex; align-items: center; justify-content: center;
}

.chat-input {
  flex: 1; padding: 8px 12px;
  border: 1px solid var(--chat-border); border-radius: 6px;
  background: var(--chat-input-bg); color: var(--chat-text);
  font-size: 0.85rem; outline: none; transition: border-color 0.2s;
}
.chat-input:focus { border-color: var(--chat-accent); }
.chat-input::placeholder { color: var(--chat-text-muted); }

.chat-send {
  padding: 8px 16px; font-size: 0.85rem; white-space: nowrap;
  background: var(--chat-accent); color: #fff; border: none;
  border-radius: 6px; cursor: pointer; transition: opacity 0.2s;
}
.chat-send:hover { opacity: 0.85; }
.chat-send:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
