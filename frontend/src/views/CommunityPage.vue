<template>
  <div class="page-wrapper theme-community">
    <AppNavbar />
    <div class="page-content container" style="margin-top: var(--nav-height); padding-top: 24px;">
      <BackButton fallback="/">返回首页</BackButton>
      <div class="page-header-decorated">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 class="page-title">📜 知识广场</h2>
            <p class="page-subtitle">以文会友，以友辅仁</p>
          </div>
          <router-link v-if="userStore.isLoggedIn" to="/community/create" class="btn-primary">撰写文章</router-link>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="filters glass-card">
        <el-input v-model="keyword" placeholder="搜索知识文章..." clearable @keyup.enter="search" class="search-input">
          <template #prefix>🔍</template>
        </el-input>
        <div class="filter-bar">
          <div class="category-tabs">
            <span v-for="cat in categories" :key="cat.value" :class="{ active: category === cat.value }" @click="category = cat.value; fetchPosts()">
              {{ cat.label }}
            </span>
          </div>
          <div class="sort-select">
            <span :class="{ active: sort === 'latest' }" @click="sort = 'latest'; fetchPosts()">最新</span>
            <span :class="{ active: sort === 'hot' }" @click="sort = 'hot'; fetchPosts()">最热</span>
            <span :class="{ active: sort === 'bookmarks' }" @click="sort = 'bookmarks'; fetchPosts()">最多收藏</span>
          </div>
        </div>
      </div>

      <!-- Post List -->
      <AppLoading v-if="loading" type="card" :count="4" />
      <div class="post-list" v-else-if="posts.length">
        <div v-for="post in posts" :key="post.id" class="post-item card" @click="$router.push('/community/posts/' + post.id)">
          <div class="post-left">
            <div class="post-badges">
              <span v-if="post.is_pinned" class="pin-badge">📌 置顶</span>
              <span v-if="post.is_featured" class="feature-badge">⭐ 精华</span>
              <span class="category-tag">{{ categoryMap[post.category] }}</span>
            </div>
            <h3 class="post-title">{{ post.title }}</h3>
            <p v-if="post.summary" class="post-summary">{{ post.summary }}</p>
            <div class="post-meta">
              <span>{{ post.author_name }}</span>
              <span>{{ timeAgo(post.created_at) }}</span>
            </div>
          </div>
          <div class="post-stats">
            <span>👀 {{ post.view_count }}</span>
            <span>❤️ {{ post.like_count }}</span>
            <span>💬 {{ post.comment_count }}</span>
            <span>⭐ {{ post.bookmark_count || 0 }}</span>
          </div>
        </div>
      </div>
      <AppEmpty v-else text="暂无文章，快来撰写第一篇吧！" />

      <!-- Tags -->
      <div class="sidebar" v-if="tags.length">
        <h3 class="sidebar-title">热门标签</h3>
        <div class="tag-cloud">
          <span v-for="tag in tags" :key="tag.id" class="tag-item" :class="{ active: selectedTag === tag.name }"
            @click="selectedTag = selectedTag === tag.name ? '' : tag.name; fetchPosts()">
            {{ tag.name }} ({{ tag.post_count }})
          </span>
        </div>
      </div>
    </div>
    <AppFooter />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppNavbar from '@/components/AppNavbar.vue'
import BackButton from '@/components/BackButton.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppLoading from '@/components/AppLoading.vue'
import AppEmpty from '@/components/AppEmpty.vue'
import { postAPI, tagAPI } from '@/api/community'
import { useUserStore } from '@/stores/user'
import { useTimeAgo } from '@/composables/useTimeAgo'

const userStore = useUserStore()
const posts = ref([])
const tags = ref([])
const loading = ref(false)
const keyword = ref('')
const category = ref('')
const sort = ref('latest')
const selectedTag = ref('')

const categories = [
  { label: '全部', value: '' },
  { label: '修习心得', value: 'experience' },
  { label: '求学问路', value: 'question' },
  { label: '典籍推荐', value: 'resource' },
  { label: '杂谈', value: 'general' }
]
const categoryMap = { experience: '修习心得', question: '求学问路', resource: '典籍推荐', general: '杂谈' }

const { timeAgo } = useTimeAgo()

function search() { fetchPosts() }

async function fetchPosts() {
  loading.value = true
  try {
    const params = { pageSize: 20 }
    if (category.value) params.category = category.value
    if (keyword.value) params.keyword = keyword.value
    if (sort.value) params.sort = sort.value
    if (selectedTag.value) params.tag = selectedTag.value
    const res = await postAPI.getList(params)
    posts.value = res.data || []
  } catch { posts.value = [] }
  finally { loading.value = false }
}

async function fetchTags() {
  try {
    const res = await tagAPI.getList()
    tags.value = res.data || []
  } catch { /* ignore */ }
}

onMounted(() => { fetchPosts(); fetchTags() })
</script>

<style scoped>
.page-wrapper { min-height: 100vh; background: var(--color-bg-primary); }

.filters { padding: 16px 20px; margin-bottom: 20px; }
.search-input { margin-bottom: 12px; }
.filter-bar { display: flex; justify-content: space-between; align-items: center; }
.category-tabs { display: flex; gap: 16px; }
.category-tabs span { font-size: 0.9rem; cursor: pointer; color: var(--color-text-secondary); padding: 4px 0; border-bottom: 2px solid transparent; transition: all 0.2s; }
.category-tabs span:hover { color: var(--color-text-primary); }
.category-tabs span.active { color: var(--color-accent); border-color: var(--color-accent); font-weight: 600; }
.sort-select { display: flex; gap: 12px; font-size: 0.85rem; }
.sort-select span { cursor: pointer; color: var(--color-text-secondary); }
.sort-select span.active { color: var(--color-accent); font-weight: 600; }

.post-list { display: flex; flex-direction: column; gap: 12px; }
.post-item { display: flex; justify-content: space-between; padding: 20px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
.post-item:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
.post-left { flex: 1; min-width: 0; }
.post-badges { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.pin-badge, .feature-badge { font-size: 0.75rem; }
.category-tag { font-size: 0.75rem; color: var(--color-green); background: rgba(46,92,76,0.1); padding: 2px 8px; border-radius: 4px; }
.post-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.post-summary { font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.post-meta { font-size: 0.8rem; color: var(--color-text-secondary); display: flex; gap: 12px; }
.post-stats { display: flex; flex-direction: column; gap: 4px; font-size: 0.8rem; color: var(--color-text-secondary); min-width: 60px; text-align: right; }

.sidebar { margin-top: 24px; padding: 20px; background: var(--glass-bg-card); border: var(--glass-border); border-radius: var(--border-radius); }
.sidebar-title { font-family: var(--font-title); font-size: 1rem; margin-bottom: 12px; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-item { font-size: 0.8rem; padding: 4px 10px; background: var(--color-bg-secondary); border-radius: 12px; cursor: pointer; transition: all 0.2s; }
.tag-item:hover, .tag-item.active { background: var(--color-accent-light); color: var(--color-accent); }

.empty-text { text-align: center; color: var(--color-text-secondary); padding: 40px; }
</style>
