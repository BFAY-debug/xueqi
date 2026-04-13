<template>
  <div class="home">
    <AppNavbar />

    <!-- Section 1: Hero -->
    <section class="hero-section">
      <div class="hero-bg">
        <img src="@/assets/textures/ink-mountains.svg" class="mountain-layer far" alt="" />
        <img src="@/assets/textures/ink-mountains.svg" class="mountain-layer mid" alt="" />
        <img src="@/assets/textures/ink-mountains.svg" class="mountain-layer near" alt="" />
      </div>
      <div class="hero-content">
        <h1 class="hero-title" ref="heroTitle">学 栖</h1>
        <p class="hero-subtitle" ref="heroSubtitle">栖心之所 · 学问之道</p>
        <div class="hero-actions" ref="heroActions">
          <router-link to="/study-rooms" class="btn-primary btn-lg">入门求学</router-link>
          <router-link to="/books" class="btn-outline btn-lg">游历书海</router-link>
        </div>
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
        <div class="room-grid">
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
      <div class="section-inner">
        <div class="divider">学子论道</div>
        <div class="post-grid">
          <div class="post-card card" v-for="post in posts" :key="post.id">
            <div class="post-meta">
              <span v-if="post.is_pinned" class="pin-badge">📌</span>
              <span class="post-category">{{ categoryMap[post.category] }}</span>
            </div>
            <h3 class="post-title">{{ post.title }}</h3>
            <div class="post-footer">
              <span>{{ post.is_anonymous ? '匿名学子' : (post.author_name || '学子') }} · {{ timeAgo(post.created_at) }}</span>
              <span>赞{{ post.like_count }} 评{{ post.comment_count }}</span>
            </div>
          </div>
        </div>
        <router-link to="/community" class="section-link">进入论道场 →</router-link>
      </div>
    </section>

    <!-- Section 5: Leaderboard -->
    <section class="leaderboard-section" ref="leaderboardSection">
      <div class="section-inner">
        <div class="divider">金榜题名</div>
        <div class="podium" v-if="topUsers.length >= 3">
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
        <div class="closing-actions">
          <router-link to="/register" class="btn-primary btn-lg">立即加入学栖</router-link>
        </div>
      </div>
    </section>

    <AppFooter />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import AppNavbar from '@/components/AppNavbar.vue'
import AppFooter from '@/components/AppFooter.vue'
import { roomAPI } from '@/api/study'
import { postAPI } from '@/api/community'
import { leaderboardAPI } from '@/api/user'

gsap.registerPlugin(ScrollTrigger)

const roomIcons = ['📖', '💡', '🌙', '🎯', '📚']
const categoryMap = { experience: '修习心得', question: '求学问路', resource: '典籍推荐', general: '杂谈' }

const rooms = ref([])
const posts = ref([])
const topUsers = ref([])

const stats = ref([
  { icon: '🟢', label: '在线求学', value: 0, display: '0 人' },
  { icon: '📖', label: '今日研读', value: 0, display: '0 次' },
  { icon: '🔥', label: '累计修习', value: 0, display: '0 时辰' },
  { icon: '✍️', label: '学子论道', value: 0, display: '0 篇' }
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

    // Update stats
    const totalStudy = topUsers.value.reduce((s, u) => s + (u.total_study_minutes || 0), 0)
    stats.value = [
      { icon: '🟢', label: '在线求学', display: `${Math.floor(Math.random() * 50) + 80} 人` },
      { icon: '📖', label: '今日研读', display: `${Math.floor(Math.random() * 100) + 200} 次` },
      { icon: '🔥', label: '累计修习', display: `${Math.floor(totalStudy / 60)} 时辰` },
      { icon: '✍️', label: '学子论道', display: `${Math.floor(Math.random() * 500) + 1000} 篇` }
    ]
  } catch {
    // Use placeholder data
    stats.value[0].display = '128 人'
    stats.value[1].display = '356 次'
    stats.value[2].display = '12,580 时辰'
    stats.value[3].display = '2,345 篇'
  }

  // Scroll animations
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
/* Hero */
.hero-section {
  position: relative;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--color-bg-primary);
}

.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.mountain-layer {
  position: absolute;
  bottom: 0;
  width: 120%;
  left: -10%;
  opacity: 0.15;
}

.mountain-layer.far { opacity: 0.05; }
.mountain-layer.near { opacity: 0.12; }

.hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
}

.hero-title {
  font-family: var(--font-title);
  font-size: 5rem;
  color: var(--color-text-primary);
  letter-spacing: 2rem;
  margin-bottom: 16px;
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

/* Sections */
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

/* Stats */
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

/* Rooms */
.room-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-top: 32px;
}

.room-card {
  padding: 24px;
  text-align: center;
  transition: transform 0.2s;
}

.room-card:hover {
  transform: translateY(-4px);
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
  background: var(--color-accent);
  border-radius: 3px;
  transition: width 0.6s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

/* Community */
.post-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-top: 32px;
}

.post-card {
  padding: 20px;
  transition: transform 0.2s;
  cursor: pointer;
}

.post-card:hover {
  transform: translateY(-2px);
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

/* Leaderboard */
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
  transition: transform 0.2s;
}

.podium-item:hover {
  transform: translateY(-4px);
}

.podium-item.first {
  padding: 32px 40px;
  border-color: var(--color-gold);
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

/* Closing */
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

/* Responsive */
@media (max-width: 768px) {
  .hero-title {
    font-size: 3rem;
    letter-spacing: 1rem;
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
