<template>
  <div class="app-loading">
    <div class="skeleton" v-for="i in count" :key="i" :class="[type === 'card' ? 'skeleton-card' : 'skeleton-line-block']">
      <template v-if="type === 'card'">
        <div class="sk-circle"></div>
        <div class="sk-line" :style="{ width: '60%' }"></div>
        <div class="sk-line" :style="{ width: '85%' }"></div>
        <div class="sk-line" :style="{ width: '40%' }"></div>
      </template>
      <template v-else-if="type === 'detail'">
        <div class="sk-line" :style="{ width: '45%', height: '24px' }"></div>
        <div class="sk-line" :style="{ width: '100%' }"></div>
        <div class="sk-line" :style="{ width: '90%' }"></div>
        <div class="sk-line" :style="{ width: '70%' }"></div>
        <div class="sk-line" :style="{ width: '50%' }"></div>
      </template>
      <template v-else>
        <div class="sk-line" :style="{ width: '80%' }"></div>
        <div class="sk-line" :style="{ width: '60%' }"></div>
      </template>
    </div>
  </div>
</template>

<script setup>
defineProps({
  type: { type: String, default: 'card' },   // 'card' | 'detail' | 'line'
  count: { type: Number, default: 3 }
})
</script>

<style scoped>
.app-loading {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: center;
  padding: 20px 0;
}

.skeleton {
  background: var(--glass-bg-card);
  border: var(--glass-border);
  border-radius: var(--border-radius);
  padding: 24px;
}

.skeleton-card {
  width: 280px;
  text-align: center;
}

.skeleton-line-block {
  width: 100%;
}

.sk-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-bg-secondary);
  margin: 0 auto 12px;
  animation: shimmer 1.5s ease-in-out infinite;
}

.sk-line {
  height: 14px;
  border-radius: 7px;
  background: var(--color-bg-secondary);
  margin: 8px 0;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
</style>
