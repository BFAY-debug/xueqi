import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/',
    component: () => import('@/views/HomePage.vue')
  },
  {
    path: '/login',
    component: () => import('@/views/LoginPage.vue')
  },
  {
    path: '/register',
    component: () => import('@/views/RegisterPage.vue')
  },
  {
    path: '/study-rooms',
    component: () => import('@/views/StudyRoomsPage.vue')
  },
  {
    path: '/seat-booking',
    component: () => import('@/views/SeatBookingPage.vue')
  },
  {
    path: '/books',
    component: () => import('@/views/BooksPage.vue')
  },
  {
    path: '/books/:id',
    component: () => import('@/views/BookDetailPage.vue')
  },
  {
    path: '/community',
    component: () => import('@/views/CommunityPage.vue')
  },
  {
    path: '/community/create',
    component: () => import('@/views/KnowledgeEditPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/community/posts/:id/edit',
    component: () => import('@/views/KnowledgeEditPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/community/posts/:id',
    component: () => import('@/views/PostDetailPage.vue')
  },
  {
    path: '/community/proposals/create/:postId',
    component: () => import('@/views/ProposalPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/community/proposals/:id',
    component: () => import('@/views/ProposalPage.vue')
  },
  {
    path: '/leaderboard',
    component: () => import('@/views/LeaderboardPage.vue')
  },
  {
    path: '/profile',
    component: () => import('@/views/ProfilePage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    component: () => import('@/views/AdminPage.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/views/NotFoundPage.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

// Navigation guard
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  // Try to restore user session
  if (userStore.token && !userStore.user) {
    await userStore.fetchProfile()
  }

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  } else if (to.meta.requiresAdmin && !userStore.isAdmin) {
    next('/')
  } else {
    next()
  }
})

export default router
