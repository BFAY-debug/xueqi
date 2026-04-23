<template>
  <div class="md-viewer" v-html="rendered" ref="viewerRef"></div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const renderer = new marked.Renderer()
renderer.image = ({ href, title, text }) => {
  const alt = text || ''
  const src = href || ''
  return `<div class="img-wrap"><img src="${src}" alt="${alt}" /><span class="img-resize-handle"></span></div>`
}

marked.setOptions({ breaks: true, gfm: true, renderer })

const props = defineProps({ content: { type: String, default: '' } })
const viewerRef = ref(null)

const rendered = computed(() => {
  if (!props.content) return ''
  let raw = marked.parse(props.content)
  raw = raw.replace(/@([\w\u4e00-\u9fff]+)/g, (match, username) => {
    return `<a href="/community?keyword=%40${encodeURIComponent(username)}" class="mention-link">@${username}</a>`
  })
  return DOMPurify.sanitize(raw, { ADD_TAGS: ['span'], ADD_ATTR: ['class'] })
})

// Image resize drag handling
let dragging = null

function onMouseDown(e) {
  const handle = e.target.closest('.img-resize-handle')
  if (!handle) return
  const wrap = handle.parentElement
  const img = wrap.querySelector('img')
  if (!img) return
  e.preventDefault()
  dragging = { wrap, img, startX: e.clientX, startW: wrap.offsetWidth }
  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
}

function onMouseMove(e) {
  if (!dragging) return
  const dx = e.clientX - dragging.startX
  const newW = Math.max(100, Math.min(dragging.startW + dx, viewerRef.value?.offsetWidth || 800))
  dragging.img.style.width = newW + 'px'
  dragging.wrap.style.width = newW + 'px'
}

function onMouseUp() {
  if (!dragging) return
  dragging = null
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onMounted(() => {
  document.addEventListener('mousedown', onMouseDown)
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onMouseDown)
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
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

.md-viewer :deep(.img-wrap) {
  display: inline-block; position: relative; max-width: 100%; margin: 16px auto; border-radius: var(--border-radius-sm);
}
.md-viewer :deep(.img-wrap img) {
  display: block; max-width: 80%; width: 80%; border-radius: var(--border-radius-sm);
}
.md-viewer :deep(.img-resize-handle) {
  position: absolute; right: -4px; bottom: -4px; width: 14px; height: 14px;
  cursor: ew-resize; border-radius: 50%; opacity: 0;
  background: var(--color-accent); border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  transition: opacity 0.15s;
}
.md-viewer :deep(.img-wrap:hover .img-resize-handle) { opacity: 1; }

.md-viewer :deep(.mention-link) { color: var(--color-accent); font-weight: 600; text-decoration: none; background: var(--color-accent-light); padding: 1px 4px; border-radius: 3px; }
.md-viewer :deep(.mention-link:hover) { text-decoration: underline; }
</style>
