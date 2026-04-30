<template>
  <el-config-provider :locale="zhCn">
    <AppNavbar v-if="showNavbar" />
    <router-view v-slot="{ Component }">
      <Transition name="page-fade" mode="out-in">
        <component :is="Component" />
      </Transition>
    </router-view>
    <GlobalChat v-if="userStore.isLoggedIn" />
  </el-config-provider>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import AppNavbar from '@/components/AppNavbar.vue'
import GlobalChat from '@/components/GlobalChat.vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const route = useRoute()
const userStore = useUserStore()
const showNavbar = computed(() => !['Login', 'Register', 'AdminLogin'].includes(route.name))
</script>

<style>
.page-fade-enter-active { transition: opacity 0.25s ease; }
.page-fade-leave-active { transition: opacity 0.15s ease; }
.page-fade-enter-from,
.page-fade-leave-to { opacity: 0; }
</style>
