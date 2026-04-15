<template>
  <div class="md-viewer" v-html="rendered"></div>
</template>

<script setup>
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ breaks: true, gfm: true })

const props = defineProps({ content: { type: String, default: '' } })
const rendered = computed(() => {
  if (!props.content) return ''
  const raw = marked.parse(props.content)
  return DOMPurify.sanitize(raw)
})
</script>

<style scoped>
.md-viewer { line-height: 1.8; font-size: 0.95rem; }
.md-viewer :deep(h1) { font-family: var(--font-title); font-size: 1.8rem; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 2px solid var(--color-border); }
.md-viewer :deep(h2) { font-family: var(--font-title); font-size: 1.4rem; margin: 20px 0 10px; color: var(--color-text-primary); }
.md-viewer :deep(h3) { font-family: var(--font-title); font-size: 1.15rem; margin: 16px 0 8px; color: var(--color-text-primary); }
.md-viewer :deep(p) { margin: 8px 0; }
.md-viewer :deep(ul), .md-viewer :deep(ol) { padding-left: 24px; margin: 8px 0; }
.md-viewer :deep(li) { margin: 4px 0; }
.md-viewer :deep(blockquote) { border-left: 3px solid var(--color-accent); padding: 4px 16px; margin: 12px 0; background: var(--color-accent-light); border-radius: 0 6px 6px 0; color: var(--color-text-secondary); }
.md-viewer :deep(code) { background: var(--color-bg-secondary); padding: 2px 6px; border-radius: 3px; font-family: var(--font-mono); font-size: 0.85em; }
.md-viewer :deep(pre) { background: var(--color-bg-secondary); padding: 16px; border-radius: var(--border-radius-sm); overflow-x: auto; margin: 12px 0; }
.md-viewer :deep(pre code) { background: none; padding: 0; }
.md-viewer :deep(table) { width: 100%; border-collapse: collapse; margin: 12px 0; }
.md-viewer :deep(th), .md-viewer :deep(td) { border: 1px solid var(--color-border); padding: 8px 12px; text-align: left; }
.md-viewer :deep(th) { background: var(--color-bg-secondary); font-weight: 600; }
.md-viewer :deep(a) { color: var(--color-accent); }
.md-viewer :deep(hr) { border: none; height: 1px; background: var(--color-border); margin: 20px 0; }
.md-viewer :deep(strong) { color: var(--color-text-primary); }
.md-viewer :deep(img) { max-width: 100%; border-radius: var(--border-radius-sm); }
</style>
