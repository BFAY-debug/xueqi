<template>
  <div class="app-empty">
    <svg class="empty-ink" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Ink wash empty state — lone plum blossom branch -->
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Branch -->
        <path d="M30,100 C40,85 50,70 65,55 C75,45 85,40 95,35"
              stroke="currentColor" stroke-width="1.5" opacity="0.12"/>
        <path d="M55,65 C65,58 75,56 88,58"
              stroke="currentColor" stroke-width="1" opacity="0.08"/>
        <!-- Blossoms -->
        <g opacity="0.1">
          <circle cx="90" cy="33" r="5" fill="currentColor"/>
          <circle cx="80" cy="40" r="4" fill="currentColor"/>
          <circle cx="70" cy="50" r="3.5" fill="currentColor"/>
          <circle cx="60" cy="58" r="3" fill="currentColor"/>
        </g>
        <!-- Seal stamp -->
        <rect x="82" y="22" width="14" height="14" rx="2"
              stroke="currentColor" stroke-width="1.2" opacity="0.08"
              transform="rotate(-5 89 29)"/>
        <text x="89" y="33" text-anchor="middle" font-size="8"
              fill="currentColor" opacity="0.08" font-family="serif">空</text>
      </g>
    </svg>
    <p class="empty-text">{{ text || '暂无内容' }}</p>
    <slot></slot>
  </div>
</template>

<script setup>
defineProps({
  text: { type: String, default: '' }
})
</script>

<style scoped>
.app-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: var(--color-text-secondary);
}

.empty-ink {
  width: 120px;
  height: 120px;
  margin-bottom: 16px;
  color: var(--color-text-primary);
}

.empty-text {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}
</style>
