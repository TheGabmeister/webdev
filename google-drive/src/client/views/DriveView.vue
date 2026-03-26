<script setup lang="ts">
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b px-6 py-3 flex items-center justify-between">
      <h1 class="text-xl font-semibold">Drive</h1>
      <div class="flex items-center gap-4">
        <span class="text-sm text-gray-600">{{ auth.user?.email }}</span>
        <button
          @click="auth.logout()"
          class="text-sm text-gray-600 hover:text-gray-900"
        >
          Sign out
        </button>
      </div>
    </header>
    <main class="p-6">
      <p class="text-gray-500">Drive view — coming in Milestone 5</p>
    </main>
  </div>
</template>
