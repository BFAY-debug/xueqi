<template>
  <div class="page-wrapper">
    <AppNavbar />
    <div class="page-content container" style="margin-top: var(--nav-height); padding-top: 24px;">
      <div class="community-header">
        <h2 class="page-title">论道场</h2>
        <el-button v-if="userStore.isLoggedIn" type="primary" @click="showCreate = true">+ 发起论题</el-button>
      </div>

      <!-- Tabs -->
      <div class="category-tabs">
        <span v-for="cat in categoryList" :key="cat.value" class="tab" :class="{ active: category === cat.value }" @click="category = cat.value; fetchPosts()">
          {{ cat.label }}
        </span>
      </div>

      <div class="community-layout">
        <!-- Post List -->
        <div class="post-list">
          <div v-for="post in posts" :key="post.id" class="post-card card" @click="$router.push(`/community/posts/${post.id}`)">
            <div class="post-badges">
              <span v-if="post.is_pinned" class="badge pin">📌 置顶</span>
              <span v-if="post.is_featured" class="badge feature">⭐ 精选</span>
              <span class="badge cat">{{ categoryMap[post.category] }}</span>
            </div>
            <h3 class="post-title">{{ post.title }}</h3>
            <div class="post-footer">
              <span class="post-author">{{ post.author_name }} · {{ timeAgo(post.created_at) }}</span>
              <span class="post-stats">💬{{ post.comment_count }} 👍{{ post.like_count }} 👁{{ post.view_count }}</span>
            </div>
          </div>
          <p v-if="!posts.length" class="empty-text">暂无论题</p>
          <el-pagination v-if="total > pageSize" layout="prev, pager, next" :total="total" :page-size="pageSize" v-model:current-page="page" @current-change="fetchPosts" class="pagination" />
        </div>

        <!-- Sidebar -->
        <div class="community-sidebar">
          <div class="sidebar-block card">
            <h4>热门标签</h4>
            <div class="tag-cloud">
              <span v-for="tag in tags" :key="tag.id" class="sidebar-tag" @click="filterByTag(tag.name)">{{ tag.name }}</span>
            </div>
          </div>
          <div class="sidebar-block card">
            <h4>论道须知</h4>
            <ul class="rules-list">
              <li>以文会友，友善交流</li>
              <li>不传不实之词</li>
              <li>鼓励分享求学经验</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Dialog -->
    <el-dialog v-model="showCreate" title="发起论题" width="600px">
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="标题"><el-input v-model="createForm.title" placeholder="论题标题" /></el-form-item>
        <el-form-item label="分类">
          <el-select v-model="createForm.category">
            <el-option v-for="cat in categoryList.slice(1)" :key="cat.value" :label="cat.label" :value="cat.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容"><el-input v-model="createForm.content" type="textarea" :rows="6" placeholder="写下你的见解..." /></el-form-item>
        <el-form-item label="标签"><el-input v-model="tagsInput" placeholder="用逗号分隔标签" /></el-form-item>
        <el-form-item><el-checkbox v-model="createForm.isAnonymous">🎭 匿名发表</el-checkbox></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" @click="createPost" :loading="creating">发起论题</el-button>
      </template>
    </el-dialog>

    <AppFooter />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppFooter from '@/components/AppFooter.vue'
import { postAPI, tagAPI } from '@/api/community'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const categoryMap = { experience: '修习心得', question: '求学问路', resource: '典籍推荐', general: '杂谈' }
const categoryList = [
  { value: '', label: '全部' },
  { value: 'experience', label: '修习心得' },
  { value: 'question', label: '求学问路' },
  { value: 'resource', label: '典籍推荐' },
  { value: 'general', label: '杂谈' }
]

const posts = ref([])
const tags = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const category = ref('')

const showCreate = ref(false)
const creating = ref(false)
const tagsInput = ref('')
const createForm = ref({ title: '', content: '', category: 'general', isAnonymous: false })

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours}时辰前`
  return `${Math.floor(hours / 24)}日前`
}

async function fetchPosts() {
  try {
    const res = await postAPI.getList({ page: page.value, pageSize, category: category.value })
    posts.value = res.data || []
    total.value = res.pagination?.total || 0
  } catch { /* ignore */ }
}

async function fetchTags() {
  try {
    const res = await tagAPI.getList()
    tags.value = res.data || []
  } catch { /* ignore */ }
}

function filterByTag(name) {
  // Simple: just search by tag
  category.value = ''
  fetchPosts()
}

async function createPost() {
  if (!createForm.value.title || !createForm.value.content) return ElMessage.warning('请填写标题和内容')
  creating.value = true
  try {
    const tags = tagsInput.value ? tagsInput.value.split(/[,，]/).map(t => t.trim()).filter(Boolean) : []
    await postAPI.create({ ...createForm.value, tags })
    ElMessage.success('论题已提交，等待审核')
    showCreate.value = false
    createForm.value = { title: '', content: '', category: 'general', isAnonymous: false }
    tagsInput.value = ''
    fetchPosts()
  } catch (err) { ElMessage.error(err.message) }
  finally { creating.value = false }
}

onMounted(() => { fetchPosts(); fetchTags() })
</script>

<style scoped>
.page-wrapper { min-height: 100vh; background: var(--color-bg-primary); }
.page-title { font-family: var(--font-title); font-size: 1.8rem; }
.community-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }

.category-tabs { display: flex; gap: 16px; margin-bottom: 24px; border-bottom: 1px solid var(--color-border-light); padding-bottom: 8px; }
.tab { padding: 4px 12px; font-size: 0.9rem; cursor: pointer; border-radius: 4px 4px 0 0; color: var(--color-text-secondary); transition: all 0.2s; }
.tab:hover { color: var(--color-accent); }
.tab.active { color: var(--color-accent); border-bottom: 2px solid var(--color-accent); font-weight: 600; }

.community-layout { display: flex; gap: 24px; }
.post-list { flex: 1; }

.post-card { padding: 18px 20px; margin-bottom: 12px; cursor: pointer; transition: transform 0.2s; }
.post-card:hover { transform: translateX(4px); }
.post-badges { display: flex; gap: 6px; margin-bottom: 8px; }
.badge { font-size: 0.75rem; padding: 1px 6px; border-radius: 3px; }
.badge.pin { background: rgba(139,37,0,0.1); color: var(--color-accent); }
.badge.feature { background: rgba(184,134,11,0.1); color: var(--color-gold); }
.badge.cat { background: rgba(46,92,76,0.1); color: var(--color-green); }
.post-title { font-size: 1rem; font-weight: 600; margin-bottom: 8px; }
.post-footer { display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--color-text-secondary); }
.post-stats { display: flex; gap: 8px; }
.empty-text { text-align: center; color: var(--color-text-secondary); padding: 40px; }
.pagination { margin-top: 20px; display: flex; justify-content: center; }

.community-sidebar { flex: 0 0 240px; display: flex; flex-direction: column; gap: 16px; }
.sidebar-block { padding: 16px; }
.sidebar-block h4 { font-family: var(--font-title); font-size: 0.95rem; margin-bottom: 10px; color: var(--color-text-secondary); }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 6px; }
.sidebar-tag { padding: 3px 10px; font-size: 0.8rem; border: 1px solid var(--color-border); border-radius: 4px; cursor: pointer; transition: all 0.2s; }
.sidebar-tag:hover { border-color: var(--color-accent); color: var(--color-accent); }
.rules-list { font-size: 0.85rem; color: var(--color-text-secondary); padding-left: 16px; line-height: 2; }

@media (max-width: 768px) {
  .community-layout { flex-direction: column; }
  .community-sidebar { flex: none; }
}
</style>
