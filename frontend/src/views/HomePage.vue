<template>
  <div class="home">
    <AppNavbar />

    <!-- Section 1: Hero (preserved) -->
    <section class="hero-section">
      <!-- Eight-layer ink wash composition -->
      <div class="hero-bg">
        <!-- L0: Moon -->
        <img src="@/assets/textures/ink-moon.svg" class="hero-moon" alt="" />
        <!-- L1: Far mountains -->
        <img src="@/assets/textures/ink-mountains-far.svg" class="mountain-layer far" alt="" />
        <!-- L2: Mist between far and mid -->
        <img src="@/assets/textures/ink-mist.svg" class="mist-layer mist-far" alt="" />
        <!-- L3: Clouds + Cranes -->
        <div class="cloud-layer cloud-1"><img src="@/assets/textures/ink-clouds.svg" alt="" /></div>
        <img src="@/assets/textures/ink-crane.svg" class="crane crane-1" alt="" />
        <img src="@/assets/textures/ink-crane.svg" class="crane crane-2" alt="" />
        <!-- L4: Mid mountains -->
        <img src="@/assets/textures/ink-mountains-mid.svg" class="mountain-layer mid" alt="" />
        <!-- L5: Clouds -->
        <div class="cloud-layer cloud-2"><img src="@/assets/textures/ink-clouds.svg" alt="" /></div>
        <!-- L6: Near mountains -->
        <img src="@/assets/textures/ink-mountains-near.svg" class="mountain-layer near" alt="" />
        <!-- L7: Water foreground -->
        <img src="@/assets/textures/ink-water.svg" class="water-layer" alt="" />
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
            <router-link to="/community" class="btn-outline btn-lg">探索书院</router-link>
          </div>
        </template>
      </div>
      <div class="scroll-hint" ref="scrollHint">
        <span>向下探索</span>
        <div class="scroll-arrow"></div>
      </div>
    </section>

    <!-- Section 2: Bento Grid Dashboard -->
    <section class="bento-section" ref="bentoSection">
      <div class="bento-grid">
        <!-- Cell 1: User Stats / Welcome -->
        <div class="bento-cell card bento-cell--stats">
          <div class="bento-cell__header">
            <span class="bento-label">今日学栖</span>
          </div>
          <template v-if="userStore.isLoggedIn && userStore.user">
            <div class="user-welcome">
              <UserAvatar :avatar-url="userStore.user.avatar_url" :nickname="userStore.user.nickname" :size="40" />
              <div>
                <div class="user-name">{{ userStore.user.nickname }}</div>
                <div class="user-level">
                  <span class="seal" :class="`seal--level-${userLevel}`">Lv.{{ userLevel }}</span>
                </div>
              </div>
            </div>
            <div class="mini-stats">
              <div class="mini-stat" v-for="stat in stats" :key="stat.label">
                <span class="mini-stat__icon">{{ stat.icon }}</span>
                <div>
                  <span class="mini-stat__value">{{ stat.display }}</span>
                  <span class="mini-stat__label">{{ stat.label }}</span>
                </div>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="welcome-cta">
              <p class="welcome-text">踏入水墨之境<br />开启你的学问之道</p>
              <router-link to="/register" class="btn-primary btn-sm">入门求学</router-link>
            </div>
          </template>
        </div>

        <!-- Cell 2: Hot Study Rooms (large cell) -->
        <div class="bento-cell card bento-cell--rooms">
          <div class="bento-cell__header">
            <span class="bento-label">热门书院</span>
            <router-link to="/study-rooms" class="bento-more">全部 →</router-link>
          </div>
          <AppLoading v-if="loading.rooms" type="card" :count="3" />
          <div class="room-list" v-else-if="rooms.length">
            <div class="room-card-mini card" v-for="room in rooms" :key="room.id">
              <div class="room-card-mini__icon">{{ roomIcons[room.id % 5] }}</div>
              <div class="room-card-mini__info">
                <h4>{{ room.name }}</h4>
                <div class="room-progress-sm">
                  <div class="progress-bar-sm">
                    <div class="progress-fill-sm" :style="{ width: roomProgress(room) + '%' }"></div>
                  </div>
                  <span>{{ room.current_count || 0 }}/{{ room.capacity }}人</span>
                </div>
              </div>
              <router-link to="/study-rooms" class="btn-primary btn-sm room-btn">入斋</router-link>
            </div>
          </div>
          <AppEmpty v-else text="暂无书院开放" />
        </div>

        <!-- Cell 3: Leaderboard Top 3 -->
        <div class="bento-cell card bento-cell--leaderboard">
          <div class="bento-cell__header">
            <span class="bento-label">金榜题名</span>
            <router-link to="/leaderboard" class="bento-more">金榜 →</router-link>
          </div>
          <AppLoading v-if="loading.leaders" type="line" :count="3" />
          <div class="top-list" v-else-if="topUsers.length">
            <div class="top-user" v-for="(u, i) in topUsers.slice(0, 3)" :key="u.id || i">
              <span class="top-rank" :class="`top-rank--${i + 1}`">
                <template v-if="i === 0">🥇</template>
                <template v-else-if="i === 1">🥈</template>
                <template v-else>🥉</template>
              </span>
              <UserAvatar :avatar-url="u.avatar_url" :nickname="u.nickname" :size="36" />
              <div class="top-info">
                <span class="top-name">{{ u.nickname || '虚位以待' }}</span>
                <span class="top-score">{{ u.total_points || 0 }} 分</span>
              </div>
            </div>
          </div>
          <AppEmpty v-else text="暂无金榜数据" />
        </div>

        <!-- Cell 4: Today's Data -->
        <div class="bento-cell card bento-cell--today">
          <div class="bento-cell__header">
            <span class="bento-label">书院数据</span>
          </div>
          <div class="today-stats">
            <div class="today-stat">
              <span class="today-stat__value">{{ onlineCount }}</span>
              <span class="today-stat__label">在线求学</span>
            </div>
            <div class="today-stat">
              <span class="today-stat__value">{{ totalStudyHours }}</span>
              <span class="today-stat__label">累计时辰</span>
            </div>
            <div class="today-stat">
              <span class="today-stat__value">{{ postCount }}</span>
              <span class="today-stat__label">学子论道</span>
            </div>
          </div>
        </div>

        <!-- Cell 5: Online Users -->
        <div class="bento-cell card bento-cell--online">
          <div class="bento-cell__header">
            <span class="bento-label">在线学友</span>
            <router-link to="/study-rooms" class="bento-more">书院 →</router-link>
          </div>
          <div class="online-users-grid" v-if="onlineUsers.length">
            <div
              v-for="u in onlineUsers.slice(0, 6)" :key="u.userId"
              class="online-user-card"
            >
              <div class="online-avatar-wrap">
                <UserAvatar :avatar-url="u.avatarUrl" :nickname="u.nickname" :size="44" />
                <span class="online-dot"></span>
              </div>
              <span class="online-name">{{ u.nickname }}</span>
            </div>
          </div>
          <AppEmpty v-else text="暂无在线学友" />
        </div>

        <!-- Cell 6: Community Posts -->
        <div class="bento-cell card bento-cell--community">
          <div class="bento-cell__header">
            <span class="bento-label">学子论道</span>
            <router-link to="/community" class="bento-more">论道场 →</router-link>
          </div>
          <AppLoading v-if="loading.posts" type="card" :count="4" />
          <div class="post-grid-bento" v-else-if="posts.length">
            <router-link
              v-for="post in posts" :key="post.id"
              :to="'/community/posts/' + post.id"
              class="post-card-mini card"
            >
              <div class="post-meta-sm">
                <span v-if="post.is_pinned" class="pin-badge">📌</span>
                <span class="post-category-sm">{{ categoryMap[post.category] }}</span>
              </div>
              <h4 class="post-title-sm">{{ post.title }}</h4>
              <div class="post-footer-sm">
                <span>{{ post.is_anonymous ? '匿名学子' : (post.author_name || '学子') }}</span>
                <span>赞{{ post.like_count }}</span>
              </div>
            </router-link>
          </div>
          <AppEmpty v-else text="暂无论道帖子" />
        </div>

        <!-- Cell 7: Closing -->
        <div class="bento-cell card bento-cell--closing">
          <div class="closing-inner">
            <p class="closing-quote-text">「学而时习之，不亦说乎」</p>
            <p class="closing-quote-src">——《论语·学而》</p>
            <router-link v-if="!userStore.isLoggedIn" to="/register" class="btn-outline btn-sm">立即加入学栖</router-link>
          </div>
        </div>
      </div>
    </section>

    <AppFooter />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import AppNavbar from '@/components/AppNavbar.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppLoading from '@/components/AppLoading.vue'
import AppEmpty from '@/components/AppEmpty.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { roomAPI } from '@/api/study'
import { postAPI } from '@/api/community'
import { leaderboardAPI } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { useMessageStore } from '@/stores/message'
import { useTimeAgo } from '@/composables/useTimeAgo'
import { getSocket } from '@/composables/useSocket'

gsap.registerPlugin(ScrollTrigger)

const userStore = useUserStore()
const messageStore = useMessageStore()
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const roomIcons = ['📖', '💡', '🌙', '🎯', '📚']
const categoryMap = { experience: '修习心得', question: '求学问路', resource: '典籍推荐', general: '杂谈' }

const rooms = ref([])
const posts = ref([])
const topUsers = ref([])
const onlineUsers = ref([])
const loading = reactive({ rooms: true, posts: true, leaders: true })

const stats = ref([
  { icon: '🟢', label: '在线求学', display: '--' },
  { icon: '📖', label: '今日研读', display: '--' },
  { icon: '🔥', label: '累计修习', display: '--' },
  { icon: '✍️', label: '学子论道', display: '--' }
])

const onlineCount = ref(0)
const totalStudyHours = ref(0)
const postCount = ref(0)

const userLevel = computed(() => {
  const lvl = userStore.user?.level
  return lvl ? Math.min(6, Math.max(1, lvl)) : 1
})

const heroTitle = ref(null)
const heroSubtitle = ref(null)
const heroActions = ref(null)
const { timeAgo } = useTimeAgo()

function roomProgress(room) {
  return Math.min(100, Math.round(((room.current_count || 0) / (room.capacity || 1)) * 100))
}

onMounted(async () => {
  // Hero animations (skip continuous animations if reduced motion preferred)
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  tl.from(heroTitle.value, { y: 60, opacity: 0, duration: 1.2 })
    .from(heroSubtitle.value, { y: 30, opacity: 0, duration: 0.8 }, '-=0.6')
    .from(heroActions.value, { y: 20, opacity: 0, duration: 0.6 }, '-=0.4')

  if (!prefersReducedMotion) {
    // Floating ink dots animation
    gsap.utils.toArray('.ink-dot').forEach((dot, i) => {
      gsap.to(dot, {
        y: `random(-30, 30)`, x: `random(-20, 20)`,
        duration: `random(4, 8)`, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.3
      })
    })
    // Cloud drift
    gsap.to('.cloud-1', { xPercent: 15, duration: 40, repeat: -1, yoyo: true, ease: 'sine.inOut' })
    gsap.to('.cloud-2', { xPercent: -10, duration: 50, repeat: -1, yoyo: true, ease: 'sine.inOut' })
    // Moon gentle float
    gsap.to('.hero-moon', { y: -8, duration: 12, repeat: -1, yoyo: true, ease: 'sine.inOut' })
    // Crane fly-in
    gsap.to('.crane-1', { opacity: 0.08, x: -100, duration: 3, delay: 1.5, ease: 'power2.out' })
    gsap.to('.crane-2', { opacity: 0.06, x: -80, duration: 3.5, delay: 2, ease: 'power2.out' })
    gsap.to('.crane-1', { y: 'random(-10,10)', x: 'random(-5,5)', duration: 8, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 5 })
    gsap.to('.crane-2', { y: 'random(-8,8)', x: 'random(-4,4)', duration: 10, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 6 })
    // Mist drift
    gsap.to('.mist-far', { xPercent: 5, duration: 25, repeat: -1, yoyo: true, ease: 'sine.inOut' })
    // Water ripple
    gsap.to('.water-layer', { y: -5, duration: 6, repeat: -1, yoyo: true, ease: 'sine.inOut' })
    // Mountain parallax
    gsap.to('.mountain-layer.far', { scrollTrigger: { trigger: '.hero-section', start: 'top top', end: 'bottom top', scrub: 1.5 }, y: 50, ease: 'none' })
    gsap.to('.mountain-layer.mid', { scrollTrigger: { trigger: '.hero-section', start: 'top top', end: 'bottom top', scrub: 1 }, y: 100, ease: 'none' })
    gsap.to('.mountain-layer.near', { scrollTrigger: { trigger: '.hero-section', start: 'top top', end: 'bottom top', scrub: 0.8 }, y: 160, ease: 'none' })
    gsap.to('.hero-moon', { scrollTrigger: { trigger: '.hero-section', start: 'top top', end: 'bottom top', scrub: 2 }, y: 30, ease: 'none' })
  }

  // Seal stamp entrance (one-time, always run)
  gsap.from('.hero-seal', { rotation: -30, opacity: 0, scale: 0.5, duration: 1.2, delay: 2, ease: 'back.out(1.4)' })

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
    onlineUsers.value = []
    // Fetch online users via socket (non-blocking)
    try {
      const sock = getSocket()
      if (sock.connected) {
        sock.emit('online:getUsers', (users) => {
          onlineUsers.value = users || []
        })
      }
    } catch (e) { /* ignore */ }

    // Calculate stats
    const online = (roomsRes.data || []).reduce((s, r) => s + (r.current_count || 0), 0)
    const totalMin = topUsers.value.reduce((s, u) => s + (u.total_study_minutes || 0), 0)
    const pCount = posts.value.length

    onlineCount.value = online
    totalStudyHours.value = Math.floor(totalMin / 60)
    postCount.value = pCount

    stats.value = [
      { icon: '🟢', label: '在线求学', display: `${online} 人` },
      { icon: '📖', label: '今日研读', display: `${Math.floor(totalMin / 60)} 时辰` },
      { icon: '🔥', label: '累计修习', display: `${Math.floor(totalMin / 60)} 时辰` },
      { icon: '✍️', label: '学子论道', display: `${pCount} 篇` }
    ]

    loading.rooms = false
    loading.posts = false
    loading.leaders = false

    // Bento grid stagger entrance
    if (!prefersReducedMotion) {
      await new Promise(r => setTimeout(r, 100))
      gsap.from('.bento-cell', {
        scrollTrigger: { trigger: '.bento-grid', start: 'top 85%' },
        y: 40, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out'
      })
    }
  } catch {
    loading.rooms = false
    loading.posts = false
    loading.leaders = false
  }
})

onUnmounted(() => {
  ScrollTrigger.getAll().forEach(t => t.kill())
})
</script>

<style scoped>
/* ═══════════════════ Hero (preserved) ═══════════════════ */
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

.hero-bg { position: absolute; inset: 0; pointer-events: none; }

.mountain-layer { position: absolute; bottom: 0; width: 130%; left: -15%; }
.mountain-layer.far { width: 140%; left: -20%; bottom: 8%; }
.mountain-layer.mid { width: 130%; left: -10%; bottom: 4%; }
.mountain-layer.near { width: 120%; left: -5%; bottom: 0; }

.cloud-layer { position: absolute; width: 60%; pointer-events: none; }
.cloud-1 { bottom: 22%; left: -10%; opacity: 0.6; }
.cloud-2 { bottom: 12%; right: -15%; opacity: 0.5; transform: scaleX(-1); }
.cloud-layer img { width: 100%; height: auto; }

.hero-moon {
  position: absolute; top: 5%; right: 12%; width: 180px; opacity: 0.7;
  pointer-events: none; z-index: 0; will-change: transform;
}

.mist-layer { position: absolute; width: 110%; left: -5%; pointer-events: none; will-change: transform; }
.mist-far { bottom: 18%; opacity: 0.6; }

.crane { position: absolute; width: 60px; pointer-events: none; opacity: 0; will-change: transform; }
.crane-1 { top: 22%; right: 28%; transform: scaleX(-1); }
.crane-2 { top: 18%; right: 20%; width: 45px; transform: rotate(-10deg); }

.water-layer {
  position: absolute; bottom: 0; width: 130%; left: -15%;
  pointer-events: none; opacity: 0.4; will-change: transform;
}

.ink-particles { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
.ink-dot { position: absolute; border-radius: 50%; background: radial-gradient(circle, rgba(44,44,44,0.08) 0%, transparent 70%); }
.ink-dot--1 { width: 80px; height: 80px; top: 15%; left: 8%; }
.ink-dot--2 { width: 50px; height: 50px; top: 25%; right: 12%; }
.ink-dot--3 { width: 100px; height: 100px; top: 60%; left: 20%; }
.ink-dot--4 { width: 40px; height: 40px; top: 35%; left: 65%; }
.ink-dot--5 { width: 70px; height: 70px; top: 50%; right: 25%; }
.ink-dot--6 { width: 55px; height: 55px; top: 70%; left: 45%; }
.ink-dot--7 { width: 35px; height: 35px; top: 20%; left: 40%; }
.ink-dot--8 { width: 65px; height: 65px; top: 45%; right: 8%; }

.hero-fade {
  position: absolute; bottom: 0; left: 0; right: 0; height: 120px;
  background: linear-gradient(to bottom, transparent, var(--color-bg-primary));
  z-index: 2; pointer-events: none;
}

.hero-seal {
  position: absolute; bottom: 160px; right: 8%; width: 72px; height: 72px;
  border: 3px solid var(--color-accent); border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-title); font-size: 1.6rem; color: var(--color-accent);
  transform: rotate(-8deg); opacity: 0.18; z-index: 1; pointer-events: none;
  box-shadow: 3px 3px 0 0 var(--color-accent), 0 0 20px rgba(139, 37, 0, 0.06);
}

.hero-content { position: relative; z-index: 3; text-align: center; }

.hero-title {
  font-family: var(--font-title); font-size: 5.5rem; color: var(--color-text-primary);
  letter-spacing: 2.5rem; margin-bottom: 16px;
  text-shadow: 0 2px 20px rgba(139, 37, 0, 0.08), 0 0 60px rgba(44, 44, 44, 0.04);
  position: relative;
}
.hero-title::after {
  content: ''; position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%);
  width: 80px; height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-accent), transparent); opacity: 0.3;
}

.hero-greeting {
  font-family: var(--font-title); font-size: 3rem; color: var(--color-text-primary);
  margin-bottom: 16px; text-shadow: 0 2px 20px rgba(139, 37, 0, 0.08);
}

.hero-subtitle {
  font-size: 1.2rem; color: var(--color-text-secondary); margin-bottom: 40px;
  letter-spacing: 6px; font-family: var(--font-body); opacity: 0.8;
}

.hero-actions { display: flex; gap: 16px; justify-content: center; }
.btn-lg { padding: 14px 32px; font-size: 1.05rem; }

.scroll-hint {
  position: absolute; bottom: 40px; text-align: center;
  color: var(--color-text-secondary); font-size: 0.85rem; z-index: 3;
  animation: float 2s ease-in-out infinite;
}
.scroll-arrow {
  width: 20px; height: 20px; border-right: 2px solid var(--color-text-secondary);
  border-bottom: 2px solid var(--color-text-secondary); transform: rotate(45deg); margin: 8px auto 0;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(8px); }
}

/* ═══════════════════ Bento Grid ═══════════════════ */
.bento-section {
  padding: 60px 0 80px;
  position: relative;
  /* Subtle ink wash background */
  background-image:
    radial-gradient(ellipse at 10% 20%, rgba(139, 37, 0, 0.02) 0%, transparent 50%),
    radial-gradient(ellipse at 90% 80%, rgba(46, 92, 76, 0.02) 0%, transparent 50%);
}

.bento-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(220px, auto);
  gap: 20px;
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: 0 20px;
}

.bento-cell {
  padding: 24px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

.bento-cell:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(44, 44, 44, 0.1);
}

.bento-cell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.bento-label {
  font-family: var(--font-title);
  font-size: 1.1rem;
  color: var(--color-text-primary);
  padding-left: 8px;
  border-left: 3px solid var(--color-accent);
}

.bento-more {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color 0.2s;
}
.bento-more:hover { color: var(--color-accent); }

/* Grid placement */
.bento-cell--stats { grid-column: span 1; }
.bento-cell--rooms { grid-column: span 2; grid-row: span 2; }
.bento-cell--leaderboard { grid-column: span 1; }
.bento-cell--today { grid-column: span 1; }
.bento-cell--online { grid-column: span 1; }
.bento-cell--community { grid-column: span 2; }
.bento-cell--closing { grid-column: span 2; }

/* ── User Stats Cell ── */
.user-welcome {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.user-name { font-weight: 600; font-size: 1rem; }
.user-level { margin-top: 4px; }
.mini-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: auto;
}
.mini-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: var(--color-bg-secondary);
  border-radius: var(--border-radius-sm);
}
.mini-stat__icon { font-size: 1.2rem; }
.mini-stat__value {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-accent);
}
.mini-stat__label {
  display: block;
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}
.welcome-cta { text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 16px; }
.welcome-text {
  font-family: var(--font-title);
  font-size: 1.1rem;
  color: var(--color-text-secondary);
  line-height: 1.8;
}

/* ── Rooms Cell ── */
.room-list { display: flex; flex-direction: column; gap: 12px; flex: 1; }
.room-card-mini {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.room-card-mini:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 16px rgba(44, 44, 44, 0.06);
}
.room-card-mini__icon { font-size: 1.8rem; flex-shrink: 0; }
.room-card-mini__info { flex: 1; min-width: 0; }
.room-card-mini__info h4 {
  font-family: var(--font-title);
  font-size: 1rem;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.room-progress-sm {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}
.progress-bar-sm {
  flex: 1;
  height: 4px;
  background: var(--color-bg-secondary);
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill-sm {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), var(--color-gold));
  border-radius: 2px;
  transition: width 0.6s ease;
}
.room-btn { flex-shrink: 0; }

/* ── Leaderboard Cell ── */
.top-list { display: flex; flex-direction: column; gap: 10px; flex: 1; }
.top-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: var(--border-radius-sm);
  transition: background 0.2s;
}
.top-user:hover { background: var(--color-accent-light); }
.top-rank { font-size: 1.2rem; flex-shrink: 0; width: 24px; text-align: center; }
.top-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--color-accent); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-title); font-size: 0.9rem; flex-shrink: 0;
}
.top-info { flex: 1; min-width: 0; }
.top-name {
  display: block;
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.top-score {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-gold);
}

/* ── Today Stats Cell ── */
.today-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  justify-content: center;
}
.today-stat {
  text-align: center;
  padding: 12px;
  background: var(--color-bg-secondary);
  border-radius: var(--border-radius-sm);
}
.today-stat__value {
  display: block;
  font-family: var(--font-mono);
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--color-accent);
}
.today-stat__label {
  display: block;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

/* ── Online Users Cell ── */
.online-users-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  flex: 1;
}
.online-user-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.online-avatar-wrap {
  position: relative;
  width: 44px;
  height: 44px;
}
.online-dot {
  position: absolute;
  bottom: 1px;
  right: 1px;
  width: 10px;
  height: 10px;
  background: #4caf50;
  border-radius: 50%;
  border: 2px solid var(--color-bg-primary);
}
.online-name {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60px;
  text-align: center;
}

/* ── Community Cell ── */
.post-grid-bento {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex: 1;
}
.post-card-mini {
  padding: 14px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, box-shadow 0.2s;
}
.post-card-mini:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(44, 44, 44, 0.06);
  color: inherit;
}
.post-meta-sm { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.pin-badge { font-size: 0.75rem; }
.post-category-sm {
  font-size: 0.7rem;
  color: var(--color-green);
  background: rgba(46, 92, 76, 0.1);
  padding: 1px 6px;
  border-radius: 3px;
}
.post-title-sm {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.post-footer-sm {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

/* ── Closing Cell ── */
.bento-cell--closing {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--glass-bg-card), var(--color-bg-secondary));
}
.closing-inner { text-align: center; }
.closing-quote-text {
  font-family: var(--font-title);
  font-size: 1.5rem;
  color: var(--color-text-primary);
  margin-bottom: 6px;
}
.closing-quote-src {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}

/* ═══════════════════ Responsive ═══════════════════ */
@media (max-width: 768px) {
  .hero-title { font-size: 3rem; letter-spacing: 1rem; }
  .hero-greeting { font-size: 2rem; }
  .hero-seal { display: none; }
  .hero-moon { width: 100px; right: 5%; top: 8%; opacity: 0.5; }
  .crane { display: none; }
  .mist-layer { display: none; }
  .water-layer { width: 160%; left: -30%; opacity: 0.25; }

  .bento-grid {
    grid-template-columns: 1fr;
  }
  .bento-cell--rooms,
  .bento-cell--community,
  .bento-cell--closing {
    grid-column: span 1;
    grid-row: span 1;
  }
  .post-grid-bento { grid-template-columns: 1fr; }
}

@media (max-width: 480px) {
  .hero-moon { width: 70px; }
  .water-layer { display: none; }
  .mini-stats { grid-template-columns: 1fr; }
}
</style>
