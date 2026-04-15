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

      <!-- Podium -->
      <AppLoading v-if="loading" type="card" :count="3" />
      <template v-else>
        <div class="podium glass-card" v-if="top3.length >= 3">
          <div class="podium-item second">
            <div class="podium-avatar">{{ top3[1]?.nickname?.[0] || '?' }}</div>
            <div class="podium-name">{{ top3[1]?.nickname || '-' }}</div>
            <div class="podium-score">{{ scoreField(top3[1]) }}</div>
            <div class="podium-medal">🥈</div>
          </div>
          <div class="podium-item first">
            <div class="podium-avatar">{{ top3[0]?.nickname?.[0] || '?' }}</div>
            <div class="podium-name">{{ top3[0]?.nickname || '-' }}</div>
            <div class="podium-score">{{ scoreField(top3[0]) }}</div>
            <div class="podium-medal">🥇</div>
          </div>
          <div class="podium-item third">
            <div class="podium-avatar">{{ top3[2]?.nickname?.[0] || '?' }}</div>
            <div class="podium-name">{{ top3[2]?.nickname || '-' }}</div>
            <div class="podium-score">{{ scoreField(top3[2]) }}</div>
            <div class="podium-medal">🥉</div>
          </div>
        </div>

        <!-- Rank List -->
        <div class="rank-list card" v-if="list.length">
          <div v-for="(u, i) in list" :key="u.id" class="rank-item">
            <span class="rank-num">{{ i + 4 }}</span>
            <span class="rank-avatar">{{ u.nickname?.[0] || '?' }}</span>
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
import { ref, computed, onMounted } from 'vue'
import AppNavbar from '@/components/AppNavbar.vue'
import BackButton from '@/components/BackButton.vue'
import AppFooter from '@/components/AppFooter.vue'
import AppLoading from '@/components/AppLoading.vue'
import AppEmpty from '@/components/AppEmpty.vue'
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

const top3 = computed(() => allData.value.slice(0, 3))
const list = computed(() => allData.value.slice(3))

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
}

onMounted(fetchData)
</script>

<style scoped>
.page-wrapper { min-height: 100vh; background: var(--color-bg-primary); }
.page-title { font-family: var(--font-title); font-size: 1.8rem; margin-bottom: 20px; text-align: center; }

.lb-tabs { display: flex; gap: 16px; justify-content: center; margin-bottom: 32px; }
.lb-tab { padding: 6px 16px; font-size: 0.9rem; cursor: pointer; border-radius: 4px; color: var(--color-text-secondary); transition: all 0.2s; }
.lb-tab:hover { color: var(--color-accent); }
.lb-tab.active { background: var(--color-accent); color: #fff; border-radius: 20px; }

.podium { display: flex; align-items: flex-end; justify-content: center; gap: 24px; padding: 40px 24px; margin-bottom: 24px; }
.podium-item { text-align: center; padding: 20px 28px; }
.podium-item.first { padding: 28px 36px; }
.podium-avatar { width: 52px; height: 52px; border-radius: 50%; background: var(--color-accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-family: var(--font-title); margin: 0 auto 10px; }
.podium-item.first .podium-avatar { width: 68px; height: 68px; font-size: 1.5rem; }
.podium-name { font-weight: 600; margin-bottom: 4px; }
.podium-score { font-family: var(--font-mono); color: var(--color-accent); font-weight: 700; font-size: 0.9rem; margin-bottom: 6px; }
.podium-medal { font-size: 1.3rem; }
.podium-item.first .podium-medal { font-size: 1.8rem; }

.rank-list { padding: 0; overflow: hidden; }
.rank-item { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid var(--color-border-light); }
.rank-item:last-child { border-bottom: none; }
.rank-num { font-family: var(--font-mono); font-weight: 700; color: var(--color-text-secondary); width: 30px; text-align: center; }
.rank-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--color-blue); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-family: var(--font-title); }
.rank-name { flex: 1; font-size: 0.9rem; }
.rank-level { font-size: 0.8rem; color: var(--color-text-secondary); }
.rank-score { font-family: var(--font-mono); font-size: 0.9rem; font-weight: 600; color: var(--color-accent); }
.empty-text { text-align: center; padding: 40px; color: var(--color-text-secondary); }

.my-rank { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; margin-top: 16px; background: var(--color-accent-light); border-left: 3px solid var(--color-accent); font-size: 0.9rem; }
</style>
