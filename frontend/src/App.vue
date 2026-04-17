<template>
  <router-view v-slot="{ Component }">
    <Transition name="page-fade" mode="out-in">
      <component :is="Component" />
    </Transition>
  </router-view>
  <GlobalChat v-if="userStore.isLoggedIn" />
</template>

<script setup>
import { useUserStore } from '@/stores/user'
import GlobalChat from '@/components/GlobalChat.vue'

const userStore = useUserStore()
</script>

<style>
.page-fade-enter-active { transition: opacity 0.3s ease; }
.page-fade-leave-active { transition: opacity 0.2s ease; }
.page-fade-enter-from,
.page-fade-leave-to { opacity: 0; }
</style>
