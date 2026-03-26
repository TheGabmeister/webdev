<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const searchInput = ref('');

function handleSearch() {
  const q = searchInput.value.trim();
  if (q) {
    router.push({ path: '/drive/search', query: { q } });
  }
}
</script>

<template>
  <header class="bg-white border-b px-4 py-2 flex items-center gap-4 h-14 shrink-0">
    <h1 class="text-xl font-semibold text-gray-800 whitespace-nowrap">Drive</h1>

    <form @submit.prevent="handleSearch" class="flex-1 max-w-xl mx-auto">
      <input
        v-model="searchInput"
        type="text"
        placeholder="Search in Drive"
        aria-label="Search files"
        class="w-full px-4 py-2 bg-gray-100 rounded-lg border border-transparent focus:border-blue-500 focus:bg-white focus:outline-none text-sm"
      />
    </form>

    <div class="flex items-center gap-3">
      <span class="text-sm text-gray-500">{{ auth.user?.email }}</span>
      <button
        @click="auth.logout()"
        class="text-sm text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
      >
        Sign out
      </button>
    </div>
  </header>
</template>
