<template>
  <div class="login-page">
    <div class="login-left">
      <div class="deco-content">
        <img src="@/assets/textures/bamboo.svg" class="bamboo-deco" alt="" />
        <div class="vertical-text quote">学而时习之</div>
        <div class="vertical-text sub-quote">不亦说乎</div>
      </div>
    </div>
    <div class="login-right">
      <div class="form-container">
        <h1 class="form-title">学栖</h1>
        <p class="form-subtitle">登录你的学籍</p>

        <el-form :model="form" @submit.prevent="handleLogin" class="login-form">
          <el-form-item>
            <el-input v-model="form.username" placeholder="用户名 / 账号ID / 邮箱" size="large" prefix-icon="User" />
          </el-form-item>
          <el-form-item>
            <el-input v-model="form.password" type="password" placeholder="密码" size="large" prefix-icon="Lock" show-password />
          </el-form-item>
          <el-form-item>
            <div class="captcha-row">
              <input v-model="captchaCode" class="captcha-input" placeholder="验证码" maxlength="4" />
              <div class="captcha-img" @click="refreshCaptcha" v-html="captchaSvg" title="点击刷新"></div>
            </div>
          </el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading" class="submit-btn" size="large">
            登 录
          </el-button>
        </el-form>

        <p class="switch-text">
          还无学籍？
          <router-link :to="registerLink">去注册</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { authAPI } from '@/api/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const form = ref({ username: '', password: '' })
const loading = ref(false)

const captchaSvg = ref('')
const captchaUuid = ref('')
const captchaCode = ref('')

async function refreshCaptcha() {
  try {
    const res = await authAPI.getCaptcha()
    captchaSvg.value = res.data.svg
    captchaUuid.value = res.data.uuid
    captchaCode.value = ''
  } catch (e) { /* ignore */ }
}

onMounted(() => {
  refreshCaptcha()
})

const redirect = computed(() => route.query.redirect || '/')
const registerLink = computed(() => `/register?redirect=${encodeURIComponent(redirect.value)}`)

async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    return ElMessage.warning('请填写用户名和密码')
  }
  loading.value = true
  try {
    await userStore.login({
      ...form.value,
      captchaUuid: captchaUuid.value,
      captchaCode: captchaCode.value
    })
    ElMessage.success('登录成功')
    router.push(redirect.value)
  } catch (err) {
    ElMessage.error(err.message || '登录失败')
    refreshCaptcha()
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg-primary);
}

.login-left {
  flex: 0 0 40%;
  background: linear-gradient(135deg, #EDE6D6, #F5F0E8);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.deco-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 24px;
}

.bamboo-deco {
  position: absolute;
  right: -30px;
  top: -80px;
  height: 300px;
  opacity: 0.5;
}

.vertical-text {
  writing-mode: vertical-rl;
  font-family: var(--font-title);
  font-size: 1.8rem;
  color: var(--color-text-primary);
  opacity: 0.3;
}

.vertical-text.sub-quote {
  font-size: 1.4rem;
}

.login-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.form-container {
  width: 100%;
  max-width: 400px;
}

.form-title {
  font-family: var(--font-title);
  font-size: 2.5rem;
  color: var(--color-accent);
  margin-bottom: 8px;
}

.form-subtitle {
  color: var(--color-text-secondary);
  margin-bottom: 32px;
}

.login-form {
  margin-bottom: 24px;
}

.submit-btn {
  width: 100%;
  background-color: var(--color-accent);
  border-color: var(--color-accent);
  font-family: var(--font-title);
  font-size: 1.1rem;
  letter-spacing: 4px;
}

.submit-btn:hover {
  background-color: var(--color-accent-hover);
  border-color: var(--color-accent-hover);
}

.switch-text {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.switch-text a {
  color: var(--color-accent);
  text-decoration: none;
}

.captcha-row {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.captcha-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  background: var(--color-bg-primary);
}

.captcha-input:focus {
  border-color: var(--color-accent);
}

.captcha-img {
  cursor: pointer;
  height: 40px;
  min-width: 120px;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.captcha-img:hover {
  opacity: 0.8;
}

@media (max-width: 768px) {
  .login-left { display: none; }
  .login-right { padding: 20px; }
}
</style>
