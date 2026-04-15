<template>
  <div class="page-wrapper theme-edit">
    <AppNavbar />
    <div class="page-content container" style="margin-top: var(--nav-height); padding-top: 24px;">
      <BackButton fallback="/community">返回</BackButton>
      <div class="page-header-decorated">
        <h2 class="page-title">{{ isEdit ? '📝 编辑知识文章' : '✒️ 撰写知识文章' }}</h2>
      </div>

      <div class="edit-form card">
        <div class="form-group">
          <label>标题</label>
          <el-input v-model="form.title" placeholder="输入文章标题" maxlength="200" />
        </div>

        <div class="form-group">
          <label>摘要</label>
          <el-input v-model="form.summary" type="textarea" :rows="2" placeholder="简短描述文章内容（可选，500字以内）" maxlength="500" />
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>分类</label>
            <el-select v-model="form.category">
              <el-option label="修习心得" value="experience" />
              <el-option label="求学问路" value="question" />
              <el-option label="典籍推荐" value="resource" />
              <el-option label="杂谈" value="general" />
            </el-select>
          </div>
          <div class="form-group">
            <label>权限</label>
            <el-select v-model="form.permission">
              <el-option label="公开" value="public" />
              <el-option label="私密" value="private" />
            </el-select>
          </div>
          <div class="form-group">
            <el-checkbox v-model="form.isAnonymous">匿名发布</el-checkbox>
          </div>
        </div>

        <div class="form-group">
          <label>标签（逗号分隔）</label>
          <el-input v-model="tagsInput" placeholder="如：考研, 高数, 学习方法" />
        </div>

        <div class="form-group">
          <label>正文（Markdown）</label>
          <MarkdownEditor v-model="form.content" placeholder="使用 Markdown 格式撰写文章内容..." />
        </div>

        <div class="form-actions">
          <el-button @click="$router.back()">取消</el-button>
          <el-button type="primary" @click="submit" :loading="submitting">
            {{ isEdit ? '更新文章' : '提交文章' }}
          </el-button>
        </div>
      </div>
    </div>
    <AppFooter />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppNavbar from '@/components/AppNavbar.vue'
import BackButton from '@/components/BackButton.vue'
import AppFooter from '@/components/AppFooter.vue'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import { postAPI } from '@/api/community'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => route.name !== undefined && route.path.includes('/edit'))
const postId = computed(() => route.params.id)
const submitting = ref(false)
const tagsInput = ref('')

const form = reactive({
  title: '',
  summary: '',
  content: '',
  category: 'general',
  permission: 'public',
  isAnonymous: false
})

onMounted(async () => {
  if (isEdit.value && postId.value) {
    try {
      const res = await postAPI.getById(postId.value)
      const post = res.data
      form.title = post.title
      form.summary = post.summary || ''
      form.content = post.content
      form.category = post.category
      form.permission = post.permission || 'public'
      form.isAnonymous = !!post.is_anonymous
      if (post.tags) tagsInput.value = post.tags.map(t => t.name).join(', ')
    } catch (err) {
      ElMessage.error('加载文章失败')
      router.back()
    }
  }
})

async function submit() {
  if (!form.title.trim()) return ElMessage.warning('请输入标题')
  if (!form.content.trim()) return ElMessage.warning('请输入内容')

  const tags = tagsInput.value.split(/[,，]/).map(t => t.trim()).filter(Boolean)
  const data = { ...form, tags, contentType: 'markdown' }

  submitting.value = true
  try {
    if (isEdit.value) {
      await postAPI.update(postId.value, data)
      ElMessage.success('文章已更新，等待重新审核')
    } else {
      await postAPI.create(data)
      ElMessage.success('文章已提交，等待审核')
    }
    router.push('/community')
  } catch (err) {
    ElMessage.error(err.message)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page-wrapper { min-height: 100vh; background: var(--color-bg-primary); }
.page-title { font-family: var(--font-title); font-size: 1.8rem; margin-bottom: 20px; text-align: center; }
.edit-form { padding: 28px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 0.9rem; color: var(--color-text-secondary); }
.form-row { display: flex; gap: 16px; align-items: flex-end; }
.flex-1 { flex: 1; }
.form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }
</style>
