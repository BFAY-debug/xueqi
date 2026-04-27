<template>
  <div class="login-page">
    <div class="login-left">
      <div class="deco-content">
        <img src="@/assets/textures/bamboo.svg" class="bamboo-deco" alt="" />
        <div class="vertical-text quote">有朋自远方来</div>
        <div class="vertical-text sub-quote">不亦乐乎</div>
      </div>
    </div>
    <div class="login-right">
      <div class="form-container">
        <h1 class="form-title">学栖</h1>
        <p class="form-subtitle">注册新学籍</p>

        <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent="handleRegister" class="login-form">
          <el-form-item prop="username">
            <el-input v-model="form.username" placeholder="用户名（3-50位）" size="large" />
          </el-form-item>
          <el-form-item prop="email">
            <el-input v-model="form.email" placeholder="邮箱" size="large" />
          </el-form-item>
          <el-form-item prop="password">
            <el-input v-model="form.password" type="password" placeholder="密码（至少6位）" size="large" show-password />
          </el-form-item>
          <el-form-item prop="confirmPassword">
            <el-input v-model="form.confirmPassword" type="password" placeholder="确认密码" size="large" show-password />
          </el-form-item>
          <el-form-item>
            <el-input v-model="form.accountId" placeholder="账号ID（选填）" size="large" />
          </el-form-item>
          <el-form-item>
            <div class="captcha-row">
              <input v-model="captchaCode" class="captcha-input" placeholder="验证码" maxlength="4" />
              <div class="captcha-img" @click="refreshCaptcha" v-html="captchaSvg" title="点击刷新"></div>
            </div>
          </el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading" class="submit-btn" size="large">
            注 册
          </el-button>
        </el-form>

        <p class="switch-text">
          已有学籍？
          <router-link :to="loginLink">去登录</router-link>
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
const formRef = ref(null)
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

const form = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  accountId: ''
})

const validateConfirm = (rule, value, callback) => {
  if (value !== form.value.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度在 3-50 之间', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' }
  ]
}

const redirect = computed(() => route.query.redirect || '/')
const loginLink = computed(() => `/login?redirect=${encodeURIComponent(redirect.value)}`)

async function handleRegister() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const res = await userStore.register({
      username: form.value.username,
      email: form.value.email,
      password: form.value.password,
      accountId: form.value.accountId || undefined,
      captchaUuid: captchaUuid.value,
      captchaCode: captchaCode.value
    })
    const accountId = res.data?.accountId
    if (accountId) {
      ElMessage.success(`注册成功！你的账号ID: ${accountId}`)
    } else {
      ElMessage.success('注册成功，请登录')
    }
    router.push(`/login?redirect=${encodeURIComponent(redirect.value)}`)
  } catch (err) {
    ElMessage.error(err.message || '注册失败')
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
