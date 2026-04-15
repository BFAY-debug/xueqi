<template>
  <div class="md-editor">
    <div class="md-toolbar">
      <button @click="insert('**', '**')" title="加粗">B</button>
      <button @click="insert('## ', '')" title="标题">H</button>
      <button @click="insert('- ', '')" title="列表">▪</button>
      <button @click="insert('`', '`')" title="行内代码">&lt;/&gt;</button>
      <button @click="insert('```\n', '\n```')" title="代码块">{ }</button>
      <button @click="insert('[', '](url)')" title="链接">🔗</button>
      <button @click="insert('> ', '')" title="引用">❝</button>
      <button @click="insert('---\n', '')" title="分割线">—</button>
      <div class="toolbar-spacer"></div>
      <button @click="preview = !preview" :class="{ active: preview }">预览</button>
    </div>
    <div class="md-body">
      <textarea
        v-show="!preview"
        ref="textarea"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
        :placeholder="placeholder"
        class="md-textarea"
      ></textarea>
      <MarkdownViewer v-if="preview" :content="modelValue" class="md-preview-area" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MarkdownViewer from './MarkdownViewer.vue'

defineProps({ modelValue: { type: String, default: '' }, placeholder: { type: String, default: '' } })
defineEmits(['update:modelValue'])

const textarea = ref(null)
const preview = ref(false)

function insert(before, after) {
  const el = textarea.value
  if (!el) return
  const start = el.selectionStart
  const end = el.selectionEnd
  const text = el.value
  const selected = text.slice(start, end)
  const newText = text.slice(0, start) + before + selected + after + text.slice(end)
  el.value = newText
  el.focus()
  el.selectionStart = start + before.length
  el.selectionEnd = start + before.length + selected.length
  el.dispatchEvent(new Event('input'))
}
</script>

<style scoped>
.md-editor { border: 1px solid var(--color-border); border-radius: var(--border-radius-sm); overflow: hidden; }
.md-toolbar { display: flex; gap: 2px; padding: 6px 8px; background: var(--color-bg-secondary); border-bottom: 1px solid var(--color-border); }
.md-toolbar button { background: none; border: 1px solid transparent; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85rem; color: var(--color-text-primary); }
.md-toolbar button:hover { background: var(--glass-bg-card); border-color: var(--color-border); }
.md-toolbar button.active { background: var(--color-accent-light); color: var(--color-accent); border-color: var(--color-accent); }
.toolbar-spacer { flex: 1; }
.md-body { min-height: 300px; }
.md-textarea { width: 100%; min-height: 300px; padding: 16px; border: none; outline: none; resize: vertical; font-family: var(--font-mono); font-size: 0.9rem; line-height: 1.7; background: transparent; color: var(--color-text-primary); }
.md-preview-area { padding: 16px; }
</style>
