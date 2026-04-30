<template>
  <div class="admin-login-page">
    <div class="admin-login-card">
      <h1 class="form-title">管理后台</h1>
      <p class="form-subtitle">管理员专用入口</p>

      <el-form @submit.prevent="handleAdminLogin" class="login-form">
        <el-form-item>
          <el-input v-model="form.username" placeholder="管理员账号" size="large" prefix-icon="User" />
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
          安全登录
        </el-button>
      </el-form>

      <p class="switch-text">
        <router-link to="/login">返回用户登录</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { authAPI } from '@/api/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)

const captchaSvg = ref('')
const captchaUuid = ref('')
const captchaCode = ref('')
const form = ref({ username: '', password: '' })

async function refreshCaptcha() {
  try {
    const res = await authAPI.getCaptcha()
    captchaSvg.value = res.data.svg
    captchaUuid.value = res.data.uuid
    captchaCode.value = ''
  } catch { /* ignore */ }
}

onMounted(() => refreshCaptcha())

async function handleAdminLogin() {
  if (!form.value.username || !form.value.password) {
    return ElMessage.warning('请填写账号和密码')
  }
  loading.value = true
  try {
    await userStore.adminLogin({
      ...form.value,
      captchaUuid: captchaUuid.value,
      captchaCode: captchaCode.value
    })
    ElMessage.success('登录成功')
    router.push('/admin')
  } catch (err) {
    ElMessage.error(err.message || '登录失败')
    refreshCaptcha()
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.admin-login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
}

.admin-login-card {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.form-title {
  font-family: var(--font-title);
  font-size: 2rem;
  color: #1a1a2e;
  margin-bottom: 4px;
}

.form-subtitle {
  color: #6B6B6B;
  font-size: 0.9rem;
  margin-bottom: 32px;
}

.submit-btn {
  width: 100%;
  background-color: #1a1a2e;
  border-color: #1a1a2e;
  font-size: 1rem;
  letter-spacing: 4px;
}

.submit-btn:hover {
  background-color: #2a2a4e;
  border-color: #2a2a4e;
}

.switch-text {
  text-align: center;
  margin-top: 16px;
}

.switch-text a {
  color: #6B6B6B;
  font-size: 0.85rem;
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
  background: #fff;
}

.captcha-input:focus {
  border-color: #1a1a2e;
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
</style>
