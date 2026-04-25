<template>
  <AppNavbar v-if="showNavbar" />
  <router-view v-slot="{ Component }">
    <Transition name="page-fade" mode="out-in">
      <component :is="Component" />
    </Transition>
  </router-view>
  <GlobalChat v-if="userStore.isLoggedIn" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import AppNavbar from '@/components/AppNavbar.vue'
import GlobalChat from '@/components/GlobalChat.vue'

const route = useRoute()
const userStore = useUserStore()
const showNavbar = computed(() => !['Login', 'Register'].includes(route.name))
</script>

<style>
.page-fade-enter-active { transition: opacity 0.25s ease; }
.page-fade-leave-active { transition: opacity 0.15s ease; }
.page-fade-enter-from,
.page-fade-leave-to { opacity: 0; }
</style>
