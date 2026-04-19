<template>
  <div class="online-users-panel">
    <div class="online-header">
      <span class="online-title">在线学友</span>
      <span class="online-count">{{ messageStore.onlineUsers.length }}人</span>
    </div>
    <div class="online-list" v-if="messageStore.onlineUsers.length">
      <div
        v-for="u in messageStore.onlineUsers.slice(0, limit)"
        :key="u.userId"
        class="online-user-item"
        @click="$emit('select', u)"
      >
        <div class="online-avatar-wrap">
          <UserAvatar :avatar-url="u.avatarUrl" :nickname="u.nickname" :size="size" />
          <span class="online-dot"></span>
        </div>
        <span class="online-name">{{ u.nickname }}</span>
      </div>
    </div>
    <div v-else class="online-empty">暂无在线学友</div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useMessageStore } from '@/stores/message'
import UserAvatar from './UserAvatar.vue'

defineProps({
  limit: { type: Number, default: 20 },
  size: { type: Number, default: 36 }
})
defineEmits(['select'])

const messageStore = useMessageStore()

onMounted(() => {
  messageStore.fetchOnlineUsers()
})
</script>

<style scoped>
.online-users-panel { padding: 12px; }
.online-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px;
}
.online-title { font-weight: 600; font-size: 0.9rem; }
.online-count { font-size: 0.8rem; color: var(--color-text-secondary); }
.online-list { display: flex; flex-wrap: wrap; gap: 12px; }
.online-user-item {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  cursor: pointer; padding: 4px; border-radius: 8px; transition: background 0.15s;
}
.online-user-item:hover { background: var(--color-bg-secondary); }
.online-avatar-wrap { position: relative; }
.online-dot {
  position: absolute; bottom: 1px; right: 1px;
  width: 10px; height: 10px;
  background: #4caf50; border-radius: 50%;
  border: 2px solid var(--color-bg-primary);
}
.online-name {
  font-size: 0.75rem; color: var(--color-text-secondary);
  max-width: 50px; text-align: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.online-empty { font-size: 0.85rem; color: var(--color-text-secondary); }
</style>
