<template>
  <div class="page-wrapper theme-leaderboard">
    <AppNavbar />
    <div class="page-content container" style="margin-top: var(--nav-height); padding-top: 24px;">
      <BackButton />
      <div class="page-header-decorated">
        <h2 class="page-title">🏆 金榜题名</h2>
        <p class="page-subtitle">学而优则仕</p>
      </div>

      <!-- Tabs -->
      <div class="lb-tabs">
        <span v-for="t in tabs" :key="t.value" class="lb-tab" :class="{ active: activeTab === t.value }" @click="switchTab(t.value)">{{ t.label }}</span>
      </div>

      <!-- League Badge -->
      <div class="league-badge" v-if="myRank && userStore.isLoggedIn">
        <span class="seal league-seal" :class="leagueClass">{{ leagueName }}</span>
      </div>

      <!-- Podium -->
      <AppLoading v-if="loading" type="card" :count="3" />
      <template v-else>
        <div class="podium" v-if="top3.length >= 3" ref="podiumEl">
          <div class="podium-item second">
            <UserAvatar :avatar-url="top3[1]?.avatar_url" :nickname="top3[1]?.nickname" :size="48" class="podium-avatar" />
            <div class="podium-name">{{ top3[1]?.nickname || '-' }}</div>
            <div class="podium-score">{{ scoreField(top3[1]) }}</div>
            <div class="podium-medal">🥈</div>
          </div>
          <div class="podium-item first">
            <div class="podium-glow"></div>
            <UserAvatar :avatar-url="top3[0]?.avatar_url" :nickname="top3[0]?.nickname" :size="56" class="podium-avatar" />
            <div class="podium-name">{{ top3[0]?.nickname || '-' }}</div>
            <div class="podium-score">{{ scoreField(top3[0]) }}</div>
            <div class="podium-medal">🥇</div>
          </div>
          <div class="podium-item third">
            <UserAvatar :avatar-url="top3[2]?.avatar_url" :nickname="top3[2]?.nickname" :size="48" class="podium-avatar" />
            <div class="podium-name">{{ top3[2]?.nickname || '-' }}</div>
            <div class="podium-score">{{ scoreField(top3[2]) }}</div>
            <div class="podium-medal">🥉</div>
          </div>
        </div>

        <!-- Rank List -->
        <div class="rank-list card" v-if="list.length">
          <div v-for="(u, i) in list" :key="u.id" class="rank-item">
            <span class="rank-num">{{ i + 4 }}</span>
            <UserAvatar :avatar-url="u.avatar_url" :nickname="u.nickname" :size="32" class="rank-avatar" />
            <span class="rank-name">{{ u.nickname || u.username }}</span>
            <span class="rank-level">{{ u.level_badge }} {{ u.level_name }}</span>
            <span class="rank-score">{{ scoreField(u) }}</span>
          </div>
        </div>
        <AppEmpty v-else-if="!top3.length" text="暂无金榜数据" />
      </template>

      <!-- My Rank -->
      <div v-if="myRank && userStore.isLoggedIn" class="my-rank card">
        <span>吾之排名</span>
        <span>居第 {{ myRank.pointsRank }} 名 · {{ userStore.user?.nickname }} · {{ userStore.user?.total_points || 0 }} 积分</span>
      </div>
    </div>
    <AppFooter />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import gsap from 'gsap'
import AppNavbar from '@/components/AppNavbar.vue'
import BackButton from '@/components/BackButton.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppLoading from '@/components/AppLoading.vue'
import AppEmpty from '@/components/AppEmpty.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { leaderboardAPI } from '@/api/user'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const tabs = [
  { value: 'total', label: '总榜' },
  { value: 'weekly', label: '本周榜' },
  { value: 'monthly', label: '本月榜' },
  { value: 'study', label: '修习时长' },
  { value: 'streak', label: '连续签到' }
]

const activeTab = ref('total')
const allData = ref([])
const myRank = ref(null)
const loading = ref(false)
const podiumEl = ref(null)

const top3 = computed(() => allData.value.slice(0, 3))
const list = computed(() => allData.value.slice(3))

// League badge based on user's rank
const leagueClass = computed(() => {
  const rank = myRank.value?.pointsRank
  if (!rank) return ''
  if (rank <= 3) return 'seal--level-6'
  if (rank <= 10) return 'seal--level-5'
  if (rank <= 25) return 'seal--level-4'
  if (rank <= 50) return 'seal--level-3'
  return 'seal--level-1'
})
const leagueName = computed(() => {
  const rank = myRank.value?.pointsRank
  if (!rank) return ''
  if (rank <= 3) return '墨龙'
  if (rank <= 10) return '竹虎'
  if (rank <= 25) return '松鹤'
  if (rank <= 50) return '荷鲤'
  return '兰亭'
})

function scoreField(user) {
  if (!user) return '-'
  switch (activeTab.value) {
    case 'total': return `${user.total_points || 0} 积分`
    case 'weekly': return `${user.weekly_points || 0} 积分`
    case 'monthly': return `${user.monthly_points || 0} 积分`
    case 'study': return `${Math.floor((user.total_study_minutes || 0) / 60)} 时辰`
    case 'streak': return `${user.checkin_streak || 0} 天`
    default: return '-'
  }
}

async function switchTab(tab) {
  activeTab.value = tab
  await fetchData()
}

function animatePodium() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReducedMotion) return

  const items = document.querySelectorAll('.podium-item')
  if (!items.length) return

  // Slide in from bottom with stagger
  gsap.from(items, {
    y: 60,
    opacity: 0,
    duration: 0.8,
    stagger: 0.15,
    ease: 'back.out(1.7)',
    delay: 0.2
  })

  // First place "seal stamp" entrance
  const firstAvatar = document.querySelector('.podium-item.first .podium-avatar')
  if (firstAvatar) {
    gsap.from(firstAvatar, {
      rotation: -20,
      scale: 0.5,
      opacity: 0,
      duration: 1,
      ease: 'back.out(1.4)',
      delay: 0.6
    })
  }
}

async function fetchData() {
  loading.value = true
  try {
    const apis = {
      total: leaderboardAPI.getPoints,
      weekly: leaderboardAPI.getWeekly,
      monthly: leaderboardAPI.getMonthly,
      study: leaderboardAPI.getStudy,
      streak: leaderboardAPI.getStreak
    }
    const res = await apis[activeTab.value]({ pageSize: 50 })
    allData.value = res.data || []
  } catch { /* ignore */ }
  finally { loading.value = false }

  if (userStore.isLoggedIn) {
    try {
      const res = await leaderboardAPI.getMyRank()
      myRank.value = res.data
    } catch { /* ignore */ }
  }

  await nextTick()
  animatePodium()
}

onMounted(fetchData)
</script>

<style scoped>
.page-wrapper { min-height: 100vh; background: var(--color-bg-primary); }
.page-title { font-family: var(--font-title); font-size: 1.8rem; margin-bottom: 20px; text-align: center; }

.lb-tabs { display: flex; gap: 16px; justify-content: center; margin-bottom: 24px; }
.lb-tab { padding: 6px 16px; font-size: 0.9rem; cursor: pointer; border-radius: 4px; color: var(--color-text-secondary); transition: all 0.2s; }
.lb-tab:hover { color: var(--color-accent); }
.lb-tab.active { background: var(--color-accent); color: #fff; border-radius: 20px; }

/* League Badge */
.league-badge { text-align: center; margin-bottom: 20px; }
.league-seal { font-size: 0.85rem; padding: 4px 14px; }

/* Podium */
.podium { display: flex; align-items: flex-end; justify-content: center; gap: 24px; padding: 40px 24px; margin-bottom: 24px; }
.podium-item {
  text-align: center;
  padding: 20px 28px;
  background: var(--glass-bg-card);
  border: var(--glass-border);
  border-radius: var(--border-radius);
  position: relative;
  transition: transform 0.3s;
}
.podium-item:hover { transform: translateY(-4px); }
.podium-item.first {
  padding: 28px 36px;
  border-color: var(--color-gold);
  box-shadow: 0 4px 30px rgba(184, 134, 11, 0.15);
}
.podium-avatar {
  margin: 0 auto 10px;
}
.podium-item.first .podium-avatar {
  box-shadow: 0 0 20px rgba(184, 134, 11, 0.4), 0 0 40px rgba(184, 134, 11, 0.15);
}
.podium-name { font-weight: 600; margin-bottom: 4px; }
.podium-score { font-family: var(--font-mono); color: var(--color-accent); font-weight: 700; font-size: 0.9rem; margin-bottom: 6px; }
.podium-medal { font-size: 1.3rem; }
.podium-item.first .podium-medal { font-size: 1.8rem; }

/* Gold glow pulse for first place */
.podium-glow {
  position: absolute;
  inset: -4px;
  border: 2px solid var(--color-gold);
  border-radius: var(--border-radius);
  opacity: 0;
  animation: gold-pulse 3s ease-in-out infinite;
  pointer-events: none;
}
@keyframes gold-pulse {
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.02); }
}

/* Rank List */
.rank-list { padding: 0; overflow: hidden; }
.rank-item { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid var(--color-border-light); transition: background 0.15s; }
.rank-item:last-child { border-bottom: none; }
.rank-item:hover { background: var(--color-accent-light); }
.rank-num { font-family: var(--font-mono); font-weight: 700; color: var(--color-text-secondary); width: 30px; text-align: center; }
.rank-avatar { flex-shrink: 0; }
.rank-name { flex: 1; font-size: 0.9rem; }
.rank-level { font-size: 0.8rem; color: var(--color-text-secondary); }
.rank-score { font-family: var(--font-mono); font-size: 0.9rem; font-weight: 600; color: var(--color-accent); }

.my-rank { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; margin-top: 16px; background: var(--color-accent-light); border-left: 3px solid var(--color-accent); font-size: 0.9rem; }

@media (max-width: 768px) {
  .podium {
    flex-direction: column;
    align-items: center;
  }
  .podium-item.first { order: -1; }
  .lb-tabs { flex-wrap: wrap; gap: 8px; }
}
</style>
