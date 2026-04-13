<template>
  <div class="page-wrapper">
    <AppNavbar />
    <div class="page-content container" style="margin-top: var(--nav-height); padding-top: 24px;">
      <router-link to="/community" class="back-link">← 返回论道场</router-link>

      <div class="post-detail glass-card" v-if="post">
        <h1>{{ post.title }}</h1>
        <div class="post-meta">
          <span>📂 {{ categoryMap[post.category] }}</span>
          <span>👤 {{ post.author_name }}</span>
          <span v-if="post.author_badge" class="seal" :class="`seal--level-${Math.min(post.author_badge ? 3 : 1, 6)}`">{{ post.author_level }}</span>
          <span>{{ timeAgo(post.created_at) }}</span>
        </div>
        <div class="post-body">{{ post.content }}</div>
        <div class="post-actions">
          <el-button @click="toggleLike" :type="liked ? 'primary' : 'default'">
            👍 {{ post.like_count }}
          </el-button>
          <span>💬 {{ post.comment_count }}</span>
          <span>👁 {{ post.view_count }}</span>
        </div>
      </div>

      <!-- Comments -->
      <div class="section-block">
        <h3 class="section-title">高论 ({{ post?.comment_count || 0 }})</h3>

        <!-- Comment form -->
        <div v-if="userStore.isLoggedIn" class="comment-form card">
          <el-input v-model="commentContent" type="textarea" :rows="2" placeholder="说些什么..." />
          <div class="comment-form-footer">
            <el-checkbox v-model="commentAnonymous">🎭 匿名</el-checkbox>
            <el-button type="primary" size="small" @click="submitComment" :loading="commentLoading">发表</el-button>
          </div>
        </div>

        <!-- Comment list -->
        <div class="comment-list">
          <div v-for="c in comments" :key="c.id" class="comment-item">
            <div class="comment-main">
              <div class="comment-header">
                <strong>{{ c.author_name }}</strong>
                <span v-if="c.author_badge" class="seal seal--level-2" style="font-size:0.65rem; padding:1px 4px;">{{ c.author_level }}</span>
                <span class="comment-time">{{ timeAgo(c.created_at) }}</span>
              </div>
              <p class="comment-text">{{ c.content }}</p>
              <div class="comment-actions">
                <span @click="likeComment(c.id)">👍 {{ c.like_count }}</span>
                <span @click="replyTo(c)">回复</span>
              </div>
            </div>
            <!-- Nested replies could be added here -->
          </div>
          <p v-if="!comments.length" class="empty-text">暂无评论</p>
        </div>
      </div>
    </div>
    <AppFooter />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppNavbar from '@/components/AppNavbar.vue'
import AppFooter from '@/components/AppFooter.vue'
import { postAPI, commentAPI } from '@/api/community'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const route = useRoute()
const userStore = useUserStore()
const postId = parseInt(route.params.id, 10)
const categoryMap = { experience: '修习心得', question: '求学问路', resource: '典籍推荐', general: '杂谈' }

const post = ref(null)
const comments = ref([])
const liked = ref(false)
const commentContent = ref('')
const commentAnonymous = ref(false)
const commentLoading = ref(false)
const replyParent = ref(null)

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours}时辰前`
  return `${Math.floor(hours / 24)}日前`
}

async function fetchPost() {
  try {
    const res = await postAPI.getById(postId)
    post.value = res.data
  } catch (err) { ElMessage.error(err.message) }
}

async function fetchComments() {
  try {
    const res = await commentAPI.getList(postId, { pageSize: 100 })
    comments.value = res.data || []
  } catch { /* ignore */ }
}

async function toggleLike() {
  if (!userStore.isLoggedIn) return ElMessage.warning('请先登录')
  try {
    const res = await postAPI.like(postId)
    liked.value = res.data?.liked ?? !liked.value
    post.value.like_count += liked.value ? 1 : -1
  } catch (err) { ElMessage.error(err.message) }
}

async function likeComment(id) {
  if (!userStore.isLoggedIn) return ElMessage.warning('请先登录')
  try {
    await commentAPI.like(id)
    const c = comments.value.find(c => c.id === id)
    if (c) c.like_count += 1
  } catch { /* ignore */ }
}

function replyTo(comment) {
  replyParent.value = comment.id
  commentContent.value = `@${comment.author_name} `
}

async function submitComment() {
  if (!commentContent.value.trim()) return ElMessage.warning('请输入评论内容')
  commentLoading.value = true
  try {
    await commentAPI.create(postId, {
      content: commentContent.value,
      parentId: replyParent.value,
      isAnonymous: commentAnonymous.value
    })
    ElMessage.success('评论已提交，等待审核')
    commentContent.value = ''
    replyParent.value = null
    fetchComments()
  } catch (err) { ElMessage.error(err.message) }
  finally { commentLoading.value = false }
}

onMounted(() => { fetchPost(); fetchComments() })
</script>

<style scoped>
.page-wrapper { min-height: 100vh; background: var(--color-bg-primary); }
.back-link { color: var(--color-accent); text-decoration: none; display: inline-block; margin-bottom: 16px; }

.post-detail { padding: 32px; margin-bottom: 32px; }
.post-detail h1 { font-family: var(--font-title); font-size: 1.6rem; margin-bottom: 12px; }
.post-meta { display: flex; align-items: center; gap: 12px; font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 20px; }
.post-body { font-size: 1rem; line-height: 1.8; white-space: pre-wrap; margin-bottom: 20px; }
.post-actions { display: flex; align-items: center; gap: 16px; padding-top: 16px; border-top: 1px solid var(--color-border-light); font-size: 0.9rem; color: var(--color-text-secondary); }

.section-block { margin-bottom: 32px; }
.section-title { font-family: var(--font-title); font-size: 1.1rem; margin-bottom: 12px; padding-left: 8px; border-left: 3px solid var(--color-accent); }

.comment-form { padding: 16px; margin-bottom: 16px; }
.comment-form-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }

.comment-list { display: flex; flex-direction: column; gap: 12px; }
.comment-item { padding: 14px 0; border-bottom: 1px solid var(--color-border-light); }
.comment-header { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; margin-bottom: 6px; }
.comment-header strong { font-size: 0.9rem; }
.comment-time { color: var(--color-text-secondary); font-size: 0.8rem; }
.comment-text { font-size: 0.95rem; line-height: 1.6; margin-bottom: 6px; }
.comment-actions { display: flex; gap: 16px; font-size: 0.8rem; color: var(--color-text-secondary); }
.comment-actions span { cursor: pointer; }
.comment-actions span:hover { color: var(--color-accent); }
.empty-text { text-align: center; color: var(--color-text-secondary); padding: 20px; }
</style>
