<template>
  <div class="page">
    <AppNavbar />
    <div class="chat-page container">
      <div class="chat-header card">
        <BackButton />
        <UserAvatar v-if="peerInfo" :avatar-url="peerInfo.avatarUrl" :nickname="peerInfo.nickname" :size="36" />
        <div class="chat-peer-info" v-if="peerInfo">
          <span class="chat-peer-name">{{ peerInfo.nickname }}</span>
          <span class="chat-peer-status" :class="{ online: isPeerOnline }">{{ isPeerOnline ? '在线' : '离线' }}</span>
        </div>
      </div>

      <div class="chat-messages card" ref="messagesEl">
        <div v-for="msg in messageStore.currentMessages" :key="msg.id" class="pm-row" :class="{ 'pm-self': msg.senderId === currentUserId }">
          <template v-if="msg.senderId !== currentUserId">
            <UserAvatar :avatar-url="msg.senderAvatar" :nickname="msg.senderName" :size="32" />
            <div class="pm-bubble pm-other-bubble">
              <div class="pm-text">{{ msg.content }}</div>
              <img v-if="msg.imageUrl" :src="msg.imageUrl" class="pm-image" />
            </div>
          </template>
          <template v-else>
            <div class="pm-bubble pm-self-bubble">
              <div class="pm-text">{{ msg.content }}</div>
              <img v-if="msg.imageUrl" :src="msg.imageUrl" class="pm-image" />
            </div>
            <UserAvatar :avatar-url="msg.senderAvatar" :nickname="msg.senderName" :size="32" />
          </template>
        </div>
        <div v-if="!messageStore.currentMessages.length" class="chat-empty">暂无消息，打个招呼吧</div>
      </div>

      <div class="chat-input card">
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useMessageStore } from '@/stores/message'
import { getSocket } from '@/composables/useSocket'
import AppNavbar from '@/components/AppNavbar.vue'
import BackButton from '@/components/BackButton.vue'
import UserAvatar from '@/components/UserAvatar.vue'

const route = useRoute()
const userStore = useUserStore()
const messageStore = useMessageStore()
const currentUserId = computed(() => userStore.user?.id)
const convId = computed(() => parseInt(route.params.id, 10))

const messagesEl = ref(null)
const inputText = ref('')
const isComposing = ref(false)
const peerInfo = ref(null)
const isPeerOnline = ref(false)

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
    nextTick(scrollToBottom)
  }
}

watch(() => messageStore.currentMessages.length, () => {
  nextTick(scrollToBottom)
})

onMounted(async () => {
  await messageStore.fetchConversations()
  findPeerInfo()
  await loadMessages()
  const socket = getSocket()
  socket.on('pm:message', handlePmMessage)
})

onUnmounted(() => {
  const socket = getSocket()
  socket.off('pm:message', handlePmMessage)
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
.pm-image { max-width: 200px; border-radius: 8px; margin-top: 6px; cursor: pointer; }
.chat-empty {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: var(--color-text-secondary); font-size: 0.9rem;
}

.chat-input {
  display: flex; gap: 8px; padding: 10px 12px; margin-top: 8px;
}
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
</style>
