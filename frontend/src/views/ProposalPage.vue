<template>
  <div class="page-wrapper theme-proposal">
    <div class="page-content container" style="margin-top: var(--nav-height); padding-top: 24px;">
      <BackButton fallback="/community">返回</BackButton>
      <!-- Create mode -->
      <template v-if="isCreate">
        <div class="page-header-decorated">
          <h2 class="page-title">提出修改</h2>
        </div>
        <div class="edit-form card">
          <p class="hint">为「{{ originalPost?.title }}」提出修改建议</p>
          <div class="form-group">
            <label>提案标题</label>
            <el-input v-model="form.title" placeholder="简述你的修改" maxlength="200" />
          </div>
          <div class="form-group">
            <label>修改说明</label>
            <el-input v-model="form.description" type="textarea" :rows="3" placeholder="说明你做了哪些修改，为什么需要这些修改" />
          </div>
          <div class="form-group">
            <label>修改后全文（Markdown）</label>
            <MarkdownEditor v-model="form.content" />
          </div>
          <div class="form-actions">
            <el-button @click="$router.back()">取消</el-button>
            <el-button type="primary" @click="submitProposal" :loading="submitting">提交提案</el-button>
          </div>
        </div>
      </template>

      <!-- View mode -->
      <template v-else-if="proposal">
        <div class="proposal-header glass-card">
          <div class="ph-top">
            <el-tag :type="statusTag(proposal.status)" size="small">{{ statusText(proposal.status) }}</el-tag>
            <h2 class="ph-title">{{ proposal.title }}</h2>
          </div>
          <p class="ph-meta">
            {{ proposal.proposer_name }} 提出于 {{ formatDate(proposal.created_at) }}
            · 基于 {{ proposal.base_version }} 版 · 文章「{{ proposal.post_title }}」
          </p>
          <p v-if="proposal.description" class="ph-desc">{{ proposal.description }}</p>
          <div v-if="proposal.status === 'merged'" class="ph-review">
            ✅ 已由作者合并 · {{ formatDate(proposal.reviewed_at) }}
          </div>
          <div v-if="proposal.status === 'rejected'" class="ph-review">
            ❌ 已被拒绝 · {{ formatDate(proposal.reviewed_at) }}
            <span v-if="proposal.review_comment">：{{ proposal.review_comment }}</span>
          </div>
          <!-- Actions for post author -->
          <div v-if="canReview" class="ph-actions">
            <el-button type="success" @click="doMerge" :loading="acting">合并提案</el-button>
            <el-button type="danger" @click="showReject = true" :loading="acting">拒绝</el-button>
          </div>
          <div v-if="canClose" class="ph-actions">
            <el-button @click="doClose" :loading="acting">关闭提案</el-button>
          </div>
        </div>

        <!-- Diff view -->
        <div class="diff-section">
          <h3 class="section-title">内容对比</h3>
          <div class="diff-grid">
            <div class="diff-pane">
              <div class="diff-pane-header">原文（v{{ proposal.base_version }}）</div>
              <MarkdownViewer :content="proposal.original_content" />
            </div>
            <div class="diff-pane">
              <div class="diff-pane-header">修改后</div>
              <MarkdownViewer :content="proposal.content" />
            </div>
          </div>
        </div>
      </template>

      <!-- Reject dialog -->
      <el-dialog v-model="showReject" title="拒绝提案" width="400px">
        <el-input v-model="rejectComment" type="textarea" :rows="3" placeholder="拒绝理由（可选）" />
        <template #footer>
          <el-button @click="showReject = false">取消</el-button>
          <el-button type="danger" @click="doReject">确认拒绝</el-button>
        </template>
      </el-dialog>
    </div>
    <AppFooter />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BackButton from '@/components/BackButton.vue'
import AppFooter from '@/components/AppFooter.vue'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import MarkdownViewer from '@/components/MarkdownViewer.vue'
import { postAPI, proposalAPI } from '@/api/community'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const isCreate = computed(() => !!route.params.postId)
const proposalId = computed(() => route.params.id)

const originalPost = ref(null)
const proposal = ref(null)
const submitting = ref(false)
const acting = ref(false)
const showReject = ref(false)
const rejectComment = ref('')

const form = ref({ title: '', description: '', content: '' })

const canReview = computed(() => {
  if (!proposal.value || !userStore.user) return false
  return proposal.value.status === 'open' && originalPost.value?.user_id === userStore.user.userId
})

const canClose = computed(() => {
  if (!proposal.value || !userStore.user) return false
  return proposal.value.status === 'open' && proposal.value.proposer_id === userStore.user.userId
})

function statusTag(s) {
  return { open: 'warning', merged: 'success', rejected: 'danger', closed: 'info' }[s] || 'info'
}
function statusText(s) {
  return { open: '待审核', merged: '已合并', rejected: '已拒绝', closed: '已关闭' }[s] || s
}
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '' }

onMounted(async () => {
  if (isCreate.value) {
    try {
      const res = await postAPI.getById(route.params.postId)
      originalPost.value = res.data
      form.value.title = res.data.title
      form.value.content = res.data.content
    } catch (err) {
      ElMessage.error('加载文章失败')
      router.back()
    }
  } else if (proposalId.value) {
    try {
      const res = await proposalAPI.getById(proposalId.value)
      proposal.value = res.data
      // Also fetch the post for canReview check
      const postRes = await postAPI.getById(res.data.post_id)
      originalPost.value = postRes.data
    } catch (err) {
      ElMessage.error('加载提案失败')
      router.back()
    }
  }
})

async function submitProposal() {
  if (!form.value.title.trim()) return ElMessage.warning('请输入提案标题')
  if (!form.value.content.trim()) return ElMessage.warning('请输入修改内容')
  submitting.value = true
  try {
    await proposalAPI.create({
      postId: parseInt(route.params.postId),
      title: form.value.title,
      description: form.value.description,
      content: form.value.content
    })
    ElMessage.success('提案已提交')
    router.push('/community/posts/' + route.params.postId)
  } catch (err) { ElMessage.error(err.message) }
  finally { submitting.value = false }
}

async function doMerge() {
  acting.value = true
  try {
    await proposalAPI.merge(proposalId.value)
    ElMessage.success('提案已合并，文章已更新')
    proposal.value.status = 'merged'
  } catch (err) { ElMessage.error(err.message) }
  finally { acting.value = false }
}

async function doReject() {
  acting.value = true
  try {
    await proposalAPI.reject(proposalId.value, { comment: rejectComment.value })
    ElMessage.success('提案已拒绝')
    proposal.value.status = 'rejected'
    showReject.value = false
  } catch (err) { ElMessage.error(err.message) }
  finally { acting.value = false }
}

async function doClose() {
  acting.value = true
  try {
    await proposalAPI.close(proposalId.value)
    ElMessage.success('提案已关闭')
    proposal.value.status = 'closed'
  } catch (err) { ElMessage.error(err.message) }
  finally { acting.value = false }
}
</script>

<style scoped>
.page-wrapper { min-height: 100vh; background: var(--color-bg-primary); }
.page-title { font-family: var(--font-title); font-size: 1.8rem; margin-bottom: 20px; text-align: center; }
.edit-form { padding: 28px; }
.hint { color: var(--color-text-secondary); margin-bottom: 16px; font-size: 0.9rem; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 0.9rem; color: var(--color-text-secondary); }
.form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }

.proposal-header { padding: 24px; margin-bottom: 24px; }
.ph-top { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.ph-title { font-family: var(--font-title); font-size: 1.4rem; }
.ph-meta { color: var(--color-text-secondary); font-size: 0.85rem; margin-bottom: 8px; }
.ph-desc { font-size: 0.9rem; color: var(--color-text-primary); margin: 12px 0; padding: 8px 12px; background: var(--color-bg-secondary); border-radius: 6px; }
.ph-review { margin-top: 12px; padding: 8px 12px; font-size: 0.9rem; background: var(--color-bg-secondary); border-radius: 6px; }
.ph-actions { margin-top: 16px; display: flex; gap: 12px; }

.section-title { font-family: var(--font-title); font-size: 1.1rem; margin-bottom: 12px; padding-left: 8px; border-left: 3px solid var(--color-accent); }
.diff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.diff-pane { border: 1px solid var(--color-border); border-radius: var(--border-radius-sm); overflow: hidden; }
.diff-pane-header { padding: 8px 16px; background: var(--color-bg-secondary); font-size: 0.85rem; font-weight: 600; color: var(--color-text-secondary); border-bottom: 1px solid var(--color-border); }
.diff-pane :deep(.md-viewer) { padding: 16px; max-height: 600px; overflow-y: auto; }

@media (max-width: 768px) {
  .diff-grid { grid-template-columns: 1fr; }
}
</style>
