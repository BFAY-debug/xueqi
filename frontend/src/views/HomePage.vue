<template>
  <div class="home">
    <AppNavbar />

    <!-- Section 1: Hero -->
    <section class="hero-section">
      <!-- Three distinct mountain layers -->
      <div class="hero-bg">
        <img src="@/assets/textures/ink-mountains-far.svg" class="mountain-layer far" alt="" />
        <div class="cloud-layer cloud-1"><img src="@/assets/textures/ink-clouds.svg" alt="" /></div>
        <img src="@/assets/textures/ink-mountains-mid.svg" class="mountain-layer mid" alt="" />
        <div class="cloud-layer cloud-2"><img src="@/assets/textures/ink-clouds.svg" alt="" /></div>
        <img src="@/assets/textures/ink-mountains-near.svg" class="mountain-layer near" alt="" />
      </div>
      <!-- Floating ink dots -->
      <div class="ink-particles">
        <span v-for="n in 8" :key="n" class="ink-dot" :class="`ink-dot--${n}`"></span>
      </div>
      <!-- Bottom gradient fade -->
      <div class="hero-fade"></div>
      <!-- Decorative seal stamp -->
      <div class="hero-seal">学</div>
      <!-- Content -->
      <div class="hero-content">
        <template v-if="userStore.isLoggedIn && userStore.user">
          <h1 class="hero-greeting" ref="heroTitle">欢迎回来，{{ userStore.user.nickname }}</h1>
          <p class="hero-subtitle" ref="heroSubtitle">学而时习之，不亦说乎</p>
          <div class="hero-actions" ref="heroActions">
            <router-link to="/study-rooms" class="btn-primary btn-lg">进入书院</router-link>
            <router-link to="/leaderboard" class="btn-outline btn-lg">查看金榜</router-link>
          </div>
        </template>
        <template v-else>
          <h1 class="hero-title" ref="heroTitle">学 栖</h1>
          <p class="hero-subtitle" ref="heroSubtitle">栖心之所 · 学问之道</p>
          <div class="hero-actions" ref="heroActions">
            <router-link to="/study-rooms" class="btn-primary btn-lg">入门求学</router-link>
            <router-link to="/books" class="btn-outline btn-lg">游历书海</router-link>
          </div>
        </template>
      </div>
      <div class="scroll-hint" ref="scrollHint">
        <span>向下探索</span>
        <div class="scroll-arrow"></div>
      </div>
    </section>

    <!-- Section 2: Live Stats -->
    <section class="stats-section" ref="statsSection">
      <div class="section-inner">
        <div class="divider">今日学栖</div>
        <div class="stats-scroll">
          <div class="stat-item" v-for="stat in stats" :key="stat.label">
            <div class="stat-deco-line"></div>
            <span class="stat-icon">{{ stat.icon }}</span>
            <span class="stat-value">{{ stat.display }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 3: Hot Rooms -->
    <section class="rooms-section" ref="roomsSection">
      <div class="section-inner">
        <div class="divider">热门书院</div>
        <!-- Loading skeleton -->
        <div class="room-grid" v-if="loading.rooms">
          <div class="skeleton-card" v-for="i in 3" :key="i">
            <div class="skeleton-circle"></div>
            <div class="skeleton-line w60"></div>
            <div class="skeleton-line w90"></div>
            <div class="skeleton-line w40"></div>
          </div>
        </div>
        <!-- Real data -->
        <div class="room-grid" v-else>
          <div class="room-card card" v-for="room in rooms" :key="room.id">
            <div class="room-icon">{{ roomIcons[room.id % 5] }}</div>
            <h3>{{ room.name }}</h3>
            <p class="room-desc">{{ room.description?.slice(0, 40) }}...</p>
            <div class="room-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: roomProgress(room) + '%' }"></div>
              </div>
              <span class="progress-text">{{ room.current_count || 0 }}/{{ room.capacity }}人</span>
            </div>
            <router-link to="/study-rooms" class="btn-primary btn-sm">入斋</router-link>
          </div>
        </div>
        <router-link to="/study-rooms" class="section-link">游历全部书院 →</router-link>
      </div>
    </section>

    <!-- Section 4: Community -->
    <section class="community-section" ref="communitySection">
      <div class="section-inner community-bg">
        <div class="divider">学子论道</div>
        <!-- Loading skeleton -->
        <div class="post-grid" v-if="loading.posts">
          <div class="skeleton-card" v-for="i in 4" :key="i">
            <div class="skeleton-line w30"></div>
            <div class="skeleton-line w80"></div>
            <div class="skeleton-line w60"></div>
          </div>
        </div>
        <!-- Real data -->
        <div class="post-grid" v-else-if="posts.length">
          <router-link
            v-for="post in posts" :key="post.id"
            :to="'/community/posts/' + post.id"
            class="post-card card"
          >
            <div class="post-meta">
              <span v-if="post.is_pinned" class="pin-badge">📌</span>
              <span class="post-category">{{ categoryMap[post.category] }}</span>
            </div>
            <h3 class="post-title">{{ post.title }}</h3>
            <div class="post-footer">
              <span>{{ post.is_anonymous ? '匿名学子' : (post.author_name || '学子') }} · {{ timeAgo(post.created_at) }}</span>
              <span>赞{{ post.like_count }} 评{{ post.comment_count }}</span>
            </div>
          </router-link>
        </div>
        <p v-else class="empty-text">暂无论道帖子，去论道场看看吧</p>
        <router-link to="/community" class="section-link">进入论道场 →</router-link>
      </div>
    </section>

    <!-- Section 5: Leaderboard -->
    <section class="leaderboard-section" ref="leaderboardSection">
      <div class="section-inner leaderboard-bg">
        <div class="divider">金榜题名</div>
        <!-- Loading skeleton -->
        <div class="podium" v-if="loading.leaders">
          <div class="skeleton-card skeleton-podium" v-for="i in 3" :key="i"></div>
        </div>
        <!-- Real data -->
        <div class="podium" v-else-if="topUsers.length >= 3">
          <div class="podium-item second">
            <div class="podium-avatar">{{ topUsers[1]?.nickname?.[0] || '?' }}</div>
            <div class="podium-name">{{ topUsers[1]?.nickname || '虚位以待' }}</div>
            <div class="podium-score">{{ topUsers[1]?.total_points || 0 }} 分</div>
            <div class="podium-medal">🥈</div>
          </div>
          <div class="podium-item first">
            <div class="podium-avatar">{{ topUsers[0]?.nickname?.[0] || '?' }}</div>
            <div class="podium-name">{{ topUsers[0]?.nickname || '虚位以待' }}</div>
            <div class="podium-score">{{ topUsers[0]?.total_points || 0 }} 分</div>
            <div class="podium-medal">🥇</div>
          </div>
          <div class="podium-item third">
            <div class="podium-avatar">{{ topUsers[2]?.nickname?.[0] || '?' }}</div>
            <div class="podium-name">{{ topUsers[2]?.nickname || '虚位以待' }}</div>
            <div class="podium-score">{{ topUsers[2]?.total_points || 0 }} 分</div>
            <div class="podium-medal">🥉</div>
          </div>
        </div>
        <p v-else class="empty-text">暂无金榜数据</p>
        <router-link to="/leaderboard" class="section-link">查看金榜 →</router-link>
      </div>
    </section>

    <!-- Section 6: Closing -->
    <section class="closing-section">
      <div class="section-inner">
        <div class="closing-quote">
          <p class="quote-text">「学而时习之，不亦说乎」</p>
          <p class="quote-source">——《论语·学而》</p>
        </div>
        <div class="closing-actions" v-if="!userStore.isLoggedIn">
          <router-link to="/register" class="btn-primary btn-lg">立即加入学栖</router-link>
        </div>
      </div>
    </section>

    <AppFooter />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import AppNavbar from '@/components/AppNavbar.vue'
import AppFooter from '@/components/AppFooter.vue'
import { roomAPI } from '@/api/study'
import { postAPI } from '@/api/community'
import { leaderboardAPI } from '@/api/user'
import { useUserStore } from '@/stores/user'

gsap.registerPlugin(ScrollTrigger)

const userStore = useUserStore()
const roomIcons = ['📖', '💡', '🌙', '🎯', '📚']
const categoryMap = { experience: '修习心得', question: '求学问路', resource: '典籍推荐', general: '杂谈' }

const rooms = ref([])
const posts = ref([])
const topUsers = ref([])
const loading = reactive({ rooms: true, posts: true, leaders: true })

const stats = ref([
  { icon: '🟢', label: '在线求学', display: '--' },
  { icon: '📖', label: '今日研读', display: '--' },
  { icon: '🔥', label: '累计修习', display: '--' },
  { icon: '✍️', label: '学子论道', display: '--' }
])

const heroTitle = ref(null)
const heroSubtitle = ref(null)
const heroActions = ref(null)

function roomProgress(room) {
  return Math.min(100, Math.round(((room.current_count || 0) / room.capacity) * 100))
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours}时辰前`
  const days = Math.floor(hours / 24)
  return `${days}日前`
}

onMounted(async () => {
  // Hero animations
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  tl.from(heroTitle.value, { y: 60, opacity: 0, duration: 1.2 })
    .from(heroSubtitle.value, { y: 30, opacity: 0, duration: 0.8 }, '-=0.6')
    .from(heroActions.value, { y: 20, opacity: 0, duration: 0.6 }, '-=0.4')

  // Floating ink dots animation
  gsap.utils.toArray('.ink-dot').forEach((dot, i) => {
    gsap.to(dot, {
      y: `random(-30, 30)`,
      x: `random(-20, 20)`,
      duration: `random(4, 8)`,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: i * 0.3
    })
  })

  // Cloud drift animation
  gsap.to('.cloud-1', { xPercent: 15, duration: 40, repeat: -1, yoyo: true, ease: 'sine.inOut' })
  gsap.to('.cloud-2', { xPercent: -10, duration: 50, repeat: -1, yoyo: true, ease: 'sine.inOut' })

  // Fetch data
  try {
    const [roomsRes, postsRes, leadersRes] = await Promise.all([
      roomAPI.getList(),
      postAPI.getList({ pageSize: 4 }),
      leaderboardAPI.getPoints({ pageSize: 3 })
    ])
    rooms.value = (roomsRes.data || []).slice(0, 3)
    posts.value = postsRes.data || []
    topUsers.value = leadersRes.data || []

    // Calculate real stats
    const onlineCount = (roomsRes.data || []).reduce((s, r) => s + (r.current_count || 0), 0)
    const totalStudyMin = topUsers.value.reduce((s, u) => s + (u.total_study_minutes || 0), 0)
    const postCount = posts.value.length

    stats.value = [
      { icon: '🟢', label: '在线求学', display: `${onlineCount} 人` },
      { icon: '📖', label: '今日研读', display: `${Math.floor(totalStudyMin / 60)} 时辰` },
      { icon: '🔥', label: '累计修习', display: `${Math.floor(totalStudyMin / 60)} 时辰` },
      { icon: '✍️', label: '学子论道', display: `${postCount} 篇` }
    ]

    loading.rooms = false
    loading.posts = false
    loading.leaders = false

    // Stagger room cards entrance
    await new Promise(r => setTimeout(r, 100))
    gsap.from('.room-card', {
      y: 30, opacity: 0, duration: 0.6, stagger: 0.12, ease: 'power2.out'
    })
    // Stagger post cards entrance
    gsap.from('.post-card', {
      y: 30, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out', delay: 0.2
    })
    // Bounce podium items
    gsap.from('.podium-item', {
      y: 50, opacity: 0, duration: 0.8, stagger: 0.15, ease: 'back.out(1.7)', delay: 0.3
    })

  } catch {
    loading.rooms = false
    loading.posts = false
    loading.leaders = false
  }

  // Scroll animations for sections
  gsap.utils.toArray('.section-inner').forEach((section) => {
    gsap.from(section, {
      scrollTrigger: {
        trigger: section,
        start: 'top 80%',
        toggleActions: 'play none none reverse'
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out'
    })
  })
})
</script>

<style scoped>
/* ═══════════════════ Hero ═══════════════════ */
.hero-section {
  position: relative;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(180deg, var(--color-bg-primary) 0%, #EDE6D6 60%, var(--color-bg-primary) 100%);
}

.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.mountain-layer {
  position: absolute;
  bottom: 0;
  width: 130%;
  left: -15%;
}

.mountain-layer.far {
  width: 140%;
  left: -20%;
  bottom: 8%;
}

.mountain-layer.mid {
  width: 130%;
  left: -10%;
  bottom: 4%;
}

.mountain-layer.near {
  width: 120%;
  left: -5%;
  bottom: 0;
}

/* Cloud layers */
.cloud-layer {
  position: absolute;
  width: 60%;
  pointer-events: none;
}

.cloud-1 {
  bottom: 22%;
  left: -10%;
  opacity: 0.6;
}

.cloud-2 {
  bottom: 12%;
  right: -15%;
  opacity: 0.5;
  transform: scaleX(-1);
}

.cloud-layer img {
  width: 100%;
  height: auto;
}

/* Floating ink particles */
.ink-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.ink-dot {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(44,44,44,0.08) 0%, transparent 70%);
}

.ink-dot--1 { width: 80px; height: 80px; top: 15%; left: 8%; }
.ink-dot--2 { width: 50px; height: 50px; top: 25%; right: 12%; }
.ink-dot--3 { width: 100px; height: 100px; top: 60%; left: 20%; }
.ink-dot--4 { width: 40px; height: 40px; top: 35%; left: 65%; }
.ink-dot--5 { width: 70px; height: 70px; top: 50%; right: 25%; }
.ink-dot--6 { width: 55px; height: 55px; top: 70%; left: 45%; }
.ink-dot--7 { width: 35px; height: 35px; top: 20%; left: 40%; }
.ink-dot--8 { width: 65px; height: 65px; top: 45%; right: 8%; }

/* Bottom gradient fade */
.hero-fade {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(to bottom, transparent, var(--color-bg-primary));
  z-index: 2;
  pointer-events: none;
}

/* Decorative seal stamp */
.hero-seal {
  position: absolute;
  bottom: 140px;
  right: 8%;
  width: 60px;
  height: 60px;
  border: 3px solid var(--color-accent);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
  font-size: 1.6rem;
  color: var(--color-accent);
  transform: rotate(-8deg);
  opacity: 0.25;
  z-index: 1;
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 3;
  text-align: center;
}

.hero-title {
  font-family: var(--font-title);
  font-size: 5rem;
  color: var(--color-text-primary);
  letter-spacing: 2rem;
  margin-bottom: 16px;
  text-shadow: 0 2px 20px rgba(139, 37, 0, 0.08);
}

.hero-greeting {
  font-family: var(--font-title);
  font-size: 3rem;
  color: var(--color-text-primary);
  margin-bottom: 16px;
  text-shadow: 0 2px 20px rgba(139, 37, 0, 0.08);
}

.hero-subtitle {
  font-size: 1.2rem;
  color: var(--color-text-secondary);
  margin-bottom: 40px;
  letter-spacing: 4px;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.btn-lg {
  padding: 14px 32px;
  font-size: 1.05rem;
}

.scroll-hint {
  position: absolute;
  bottom: 40px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  z-index: 3;
  animation: float 2s ease-in-out infinite;
}

.scroll-arrow {
  width: 20px;
  height: 20px;
  border-right: 2px solid var(--color-text-secondary);
  border-bottom: 2px solid var(--color-text-secondary);
  transform: rotate(45deg);
  margin: 8px auto 0;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(8px); }
}

/* ═══════════════════ Sections ═══════════════════ */
section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}

.section-inner {
  width: 100%;
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: 0 20px;
}

.section-link {
  display: block;
  text-align: center;
  margin-top: 32px;
  color: var(--color-accent);
  font-size: 1rem;
  text-decoration: none;
  transition: opacity 0.2s;
}

.section-link:hover {
  opacity: 0.8;
}

/* ═══════════════════ Stats ═══════════════════ */
.stats-section {
  background-image: url('@/assets/textures/bamboo.svg');
  background-repeat: no-repeat;
  background-position: left -20px center;
  background-size: 80px auto;
}

.stats-scroll {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-top: 40px;
}

.stat-item {
  text-align: center;
  padding: 32px 16px;
  background: var(--glass-bg-card);
  border: var(--glass-border);
  border-radius: var(--border-radius);
  position: relative;
  overflow: hidden;
}

.stat-deco-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--color-accent), var(--color-gold), transparent);
  opacity: 0.6;
}

.stat-icon {
  display: block;
  font-size: 2rem;
  margin-bottom: 8px;
}

.stat-value {
  display: block;
  font-family: var(--font-mono);
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--color-accent);
}

.stat-label {
  display: block;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

/* ═══════════════════ Rooms ═══════════════════ */
.room-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-top: 32px;
}

.room-card {
  padding: 24px;
  text-align: center;
  transition: transform 0.3s, box-shadow 0.3s;
  position: relative;
  overflow: hidden;
}

.room-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-accent);
  transform: scaleX(0);
  transition: transform 0.3s;
}

.room-card:hover {
  transform: translateY(-6px) scale(1.01);
  box-shadow: 0 8px 30px rgba(44, 44, 44, 0.1);
}

.room-card:hover::before {
  transform: scaleX(1);
}

.room-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.room-card h3 {
  font-family: var(--font-title);
  font-size: 1.3rem;
  margin-bottom: 8px;
}

.room-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

.room-progress {
  margin-bottom: 16px;
}

.progress-bar {
  height: 6px;
  background: var(--color-bg-secondary);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), var(--color-gold));
  border-radius: 3px;
  transition: width 0.6s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

/* ═══════════════════ Community ═══════════════════ */
.community-section {
  position: relative;
}

.community-bg {
  position: relative;
}

.community-bg::before {
  content: '';
  position: absolute;
  inset: -40px;
  background-image: url('@/assets/textures/cloud-pattern.svg');
  background-repeat: repeat;
  background-size: 200px auto;
  opacity: 0.15;
  pointer-events: none;
  z-index: -1;
}

.post-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-top: 32px;
}

.post-card {
  padding: 20px;
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  display: block;
  position: relative;
  overflow: hidden;
}

.post-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-accent);
  transform: scaleX(0);
  transition: transform 0.3s;
}

.post-card:hover {
  transform: translateY(-6px) scale(1.01);
  box-shadow: 0 8px 30px rgba(44, 44, 44, 0.1);
  color: inherit;
}

.post-card:hover::before {
  transform: scaleX(1);
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.post-category {
  font-size: 0.75rem;
  color: var(--color-green);
  background: rgba(46, 92, 76, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

.post-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

/* ═══════════════════ Leaderboard ═══════════════════ */
.leaderboard-section {
  position: relative;
}

.leaderboard-bg {
  position: relative;
}

.leaderboard-bg::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(184, 134, 11, 0.06) 0%, transparent 70%);
  pointer-events: none;
  z-index: -1;
}

.podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 24px;
  margin-top: 48px;
}

.podium-item {
  text-align: center;
  padding: 24px 32px;
  background: var(--glass-bg-card);
  border: var(--glass-border);
  border-radius: var(--border-radius);
  transition: transform 0.3s, box-shadow 0.3s;
}

.podium-item:hover {
  transform: translateY(-4px);
}

.podium-item.first {
  padding: 32px 40px;
  border-color: var(--color-gold);
  box-shadow: 0 4px 30px rgba(184, 134, 11, 0.15);
}

.podium-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  font-family: var(--font-title);
  margin: 0 auto 12px;
}

.podium-item.first .podium-avatar {
  width: 72px;
  height: 72px;
  font-size: 1.6rem;
  box-shadow: 0 0 20px rgba(184, 134, 11, 0.4), 0 0 40px rgba(184, 134, 11, 0.15);
}

.podium-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.podium-score {
  font-family: var(--font-mono);
  color: var(--color-accent);
  font-weight: 700;
  margin-bottom: 8px;
}

.podium-medal {
  font-size: 1.5rem;
}

.podium-item.first .podium-medal {
  font-size: 2rem;
}

/* ═══════════════════ Closing ═══════════════════ */
.closing-section {
  min-height: auto;
  padding: 100px 0;
}

.closing-quote {
  text-align: center;
  margin-bottom: 32px;
}

.quote-text {
  font-family: var(--font-title);
  font-size: 2rem;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.quote-source {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.closing-actions {
  text-align: center;
}

/* ═══════════════════ Skeleton Loading ═══════════════════ */
.skeleton-card {
  padding: 24px;
  background: var(--glass-bg-card);
  border: var(--glass-border);
  border-radius: var(--border-radius);
  text-align: center;
}

.skeleton-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-bg-secondary);
  margin: 0 auto 12px;
  animation: shimmer 1.5s ease-in-out infinite;
}

.skeleton-line {
  height: 14px;
  border-radius: 7px;
  background: var(--color-bg-secondary);
  margin: 8px auto;
  animation: shimmer 1.5s ease-in-out infinite;
}

.skeleton-podium {
  width: 120px;
  height: 140px;
}

.w30 { width: 30%; }
.w40 { width: 40%; }
.w60 { width: 60%; }
.w80 { width: 80%; }
.w90 { width: 90%; }

@keyframes shimmer {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

/* ═══════════════════ Empty State ═══════════════════ */
.empty-text {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 40px 0;
  font-size: 0.95rem;
}

/* ═══════════════════ Responsive ═══════════════════ */
@media (max-width: 768px) {
  .hero-title {
    font-size: 3rem;
    letter-spacing: 1rem;
  }

  .hero-greeting {
    font-size: 2rem;
  }

  .hero-seal {
    display: none;
  }

  .stats-scroll {
    grid-template-columns: repeat(2, 1fr);
  }

  .room-grid {
    grid-template-columns: 1fr;
  }

  .post-grid {
    grid-template-columns: 1fr;
  }

  .podium {
    flex-direction: column;
    align-items: center;
  }

  .podium-item.first {
    order: -1;
  }
}
</style>
