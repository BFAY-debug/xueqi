<template>
  <img v-if="avatarUrl" :src="avatarUrl" :alt="nickname + '的头像'" class="user-avatar" :style="sizeStyle" @click="clickable && emit('user-click', userId)" :class="{ 'avatar-clickable': clickable }" />
  <div v-else class="avatar-placeholder" :style="sizeStyle" @click="clickable && emit('user-click', userId)" :class="{ 'avatar-clickable': clickable }">{{ initial }}</div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  avatarUrl: { type: String, default: '' },
  nickname: { type: String, default: '' },
  size: { type: Number, default: 32 },
  clickable: { type: Boolean, default: false },
  userId: { type: Number, default: null }
})

const emit = defineEmits(['user-click'])

const initial = computed(() => (props.nickname || '?')[0])
const sizeStyle = computed(() => ({
  width: props.size + 'px',
  height: props.size + 'px',
  fontSize: Math.max(props.size * 0.4, 12) + 'px'
}))
</script>

<style scoped>
.user-avatar {
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--color-border);
}
.avatar-placeholder {
  border-radius: 50%;
  background: var(--color-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
  font-weight: 600;
}
.avatar-clickable { cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }
.avatar-clickable:hover { transform: scale(1.08); box-shadow: 0 0 0 2px var(--color-accent); }
</style>
