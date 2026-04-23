<template>
  <footer class="footer">
    <div class="footer-divider">
      <svg class="cloud-deco" viewBox="0 0 200 60"><use href="@/assets/textures/cloud-pattern.svg" /></svg>
    </div>
    <div class="footer-inner container">
      <div class="footer-brand">
        <span class="footer-logo">学栖</span>
        <span class="footer-slogan">墨韵书声 · 栖心之所</span>
      </div>
      <div class="footer-links">
        <a @click.prevent="openDrawer('about')">关于学栖</a>
        <a @click.prevent="openDrawer('feedback')">使用反馈</a>
        <a @click.prevent="openDrawer('team')">开发团队</a>
      </div>
      <div class="footer-copy">
        &copy; {{ year }} 学栖 · 以学习为核心的社区平台
      </div>
    </div>

    <FooterDrawer :visible="drawerVisible" :type="drawerType" @close="drawerVisible = false" />
  </footer>
</template>

<script setup>
import { ref } from 'vue'
import FooterDrawer from '@/components/FooterDrawer.vue'

const year = new Date().getFullYear()
const drawerVisible = ref(false)
const drawerType = ref('about')

function openDrawer(type) {
  drawerType.value = type
  drawerVisible.value = true
}
</script>

<style scoped>
.footer {
  margin-top: 80px;
  padding: 40px 0 24px;
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border-light);
}

.footer-divider {
  text-align: center;
  opacity: 0.3;
  margin-bottom: 24px;
}

.footer-inner {
  text-align: center;
}

.footer-brand {
  margin-bottom: 12px;
}

.footer-logo {
  font-family: var(--font-title);
  font-size: 1.25rem;
  color: var(--color-accent);
  font-weight: 600;
}

.footer-slogan {
  margin-left: 12px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 16px;
}

.footer-links a {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s;
}

.footer-links a:hover {
  color: var(--color-accent);
}

.footer-copy {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  opacity: 0.7;
}
</style>
