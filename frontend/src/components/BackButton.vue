<template>
  <button class="back-btn" @click="goBack" :title="tooltip">
    <svg class="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
    <span class="back-text"><slot>返回</slot></span>
  </button>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  fallback: { type: String, default: '/' },
  tooltip: { type: String, default: '返回上一页' }
})

const router = useRouter()

function goBack() {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push(props.fallback)
  }
}
</script>

<style scoped>
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid var(--color-border);
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  transition: all 0.2s;
  margin-bottom: 16px;
}
.back-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-light);
}
.back-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.2s;
}
.back-btn:hover .back-icon {
  transform: translateX(-2px);
}
</style>
