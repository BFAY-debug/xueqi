<template>
  <div class="not-found-page">
    <AppNavbar />
    <div class="not-found-content">
      <!-- Ink wash decoration -->
      <div class="ink-bg">
        <img src="@/assets/textures/ink-mountains-far.svg" class="ink-mountains" alt="" />
        <img src="@/assets/textures/ink-mist.svg" class="ink-mist" alt="" />
      </div>
      <div class="not-found-body">
        <h1 class="not-found-title">肆零肆</h1>
        <div class="not-found-seal">迷</div>
        <p class="not-found-text">此处山高水远，未寻得所往之地</p>
        <p class="not-found-hint">迷路的书生，不妨回到栖心之所</p>
        <router-link to="/" class="btn-primary btn-lg">返回首页</router-link>
      </div>
    </div>
    <AppFooter />
  </div>
</template>

<script setup>
import AppNavbar from '@/components/AppNavbar.vue'
import AppFooter from '@/components/AppFooter.vue'
</script>

<style scoped>
.not-found-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.not-found-content {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(180deg, var(--color-bg-primary) 0%, #EDE6D6 50%, var(--color-bg-primary) 100%);
}

.ink-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.ink-mountains {
  position: absolute;
  bottom: 0;
  width: 140%;
  left: -20%;
  opacity: 0.15;
}

.ink-mist {
  position: absolute;
  bottom: 15%;
  width: 110%;
  left: -5%;
  opacity: 0.3;
  pointer-events: none;
}

.not-found-body {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 40px 20px;
}

.not-found-title {
  font-family: var(--font-title);
  font-size: 8rem;
  color: var(--color-text-primary);
  letter-spacing: 1rem;
  margin-bottom: 16px;
  opacity: 0.12;
  position: relative;
}

.not-found-title::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
  opacity: 0.3;
}

.not-found-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border: 2.5px solid var(--color-accent);
  border-radius: 6px;
  font-family: var(--font-title);
  font-size: 1.4rem;
  color: var(--color-accent);
  transform: rotate(-8deg);
  opacity: 0.2;
  margin-bottom: 24px;
}

.not-found-text {
  font-family: var(--font-title);
  font-size: 1.3rem;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.not-found-hint {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  opacity: 0.7;
  margin-bottom: 32px;
}

.btn-lg {
  padding: 14px 32px;
  font-size: 1.05rem;
}

@media (max-width: 768px) {
  .not-found-title {
    font-size: 5rem;
  }
  .ink-mountains {
    width: 180%;
    left: -40%;
  }
  .ink-mist {
    display: none;
  }
}
</style>
