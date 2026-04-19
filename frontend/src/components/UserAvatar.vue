<template>
  <img v-if="avatarUrl" :src="avatarUrl" class="user-avatar" :style="sizeStyle" />
  <div v-else class="avatar-placeholder" :style="sizeStyle">{{ initial }}</div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  avatarUrl: { type: String, default: '' },
  nickname: { type: String, default: '' },
  size: { type: Number, default: 32 }
})

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
</style>
