<template>
  <div class="page-wrapper theme-post-detail">
    <AppNavbar />
    <div class="page-content container" style="margin-top: var(--nav-height); padding-top: 24px;">
      <BackButton fallback="/community">返回知识广场</BackButton>

      <AppLoading v-if="postLoading" type="detail" :count="1" />
      <div v-else-if="post" class="detail-layout">
        <!-- Main Content -->
        <div class="detail-main">
          <div class="detail-header">
            <div class="header-badges">
              <span class="category-tag">{{ categoryMap[post.category] }}</span>
              <span v-if="post.is_featured" class="feature-badge">⭐ 精华</span>
              <span class="version-badge">v{{ post.version }}</span>
            </div>
            <h1 class="detail-title">{{ post.title }}</h1>
            <div class="detail-meta">
              <span>{{ post.author_name }}</span>
              <button v-if="userStore.isLoggedIn && userStore.user?.userId !== post.user_id"
                class="follow-btn" :class="{ active: isFollowingAuthor }" @click="toggleFollowAuthor">
                {{ isFollowingAuthor ? '已关注' : '+ 关注' }}
              </button>
              <span>{{ timeAgo(post.created_at) }}</span>
              <span>👀 {{ post.view_count }}</span>
            </div>
          </div>

          <!-- Markdown Content -->
          <div class="detail-body">
            <MarkdownViewer :content="post.content" />
          </div>

          <!-- Action Bar -->
          <div class="action-bar">
            <button class="action-btn" :class="{ active: liked }" @click="toggleLike">
              ❤️ {{ post.like_count }}
            </button>
            <button class="action-btn" :class="{ active: bookmarked }" @click="toggleBookmark">
              ⭐ {{ bookmarked ? '已收藏' : '收藏' }}
            </button>
            <span class="action-btn">💬 {{ post.comment_count }}</span>
            <router-link v-if="userStore.isLoggedIn && userStore.user?.userId !== post.user_id"
              :to="'/community/proposals/create/' + post.id" class="action-btn proposal-btn">
              ✏️ 提出修改
            </router-link>
            <router-link v-if="userStore.user?.userId === post.user_id"
              :to="'/community/posts/' + post.id + '/edit'" class="action-btn">
              📝 编辑
            </router-link>
          </div>

          <!-- Comments -->
          <div class="comments-section">
            <h3 class="section-title">高论 ({{ post.comment_count }})</h3>
            <div v-if="userStore.isLoggedIn" class="comment-form">
              <div class="comment-input-wrap">
                <el-input v-model="commentContent" type="textarea" :rows="2" :maxlength="500" show-word-limit :placeholder="replyTo ? `回复 @${replyTo}...` : '写下你的高论...（输入 @ 提及用户）'" @keydown="onCommentKeydown" />
                <div v-if="mentionShow && mentionResults.length" class="mention-dropdown">
                  <div v-for="u in mentionResults" :key="u.id" class="mention-item" @mousedown.prevent="selectMention(u)">
                    <UserAvatar :avatar-url="u.avatar_url" :nickname="u.username" :size="24" />
                    <span class="mention-name">{{ u.username }}</span>
                  </div>
                </div>
              </div>
              <div class="comment-form-actions">
                <el-checkbox v-model="commentAnonymous">匿名</el-checkbox>
                <el-button size="small" @click="replyTo = null" v-if="replyTo">取消回复</el-button>
                <el-button size="small" type="primary" @click="submitComment" :loading="commentLoading">发表</el-button>
              </div>
            </div>
            <div class="comment-list">
              <div v-for="c in topLevelComments" :key="c.id" :id="'comment-' + c.id" class="comment-item">
                <div class="comment-body">
                  <span class="comment-author">{{ c.is_anonymous ? '匿名学子' : (c.author_name || '学子') }}</span>
                  <span class="comment-text" v-html="renderCommentContent(c)"></span>
                  <span class="comment-time">{{ timeAgo(c.created_at) }}</span>
                  <button class="comment-action" @click="likeComment(c)">❤️ {{ c.like_count }}</button>
                  <button v-if="userStore.isLoggedIn" class="comment-action" @click="setReply(c, c)">回复</button>
                </div>
                <!-- Nested replies -->
                <div v-for="r in getReplies(c.id)" :key="r.id" class="comment-reply">
                  <span class="comment-author">{{ r.is_anonymous ? '匿名学子' : (r.author_name || '学子') }}</span>
                  <span class="comment-text" v-html="renderCommentContent(r)"></span>
                  <span class="comment-time">{{ timeAgo(r.created_at) }}</span>
                  <button v-if="userStore.isLoggedIn" class="comment-action" @click="setReply(r, c)">回复</button>
                </div>
              </div>
              <p v-if="!comments.length" class="empty-text">暂无评论</p>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="detail-sidebar">
          <!-- Proposals -->
          <div class="sidebar-block card" v-if="proposals.length">
            <h4 class="sb-title">编辑提案</h4>
            <div v-for="p in proposals" :key="p.id" class="proposal-item" @click="$router.push('/community/proposals/' + p.id)">
              <el-tag :type="p.status === 'open' ? 'warning' : 'success'" size="small">
                {{ p.status === 'open' ? '待审核' : p.status === 'merged' ? '已合并' : p.status }}
              </el-tag>
              <span class="proposal-name">{{ p.title }}</span>
              <span class="proposal-meta">{{ p.proposer_name }}</span>
            </div>
          </div>

          <!-- Version History -->
          <div class="sidebar-block card" v-if="versions.length">
            <h4 class="sb-title">版本历史</h4>
            <div v-for="v in versions" :key="v.version" class="version-item" @click="viewVersion(v)">
              <div class="ver-row">
                <span class="ver-badge" :class="{ 'ver-current': v.version === post.version }">v{{ v.version }}</span>
                <span class="ver-summary">{{ v.edit_summary }}</span>
              </div>
              <span class="ver-meta">{{ v.editor_name }} · {{ timeAgo(v.created_at) }}</span>
            </div>
          </div>

          <!-- Tags -->
          <div class="sidebar-block card" v-if="post.tags && post.tags.length">
            <h4 class="sb-title">标签</h4>
            <div class="tag-list">
              <span v-for="t in post.tags" :key="t.id" class="sidebar-tag">{{ t.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <AppFooter />

    <!-- Version View Dialog -->
    <el-dialog v-model="showVersionDialog" :title="`v${viewingVersion?.version} — ${viewingVersion?.edit_summary || ''}`" width="700px" top="5vh">
      <div v-if="viewingVersion" class="version-dialog-content">
        <div class="vd-header">
          <span class="vd-title">{{ viewingVersion.title }}</span>
          <span class="vd-meta">{{ viewingVersion.editor_name }} · {{ formatDate(viewingVersion.created_at) }}</span>
        </div>
        <div class="vd-body">
          <MarkdownViewer :content="viewingVersion.content" />
        </div>
      </div>
      <template #footer>
        <el-button @click="showVersionDialog = false">关闭</el-button>
        <el-button v-if="diffTarget" @click="openDiff">对比差异</el-button>
        <el-button v-if="canRollback" type="primary" @click="doRollback" :loading="rollbackLoading">
          回滚到此版本
        </el-button>
      </template>
    </el-dialog>

    <!-- Diff Dialog -->
    <el-dialog v-model="showDiffDialog" title="版本对比" width="900px" top="5vh">
      <div v-if="diffData" class="diff-container">
        <div class="diff-headers">
          <span class="diff-h left">v{{ diffData.leftVer }}</span>
          <span class="diff-h right">v{{ diffData.rightVer }} (当前)</span>
        </div>
        <div class="diff-body">
          <div v-for="(line, i) in diffData.lines" :key="i" class="diff-line" :class="line.type">
            <span class="dl-marker">{{ line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ' }}</span>
            <span class="dl-text">{{ line.text }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showDiffDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute } from 'vue-router'
import AppNavbar from '@/components/AppNavbar.vue'
import AppFooter from '@/components/AppFooter.vue'
import MarkdownViewer from '@/components/MarkdownViewer.vue'
import BackButton from '@/components/BackButton.vue'
import AppLoading from '@/components/AppLoading.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { postAPI, commentAPI, proposalAPI, bookmarkAPI } from '@/api/community'
import { followAPI } from '@/api/follow'
import { friendAPI } from '@/api/friend'
import { useUserStore } from '@/stores/user'
import { useTimeAgo } from '@/composables/useTimeAgo'

const route = useRoute()
const userStore = useUserStore()
const postId = route.params.id

const post = ref(null)
const postLoading = ref(true)
const comments = ref([])
const proposals = ref([])
const versions = ref([])
const liked = ref(false)
const bookmarked = ref(false)
const commentContent = ref('')
const commentAnonymous = ref(false)
const commentLoading = ref(false)
const replyTo = ref(null)
const replyParentId = ref(null)
const isFollowingAuthor = ref(false)

// Version control
const showVersionDialog = ref(false)
const viewingVersion = ref(null)
const diffTarget = ref(null)
const showDiffDialog = ref(false)
const diffData = ref(null)
const rollbackLoading = ref(false)

// Mention autocomplete state
const mentionShow = ref(false)
const mentionResults = ref([])
const mentionIndex = ref(-1)
let mentionQuery = ''
let mentionTimer = null

const canRollback = computed(() => {
  if (!post.value || !viewingVersion.value) return false
  return viewingVersion.value.version !== post.value.version &&
    userStore.user?.userId === post.value.user_id
})

const categoryMap = { experience: '修习心得', question: '求学问路', resource: '典籍推荐', general: '杂谈' }

const topLevelComments = computed(() => comments.value.filter(c => !c.parent_id))

function getReplies(parentId) { return comments.value.filter(c => c.parent_id === parentId) }

function setReply(target, parent) {
  replyTo.value = target.is_anonymous ? '匿名学子' : (target.author_name || '学子')
  replyParentId.value = parent.id
}

const { timeAgo } = useTimeAgo()

async function fetchPost() {
  postLoading.value = true
  try {
    const res = await postAPI.getById(postId)
    post.value = res.data
  } catch (err) { ElMessage.error('文章不存在') }
  finally { postLoading.value = false }

  if (userStore.isLoggedIn && post.value && userStore.user?.userId !== post.value.user_id) {
    try {
      const res = await followAPI.check(post.value.user_id)
      isFollowingAuthor.value = res.data?.following || false
    } catch { /* ignore */ }
  }
}

async function fetchComments() {
  try {
    const res = await commentAPI.getList(postId, { pageSize: 50 })
    comments.value = res.data || []
  } catch { /* ignore */ }
}

async function fetchProposals() {
  try {
    const res = await proposalAPI.getList({ postId, status: 'open', pageSize: 10 })
    proposals.value = res.data || []
  } catch { /* ignore */ }
}

async function fetchVersions() {
  try {
    const res = await postAPI.getVersions(postId)
    versions.value = res.data || []
  } catch { /* ignore */ }
}

function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '' }

async function viewVersion(v) {
  try {
    const res = await postAPI.getVersion(postId, v.version)
    viewingVersion.value = res.data
    diffTarget.value = v.version !== post.value.version ? v.version : null
    showVersionDialog.value = true
  } catch { ElMessage.error('无法加载版本') }
}

async function openDiff() {
  if (!diffTarget.value) return
  try {
    const [oldRes, curRes] = await Promise.all([
      postAPI.getVersion(postId, diffTarget.value),
      postAPI.getVersion(postId, post.value.version)
    ])
    const oldLines = (oldRes.data.content || '').split('\n')
    const curLines = (curRes.data.content || '').split('\n')
    diffData.value = {
      leftVer: diffTarget.value,
      rightVer: post.value.version,
      lines: computeDiff(oldLines, curLines)
    }
    showDiffDialog.value = true
  } catch { ElMessage.error('无法加载对比数据') }
}

function computeDiff(oldLines, newLines) {
  const result = []
  const maxLen = Math.max(oldLines.length, newLines.length)
  for (let i = 0; i < maxLen; i++) {
    const o = oldLines[i]
    const n = newLines[i]
    if (o === undefined) {
      result.push({ type: 'add', text: n })
    } else if (n === undefined) {
      result.push({ type: 'remove', text: o })
    } else if (o === n) {
      result.push({ type: 'same', text: n })
    } else {
      result.push({ type: 'remove', text: o })
      result.push({ type: 'add', text: n })
    }
  }
  return result
}

async function doRollback() {
  try {
    await ElMessageBox.confirm(
      `确认将文章回滚至 v${viewingVersion.value.version}？这将创建一个新版本。`,
      '回滚确认',
      { type: 'warning' }
    )
  } catch { return }
  rollbackLoading.value = true
  try {
    await postAPI.rollbackVersion(postId, viewingVersion.value.version)
    ElMessage.success('已回滚')
    showVersionDialog.value = false
    fetchPost()
    fetchVersions()
  } catch (err) { ElMessage.error(err.message) }
  finally { rollbackLoading.value = false }
}

async function toggleLike() {
  if (!userStore.isLoggedIn) return ElMessage.warning('请先登录')
  try {
    const res = await postAPI.like(postId)
    liked.value = res.data.liked
    post.value.like_count += res.data.liked ? 1 : -1
  } catch (err) { ElMessage.error(err.message) }
}

async function toggleBookmark() {
  if (!userStore.isLoggedIn) return ElMessage.warning('请先登录')
  try {
    const res = await bookmarkAPI.toggle(postId)
    bookmarked.value = res.data.bookmarked
    ElMessage.success(res.data.bookmarked ? '已收藏' : '已取消收藏')
  } catch (err) { ElMessage.error(err.message) }
}

async function submitComment() {
  if (!commentContent.value.trim()) return
  commentLoading.value = true
  try {
    await commentAPI.create(postId, {
      content: commentContent.value,
      isAnonymous: commentAnonymous.value,
      parentId: replyParentId.value
    })
    ElMessage.success('评论发表成功')
    commentContent.value = ''
    replyTo.value = null
    replyParentId.value = null
    fetchComments()
    fetchPost()
  } catch (err) { ElMessage.error(err.message) }
  finally { commentLoading.value = false }
}

async function likeComment(c) {
  if (!userStore.isLoggedIn) return
  try {
    await commentAPI.like(c.id)
    c.liked = !c.liked
    c.like_count += c.liked ? 1 : -1
  } catch { /* ignore */ }
}

async function toggleFollowAuthor() {
  if (!post.value) return
  try {
    const res = await followAPI.toggle(post.value.user_id)
    isFollowingAuthor.value = res.data?.following || false
  } catch (err) { ElMessage.error(err.message) }
}

// @mention autocomplete
let friendsCache = null

async function loadFriends() {
  if (friendsCache) return friendsCache
  try {
    const res = await friendAPI.getFriends({ pageSize: 100 })
    friendsCache = (res.data || []).map(f => ({
      id: f.friend_id,
      username: f.friend_name || f.username,
      avatar_url: f.friend_avatar || f.avatar_url
    }))
    return friendsCache
  } catch { return [] }
}

function onCommentKeydown(e) {
  if (mentionShow.value && mentionResults.value.length) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      mentionIndex.value = (mentionIndex.value + 1) % mentionResults.value.length
      return
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      mentionIndex.value = mentionIndex.value <= 0 ? mentionResults.value.length - 1 : mentionIndex.value - 1
      return
    } else if (e.key === 'Enter' && mentionIndex.value >= 0) {
      e.preventDefault()
      selectMention(mentionResults.value[mentionIndex.value])
      return
    } else if (e.key === 'Escape') {
      mentionShow.value = false
      return
    }
  }
  if (e.key === '@') {
    setTimeout(() => triggerMentionSearch(), 0)
  }
}

async function triggerMentionSearch() {
  const text = commentContent.value
  const before = text.slice(0, text.length)
  const atIdx = before.lastIndexOf('@')
  if (atIdx < 0) { mentionShow.value = false; return }
  mentionQuery = before.slice(atIdx + 1)
  if (mentionQuery.includes(' ') || mentionQuery.includes('\n')) {
    mentionShow.value = false; return
  }
  clearTimeout(mentionTimer)
  mentionTimer = setTimeout(async () => {
    const friends = await loadFriends()
    if (mentionQuery) {
      const q = mentionQuery.toLowerCase()
      const filtered = friends.filter(f => f.username.toLowerCase().includes(q)).slice(0, 6)
      if (filtered.length) {
        mentionResults.value = filtered
      } else {
        // No friend match, search all users
        try {
          const res = await friendAPI.searchUsers(mentionQuery, 1)
          mentionResults.value = (res.data || []).slice(0, 6)
        } catch { mentionResults.value = [] }
      }
    } else {
      // No query yet — show friends
      mentionResults.value = friends.slice(0, 6)
    }
    mentionIndex.value = -1
    mentionShow.value = mentionResults.value.length > 0
  }, 150)
}

function selectMention(user) {
  const text = commentContent.value
  const atIdx = text.lastIndexOf('@')
  if (atIdx >= 0) {
    commentContent.value = text.slice(0, atIdx) + '@' + user.username + ' ' + text.slice(text.length)
  }
  mentionShow.value = false
  mentionResults.value = []
}

watch(commentContent, () => {
  if (commentContent.value.includes('@')) {
    triggerMentionSearch()
  } else {
    mentionShow.value = false
  }
})

// Render @username in comments as clickable links
function renderCommentContent(comment) {
  if (comment.is_anonymous) return escapeHtml(comment.content)
  const mentionedUsers = comment.mentionedUsers || []
  const userMap = new Map(mentionedUsers.map(u => [u.username, u.userId]))
  let text = escapeHtml(comment.content)
  text = text.replace(/@([\w\u4e00-\u9fff]+)/g, (match, username) => {
    const userId = userMap.get(username)
    if (userId) {
      return `<a href="/user/${userId}" class="mention-link" onclick="event.stopPropagation()">@${username}</a>`
    }
    return match
  })
  return text
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

onMounted(async () => {
  await fetchPost()
  await fetchComments()
  fetchProposals()
  fetchVersions()
  // Scroll to comment anchor if present
  if (route.hash) {
    nextTick(() => {
      const el = document.querySelector(route.hash)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }
})

onUnmounted(() => {
  clearTimeout(mentionTimer)
})
</script>

<style scoped>
.page-wrapper { min-height: 100vh; background: var(--color-bg-primary); }

.detail-layout { display: flex; gap: 24px; }
.detail-main { flex: 1; min-width: 0; padding: 24px; }
.detail-sidebar { width: 280px; flex-shrink: 0; }

.detail-header { margin-bottom: 24px; }
.header-badges { display: flex; gap: 8px; margin-bottom: 8px; }
.category-tag { font-size: 0.75rem; color: var(--color-green); background: rgba(46,92,76,0.1); padding: 2px 8px; border-radius: 4px; }
.feature-badge { font-size: 0.75rem; }
.version-badge { font-size: 0.75rem; color: var(--color-blue); background: rgba(74,107,138,0.1); padding: 2px 8px; border-radius: 4px; font-family: var(--font-mono); }
.detail-title { font-family: var(--font-title); font-size: 2rem; margin-bottom: 12px; }
.detail-meta { font-size: 0.85rem; color: var(--color-text-secondary); display: flex; gap: 16px; align-items: center; }

.follow-btn { padding: 2px 12px; border-radius: 12px; font-size: 0.78rem; cursor: pointer; transition: all 0.2s; border: 1px solid var(--color-accent); color: var(--color-accent); background: transparent; font-family: var(--font-body); }
.follow-btn:hover { background: var(--color-accent-light); }
.follow-btn.active { background: var(--color-bg-secondary); border-color: var(--color-border); color: var(--color-text-secondary); }

.detail-body { margin-bottom: 24px; background: rgba(46, 92, 76, 0.06); border: 1px solid rgba(46, 92, 76, 0.15); border-radius: var(--border-radius); padding: 20px; }

.action-bar { display: flex; gap: 16px; padding: 14px 16px; margin-bottom: 24px; background: rgba(74, 107, 138, 0.06); border: 1px solid rgba(74, 107, 138, 0.15); border-radius: var(--border-radius); }
.action-btn { background: none; border: 1px solid var(--color-border); padding: 6px 14px; border-radius: 20px; cursor: pointer; font-size: 0.85rem; color: var(--color-text-secondary); transition: all 0.2s; text-decoration: none; }
.action-btn:hover { border-color: var(--color-accent); color: var(--color-accent); }
.action-btn.active { background: var(--color-accent-light); color: var(--color-accent); border-color: var(--color-accent); }
.proposal-btn { background: var(--color-accent); color: #fff !important; border-color: var(--color-accent); }
.proposal-btn:hover { opacity: 0.9; }

.comments-section { background: rgba(139, 37, 0, 0.04); border: 1px solid rgba(139, 37, 0, 0.12); border-radius: var(--border-radius); padding: 20px; }
.section-title { font-family: var(--font-title); font-size: 1.1rem; margin-bottom: 16px; padding-left: 8px; border-left: 3px solid var(--color-accent); }

.comment-form { margin-bottom: 20px; }
.comment-input-wrap { position: relative; }
.comment-form-actions { display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-top: 8px; }

.mention-dropdown { position: absolute; bottom: 100%; left: 0; right: 0; background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--border-radius-sm); box-shadow: 0 4px 12px rgba(0,0,0,0.12); z-index: 100; max-height: 200px; overflow-y: auto; }
.mention-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; font-size: 0.85rem; }
.mention-item:hover { background: var(--color-accent-light); }
.mention-name { font-weight: 500; }
:deep(.mention-link) { color: var(--color-accent); font-weight: 600; text-decoration: none; background: var(--color-accent-light); padding: 1px 4px; border-radius: 3px; cursor: pointer; }
:deep(.mention-link:hover) { text-decoration: underline; }

.comment-list { display: flex; flex-direction: column; gap: 4px; }
.comment-item { padding: 12px; border-radius: 6px; background: rgba(255,255,252,0.6); border: 1px solid rgba(196, 185, 154, 0.3); }
.comment-body { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.comment-author { font-weight: 600; font-size: 0.85rem; }
.comment-text { flex: 1; font-size: 0.9rem; }
.comment-time { font-size: 0.75rem; color: var(--color-text-secondary); }
.comment-action { background: none; border: none; cursor: pointer; font-size: 0.8rem; color: var(--color-text-secondary); }
.comment-action:hover { color: var(--color-accent); }
.comment-reply { margin-left: 32px; padding: 8px 12px; font-size: 0.85rem; display: flex; gap: 8px; border-left: 2px solid var(--color-border); }

.sidebar-block { padding: 16px; margin-bottom: 16px; }
.sb-title { font-family: var(--font-title); font-size: 0.95rem; margin-bottom: 12px; }

.proposal-item { padding: 8px 0; border-bottom: 1px solid var(--color-border-light); cursor: pointer; }
.proposal-item:hover { background: var(--color-accent-light); }
.proposal-item:last-child { border-bottom: none; }
.proposal-name { display: block; font-size: 0.85rem; font-weight: 500; margin: 4px 0 2px; }
.proposal-meta { font-size: 0.75rem; color: var(--color-text-secondary); }

.version-item { padding: 6px 0; border-bottom: 1px solid var(--color-border-light); cursor: pointer; transition: background 0.15s; border-radius: 4px; }
.version-item:hover { background: var(--color-bg-secondary); }
.version-item:last-child { border-bottom: none; }
.ver-row { display: flex; align-items: center; gap: 6px; }
.ver-badge { font-family: var(--font-mono); font-size: 0.75rem; color: var(--color-blue); background: rgba(74,107,138,0.1); padding: 1px 6px; border-radius: 3px; }
.ver-badge.ver-current { color: var(--color-green); background: rgba(46,92,76,0.12); }
.ver-summary { font-size: 0.85rem; }
.ver-meta { display: block; font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 2px; }

/* Version Dialog */
.version-dialog-content { max-height: 60vh; overflow-y: auto; }
.vd-header { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--color-border-light); }
.vd-title { display: block; font-family: var(--font-title); font-size: 1.2rem; font-weight: 600; margin-bottom: 4px; }
.vd-meta { font-size: 0.8rem; color: var(--color-text-secondary); }
.vd-body { line-height: 1.8; }

/* Diff */
.diff-container { max-height: 60vh; overflow-y: auto; }
.diff-headers { display: flex; border-bottom: 2px solid var(--color-border); margin-bottom: 8px; }
.diff-h { flex: 1; padding: 8px 12px; font-family: var(--font-mono); font-size: 0.85rem; font-weight: 600; }
.diff-h.left { color: var(--color-accent); }
.diff-h.right { color: var(--color-green); }
.diff-body { font-family: var(--font-mono); font-size: 0.82rem; }
.diff-line { display: flex; min-height: 22px; line-height: 22px; }
.diff-line.add { background: rgba(46,92,76,0.08); }
.diff-line.remove { background: rgba(139,37,0,0.06); }
.dl-marker { width: 20px; text-align: center; flex-shrink: 0; color: var(--color-text-secondary); }
.diff-line.add .dl-marker { color: var(--color-green); }
.diff-line.remove .dl-marker { color: var(--color-accent); }
.dl-text { flex: 1; white-space: pre-wrap; word-break: break-all; }

.tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
.sidebar-tag { font-size: 0.8rem; padding: 3px 10px; background: var(--color-bg-secondary); border-radius: 12px; }

.empty-text { text-align: center; color: var(--color-text-secondary); padding: 20px; font-size: 0.9rem; }

@media (max-width: 768px) {
  .detail-layout { flex-direction: column; }
  .detail-sidebar { width: 100%; }
}
</style>
