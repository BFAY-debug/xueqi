<template>
  <div class="chat-panel" :class="{ compact }">
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
          'msg-self': msg.userId === currentUserId && msg.type === 'user',
          'msg-system': msg.type === 'system'
        }"
      >
        <!-- System message -->
        <div v-if="msg.type === 'system'" class="msg-system-text">
          ── {{ msg.content }} ──
        </div>
        <!-- Other user message -->
        <template v-else-if="msg.userId !== currentUserId">
          <div class="msg-bubble msg-other">
            <div class="msg-avatar">{{ (msg.nickname || '?')[0] }}</div>
            <div class="msg-body">
              <span class="msg-name">{{ msg.nickname }}</span>
              <div class="msg-text">{{ msg.content }}</div>
            </div>
          </div>
          <div class="msg-time">{{ formatTime(msg.createdAt) }}</div>
        </template>
        <!-- Self message -->
        <template v-else>
          <div class="msg-bubble msg-self-bubble">
            <div class="msg-body">
              <div class="msg-text">{{ msg.content }}</div>
            </div>
            <div class="msg-avatar self-avatar">{{ (msg.nickname || '?')[0] }}</div>
          </div>
          <div class="msg-time msg-time-self">{{ formatTime(msg.createdAt) }}</div>
        </template>
      </div>
      <div v-if="!messages.length" class="chat-empty">暂无消息，打个招呼吧</div>
    </div>
    <div class="chat-input-row">
      <input
        v-model="inputText"
        class="chat-input"
        :placeholder="compact ? '说些什么...' : '说说你在修习什么...'"
        @keydown.enter="sendMessage"
        @compositionstart="isComposing = true"
        @compositionend="isComposing = false"
        @input="onInput"
        maxlength="500"
      />
      <button class="chat-send btn-primary" @click="sendMessage" :disabled="!inputText.trim()">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { getSocket } from '@/composables/useSocket'
import { chatAPI } from '@/api/study'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  roomId: { type: Number, required: true },
  compact: { type: Boolean, default: false }
})
const emit = defineEmits(['unread'])

const userStore = useUserStore()
const currentUserId = computed(() => userStore.user?.userId)

const messages = ref([])
const inputText = ref('')
const typingName = ref('')
const messagesContainer = ref(null)
const isComposing = ref(false)
let typingTimer = null

// Load chat history
async function loadMessages() {
  if (!props.roomId) return
  try {
    const res = await chatAPI.getMessages(props.roomId, 50)
    messages.value = res.data || []
    await nextTick()
    scrollToBottom()
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

function sendMessage() {
  if (isComposing.value) return
  const content = inputText.value.trim()
  if (!content) return

  const sock = getSocket()
  sock.emit('chat:message', { roomId: props.roomId, content })
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

// Socket event handlers
function onChatMessage(msg) {
  if (msg.roomId !== props.roomId) return
  messages.value.push(msg)
  nextTick(scrollToBottom)
  // Emit unread if message is from others
  if (msg.type === 'user' && msg.userId !== currentUserId.value) {
    emit('unread')
  }
}

function onChatTyping(data) {
  if (data.userId === currentUserId.value) return
  typingName.value = data.nickname || '某人'
}

function onChatStopTyping(data) {
  typingName.value = ''
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
})

onUnmounted(() => {
  const sock = getSocket()
  sock.off('chat:message', onChatMessage)
  sock.off('chat:typing', onChatTyping)
  sock.off('chat:stopTyping', onChatStopTyping)
  clearTimeout(typingTimer)
})
</script>

<style scoped>
.chat-panel {
  background: var(--glass-bg-card);
  border: var(--glass-border);
  border-radius: var(--border-radius);
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.chat-title {
  font-family: var(--font-title);
  font-size: 1.1rem;
  color: var(--color-text-primary);
}

/* Messages area */
.chat-messages {
  height: 250px;
  overflow-y: auto;
  padding: 4px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.chat-messages::-webkit-scrollbar { width: 4px; }
.chat-messages::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

.chat-empty {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  padding: 30px 0;
}

/* Message wrapper */
.msg-wrapper {
  animation: msg-slide-in 0.25s ease;
}
@keyframes msg-slide-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* System message */
.msg-system-text {
  text-align: center;
  font-size: 0.75rem;
  color: var(--ink-light);
  padding: 4px 0;
}

/* Message bubbles */
.msg-bubble {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  max-width: 75%;
}

.msg-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-green);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-family: var(--font-title);
  flex-shrink: 0;
}
.self-avatar {
  background: var(--color-accent);
}

.msg-other {
  align-self: flex-start;
}
.msg-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.msg-name {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-family: var(--font-title);
}
.msg-other .msg-text {
  background: var(--glass-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: 4px 12px 12px 12px;
  padding: 8px 12px;
  font-size: 0.85rem;
  color: var(--color-text-primary);
  word-break: break-word;
}

.msg-self {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.msg-self-bubble {
  flex-direction: row-reverse;
  align-self: flex-end;
}
.msg-self-bubble .msg-text {
  background: rgba(46, 92, 76, 0.12);
  border-radius: 12px 4px 12px 12px;
  padding: 8px 12px;
  font-size: 0.85rem;
  color: var(--color-text-primary);
  word-break: break-word;
}

.msg-time {
  font-size: 0.65rem;
  color: var(--ink-faint);
  font-family: var(--font-mono);
  margin-left: 36px;
  margin-top: 2px;
}
.msg-time-self {
  margin-left: 0;
  margin-right: 36px;
  text-align: right;
}

/* Typing indicator */
.typing-indicator {
  font-size: 0.8rem;
  font-style: italic;
  color: var(--color-text-secondary);
  animation: typing-pulse 1.5s ease-in-out infinite;
}
@keyframes typing-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* Input row */
.chat-input-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.chat-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  background: rgba(245, 240, 232, 0.6);
  color: var(--color-text-primary);
  font-size: 0.85rem;
  font-family: var(--font-body);
  outline: none;
  transition: border-color 0.2s;
}
.chat-input:focus {
  border-color: var(--color-accent);
}
.chat-input::placeholder {
  color: var(--ink-light);
}
.chat-send {
  padding: 8px 16px;
  font-size: 0.85rem;
  white-space: nowrap;
}
.chat-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Compact mode (immersive) */
.compact .chat-messages {
  height: 200px;
}
.compact .chat-input {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(245, 240, 232, 0.2);
  color: rgba(245, 240, 232, 0.9);
}
.compact .chat-input::placeholder {
  color: rgba(245, 240, 232, 0.4);
}
.compact .chat-title {
  color: rgba(245, 240, 232, 0.8);
}
.compact .msg-other .msg-text {
  background: rgba(245, 240, 232, 0.08);
  border-color: rgba(245, 240, 232, 0.1);
  color: rgba(245, 240, 232, 0.9);
}
.compact .msg-self-bubble .msg-text {
  background: rgba(46, 92, 76, 0.3);
  color: rgba(245, 240, 232, 0.9);
}
.compact .msg-name {
  color: rgba(245, 240, 232, 0.5);
}
.compact .msg-time {
  color: rgba(245, 240, 232, 0.3);
}
.compact .typing-indicator {
  color: rgba(245, 240, 232, 0.5);
}
.compact .chat-empty {
  color: rgba(245, 240, 232, 0.4);
}

/* Mobile */
@media (max-width: 768px) {
  .chat-messages { height: 200px; }
  .msg-bubble { max-width: 85%; }
  .compact .chat-messages { height: 160px; }
}
</style>
