<template>
  <div class="md-editor">
    <div class="md-toolbar">
      <button @click="insert('**', '**')" title="加粗">B</button>
      <button @click="insert('## ', '')" title="标题">H</button>
      <button @click="insert('- ', '')" title="列表">▪</button>
      <button @click="insert('`', '`')" title="行内代码">&lt;/&gt;</button>
      <button @click="insert('```\n', '\n```')" title="代码块">{ }</button>
      <button @click="insert('[', '](url)')" title="链接">🔗</button>
      <button @click="insertTable" title="表格">⊞</button>
      <button @click="triggerImageUpload" title="上传图片" :disabled="uploading">📷</button>
      <button @click="insert('> ', '')" title="引用">❝</button>
      <button @click="insert('---\n', '')" title="分割线">—</button>
      <div class="toolbar-spacer"></div>
      <button @click="preview = !preview" :class="{ active: preview }">预览</button>
    </div>
    <div class="md-body" @dragover.prevent @drop.prevent="handleDrop">
      <textarea
        v-show="!preview"
        ref="textareaRef"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
        @paste="handlePaste"
        :placeholder="placeholder"
        class="md-textarea"
      ></textarea>
      <MarkdownViewer v-if="preview" :content="modelValue" class="md-preview-area" />
      <div v-if="uploading" class="upload-overlay">上传中...</div>
    </div>
    <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="handleFileSelect" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import MarkdownViewer from './MarkdownViewer.vue'
import { compressImage } from '@/utils/compressImage'
import { postAPI } from '@/api/community'

defineProps({ modelValue: { type: String, default: '' }, placeholder: { type: String, default: '' } })
defineEmits(['update:modelValue'])

const textareaRef = ref(null)
const fileInput = ref(null)
const preview = ref(false)
const uploading = ref(false)

function insert(before, after) {
  const el = textareaRef.value
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

function insertTable() {
  const table = '\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n'
  insert(table, '')
}

function triggerImageUpload() {
  fileInput.value?.click()
}

async function handleFileSelect(e) {
  const file = e.target.files?.[0]
  if (file) await uploadAndInsert(file)
  e.target.value = ''
}

async function handleDrop(e) {
  const file = e.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    await uploadAndInsert(file)
  }
}

async function handlePaste(e) {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) await uploadAndInsert(file)
      return
    }
  }
}

async function uploadAndInsert(file) {
  uploading.value = true
  const placeholder = `![上传中...]()`
  insert(placeholder, '')

  try {
    const MAX_SIZE = 5 * 1024 * 1024
    let uploadFile = file
    if (file.size > MAX_SIZE) {
      uploadFile = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.85 })
      if (uploadFile.size > MAX_SIZE) {
        uploadFile = await compressImage(uploadFile, { maxWidth: 800, maxHeight: 800, quality: 0.6 })
      }
    }
    const res = await postAPI.uploadImage(uploadFile)
    const url = res.data?.url
    if (!url) throw new Error('上传失败')

    // Replace placeholder with actual image
    const el = textareaRef.value
    if (el) {
      const desc = file.name?.replace(/\.[^.]+$/, '') || '图片'
      el.value = el.value.replace(placeholder, `![${desc}](${url})`)
      el.dispatchEvent(new Event('input'))
    }
  } catch (err) {
    ElMessage.error(err.message || '图片上传失败')
    // Remove placeholder on failure
    const el = textareaRef.value
    if (el) {
      el.value = el.value.replace(placeholder, '')
      el.dispatchEvent(new Event('input'))
    }
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.md-editor { border: 1px solid var(--color-border); border-radius: var(--border-radius-sm); overflow: hidden; }
.md-toolbar { display: flex; gap: 2px; padding: 6px 8px; background: var(--color-bg-secondary); border-bottom: 1px solid var(--color-border); }
.md-toolbar button { background: none; border: 1px solid transparent; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.85rem; color: var(--color-text-primary); }
.md-toolbar button:hover { background: var(--glass-bg-card); border-color: var(--color-border); }
.md-toolbar button.active { background: var(--color-accent-light); color: var(--color-accent); border-color: var(--color-accent); }
.md-toolbar button:disabled { opacity: 0.5; cursor: not-allowed; }
.toolbar-spacer { flex: 1; }
.md-body { min-height: 300px; position: relative; }
.md-textarea { width: 100%; min-height: 300px; padding: 16px; border: none; outline: none; resize: vertical; font-family: var(--font-mono); font-size: 0.9rem; line-height: 1.7; background: transparent; color: var(--color-text-primary); box-sizing: border-box; }
.md-preview-area { padding: 16px; }
.upload-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; font-size: 0.9rem; color: var(--color-accent); pointer-events: none; }
</style>
