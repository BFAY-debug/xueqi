<template>
  <div class="page-wrapper">
    <AppNavbar />
    <div class="page-content container" style="margin-top: var(--nav-height); padding-top: 24px;">
      <router-link to="/books" class="back-link">← 返回书海</router-link>

      <div class="book-detail glass-card" v-if="book">
        <div class="detail-layout">
          <div class="detail-cover">
            <img v-if="book.cover_url" :src="book.cover_url" :alt="book.title" />
            <div v-else class="cover-placeholder">📖</div>
          </div>
          <div class="detail-info">
            <h1>{{ book.title }}</h1>
            <p class="meta">{{ [book.author, book.publisher, book.publish_year].filter(Boolean).join(' · ') }}</p>
            <p class="meta" v-if="book.isbn">ISBN: {{ book.isbn }}</p>
            <div class="rating-section">
              <span class="stars">{{ '★'.repeat(myRating || Math.round(book.avg_rating || 0)) }}{{ '☆'.repeat(5 - (myRating || Math.round(book.avg_rating || 0))) }}</span>
              <span class="rating-num">{{ book.avg_rating?.toFixed(1) || '-' }} ({{ book.rating_count }} 人评)</span>
            </div>
            <div class="detail-tags" v-if="book.courses?.length">
              <span v-for="c in book.courses" :key="c" class="tag">{{ c }}</span>
            </div>
            <p class="description">{{ book.description || '暂无简介' }}</p>
            <div class="detail-actions">
              <el-button v-if="userStore.isLoggedIn" @click="toggleCollect">
                {{ collected ? '取消收藏' : '收藏' }}
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Rate -->
      <div class="section-block" v-if="userStore.isLoggedIn">
        <h3 class="section-title">写评分</h3>
        <div class="rate-form card">
          <el-rate v-model="myRating" :colors="['#B8860B','#B8860B','#B8860B']" size="large" />
          <el-input v-model="myReview" type="textarea" :rows="3" placeholder="写下你的书评（30字以上可获额外积分）" style="margin-top:12px" />
          <el-button type="primary" @click="submitRating" style="margin-top:12px" :loading="ratingLoading">提交评分</el-button>
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
import { bookAPI } from '@/api/study'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const route = useRoute()
const userStore = useUserStore()
const bookId = parseInt(route.params.id, 10)

const book = ref(null)
const collected = ref(false)
const myRating = ref(0)
const myReview = ref('')
const ratingLoading = ref(false)

async function fetchBook() {
  try {
    const res = await bookAPI.getById(bookId)
    book.value = res.data
  } catch (err) { ElMessage.error(err.message) }
}

async function toggleCollect() {
  try {
    const res = collected.value ? await bookAPI.uncollect(bookId) : await bookAPI.collect(bookId)
    collected.value = res.data?.collected ?? !collected.value
    ElMessage.success(collected.value ? '已收藏' : '已取消收藏')
  } catch (err) { ElMessage.error(err.message) }
}

async function submitRating() {
  if (!myRating.value) return ElMessage.warning('请选择评分')
  ratingLoading.value = true
  try {
    await bookAPI.rate(bookId, { rating: myRating.value, review: myReview.value })
    ElMessage.success('评分成功')
    await fetchBook()
  } catch (err) { ElMessage.error(err.message) }
  finally { ratingLoading.value = false }
}

onMounted(fetchBook)
</script>

<style scoped>
.page-wrapper { min-height: 100vh; background: var(--color-bg-primary); }
.back-link { color: var(--color-accent); text-decoration: none; display: inline-block; margin-bottom: 16px; }

.book-detail { padding: 32px; margin-bottom: 32px; }
.detail-layout { display: flex; gap: 32px; }
.detail-cover { flex: 0 0 200px; height: 280px; background: var(--color-bg-secondary); border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.detail-cover img { width: 100%; height: 100%; object-fit: cover; }
.cover-placeholder { font-size: 4rem; }
.detail-info { flex: 1; }
.detail-info h1 { font-family: var(--font-title); font-size: 1.8rem; margin-bottom: 8px; }
.meta { font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 4px; }
.rating-section { margin: 12px 0; }
.stars { color: var(--color-gold); font-size: 1.2rem; }
.rating-num { font-size: 0.9rem; color: var(--color-text-secondary); margin-left: 8px; }
.detail-tags { display: flex; gap: 8px; margin-bottom: 12px; }
.tag { padding: 2px 10px; font-size: 0.8rem; background: rgba(74,107,138,0.1); color: var(--color-blue); border-radius: 4px; }
.description { font-size: 0.95rem; line-height: 1.7; margin-bottom: 16px; }
.detail-actions { display: flex; gap: 12px; }

.section-block { margin-bottom: 32px; }
.section-title { font-family: var(--font-title); font-size: 1.1rem; margin-bottom: 12px; padding-left: 8px; border-left: 3px solid var(--color-accent); }
.rate-form { padding: 20px; }

@media (max-width: 768px) {
  .detail-layout { flex-direction: column; }
  .detail-cover { flex: none; height: 200px; }
}
</style>
