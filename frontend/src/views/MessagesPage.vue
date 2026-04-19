<template>
  <div class="page">
    <AppNavbar />
    <div class="page-body container">
      <div class="messages-header">
        <h2>消息</h2>
        <span v-if="messageStore.unreadTotal" class="unread-badge">{{ messageStore.unreadTotal }}</span>
      </div>

      <div class="conversations-list" v-if="messageStore.conversations.length">
        <div
          v-for="conv in messageStore.conversations"
          :key="conv.id"
          class="conv-card card"
          @click="openChat(conv)"
        >
          <UserAvatar :avatar-url="conv.peerAvatar" :nickname="conv.peerNickname" :size="44" />
          <div class="conv-info">
            <div class="conv-top">
              <span class="conv-name">{{ conv.peerNickname }}</span>
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
    </div>
    <AppFooter />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessageStore } from '@/stores/message'
import AppNavbar from '@/components/AppNavbar.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppEmpty from '@/components/AppEmpty.vue'
import UserAvatar from '@/components/UserAvatar.vue'

const messageStore = useMessageStore()
const router = useRouter()

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

onMounted(async () => {
  await messageStore.fetchConversations()
  await messageStore.fetchUnreadCount()
  messageStore.setupSocketListeners()
})

onUnmounted(() => {
  messageStore.removeSocketListeners()
})
</script>

<style scoped>
.page { min-height: 100vh; background: var(--color-bg-primary); }
.page-body { padding: calc(var(--nav-height) + 32px) 0 48px; max-width: 640px; }
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
</style>
