<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();

onMounted(() => {
  auth.bootstrap();
});
</script>

<template>
  <div v-if="auth.loading" class="flex items-center justify-center h-screen">
    <div class="text-gray-500 text-lg">Loading...</div>
  </div>
  <router-view v-else />
</template>
