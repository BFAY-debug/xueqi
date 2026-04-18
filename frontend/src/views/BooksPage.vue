<template>
  <div class="page-wrapper theme-books">
    <AppNavbar />
    <div class="page-content container" style="margin-top: var(--nav-height); padding-top: 24px;">
      <BackButton />
      <div class="page-header-decorated">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 class="page-title">📚 书海</h2>
            <p class="page-subtitle">读万卷书，行万里路</p>
          </div>
          <el-button v-if="userStore.isLoggedIn" type="primary" @click="showSubmit = true">+ 推荐书籍</el-button>
        </div>
      </div>

      <!-- Search -->
      <div class="search-bar">
        <el-input v-model="search" placeholder="搜索书名、作者、ISBN..." size="large" clearable @keyup.enter="fetchBooks">
          <template #append><el-button @click="fetchBooks">搜索</el-button></template>
        </el-input>
      </div>

      <div class="books-layout">
        <!-- Sidebar -->
        <div class="books-sidebar">
          <h4>分类</h4>
          <div class="category-list">
            <span v-for="cat in categories" :key="cat" class="category-tag" :class="{ active: category === cat }" @click="category = cat; fetchBooks()">
              {{ cat }}
            </span>
          </div>
          <h4 style="margin-top:20px">排序</h4>
          <el-radio-group v-model="sort" @change="fetchBooks" size="small">
            <el-radio-button value="newest">最新</el-radio-button>
            <el-radio-button value="rating">评分</el-radio-button>
          </el-radio-group>
        </div>

        <!-- Book Grid -->
        <div class="books-main">
          <AppLoading v-if="loading" type="card" :count="6" />
          <div class="book-grid" v-else-if="books.length">
            <div v-for="book in books" :key="book.id" class="book-card card" @click="$router.push(`/books/${book.id}`)">
              <div class="book-cover">
                <img v-if="book.cover_url" :src="book.cover_url" :alt="book.title" />
                <div v-else class="cover-placeholder">📖</div>
              </div>
              <div class="book-info">
                <h3 class="book-title">{{ book.title }}</h3>
                <p class="book-author">{{ book.author }}</p>
                <div class="book-rating">
                  <span class="stars">{{ '★'.repeat(Math.round(book.avg_rating || 0)) }}{{ '☆'.repeat(5 - Math.round(book.avg_rating || 0)) }}</span>
                  <span class="rating-num">{{ book.avg_rating?.toFixed(1) || '-' }}</span>
                </div>
              </div>
            </div>
          </div>
          <AppEmpty v-else text="暂无书籍" />
          <el-pagination v-if="total > pageSize" layout="prev, pager, next" :total="total" :page-size="pageSize" v-model:current-page="page" @current-change="fetchBooks" class="pagination" />
        </div>
      </div>
    </div>

    <!-- Submit Dialog -->
    <el-dialog v-model="showSubmit" title="推荐书籍" width="500px">
      <el-form :model="submitForm" label-width="80px">
        <el-form-item label="书名"><el-input v-model="submitForm.title" /></el-form-item>
        <el-form-item label="作者"><el-input v-model="submitForm.author" /></el-form-item>
        <el-form-item label="ISBN"><el-input v-model="submitForm.isbn" /></el-form-item>
        <el-form-item label="分类"><el-input v-model="submitForm.category" /></el-form-item>
        <el-form-item label="简介"><el-input v-model="submitForm.description" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSubmit = false">取消</el-button>
        <el-button type="primary" @click="submitBook" :loading="submitting">提交推荐</el-button>
      </template>
    </el-dialog>

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
import { bookAPI } from '@/api/study'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const books = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 12
const search = ref('')
const category = ref('')
const sort = ref('newest')
const loading = ref(false)
const categories = ['计算机科学', '数学', '文学', '历史', '哲学']

const showSubmit = ref(false)
const submitting = ref(false)
const submitForm = ref({ title: '', author: '', isbn: '', category: '', description: '' })

async function fetchBooks() {
  loading.value = true
  try {
    const res = await bookAPI.getList({ page: page.value, pageSize, search: search.value, category: category.value, sort: sort.value })
    books.value = res.data || []
    total.value = res.pagination?.total || 0
  } catch { /* ignore */ }
  finally { loading.value = false }
}

async function submitBook() {
  if (!submitForm.value.title) return ElMessage.warning('请填写书名')
  submitting.value = true
  try {
    await bookAPI.submit(submitForm.value)
    ElMessage.success('推荐已提交，等待审核')
    showSubmit.value = false
    submitForm.value = { title: '', author: '', isbn: '', category: '', description: '' }
    fetchBooks()
  } catch (err) { ElMessage.error(err.message) }
  finally { submitting.value = false }
}

onMounted(fetchBooks)
</script>

<style scoped>
.page-wrapper { min-height: 100vh; background: var(--color-bg-primary); }
.page-title { font-family: var(--font-title); font-size: 1.8rem; }
.books-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }

.search-bar { margin-bottom: 24px; max-width: 600px; }

.books-layout { display: flex; gap: 24px; }
.books-sidebar { flex: 0 0 180px; }
.books-sidebar h4 { font-family: var(--font-title); font-size: 0.95rem; margin-bottom: 8px; color: var(--color-text-secondary); }
.category-list { display: flex; flex-direction: column; gap: 6px; }
.category-tag { padding: 4px 12px; font-size: 0.85rem; cursor: pointer; border-radius: 4px; transition: all 0.2s; }
.category-tag:hover { background: var(--color-accent-light); }
.category-tag.active { background: var(--color-accent); color: #fff; }

.books-main { flex: 1; }
.book-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
.book-card { overflow: hidden; cursor: pointer; transition: transform 0.2s; }
.book-card:hover { transform: translateY(-4px); }
.book-cover { height: 200px; background: var(--color-bg-secondary); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.book-cover img { width: 100%; height: 100%; object-fit: cover; }
.cover-placeholder { font-size: 3rem; }
.book-info { padding: 12px; }
.book-title { font-size: 0.95rem; font-weight: 600; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.book-author { font-size: 0.8rem; color: var(--color-text-secondary); margin-bottom: 6px; }
.book-rating .stars { color: var(--color-gold); font-size: 0.85rem; }
.rating-num { font-size: 0.8rem; color: var(--color-text-secondary); margin-left: 4px; }
.empty-text { text-align: center; color: var(--color-text-secondary); padding: 40px; }
.pagination { margin-top: 24px; display: flex; justify-content: center; }

@media (max-width: 768px) {
  .books-layout { flex-direction: column; }
  .books-sidebar { flex: none; }
  .category-list { flex-direction: row; flex-wrap: wrap; }
}
</style>
