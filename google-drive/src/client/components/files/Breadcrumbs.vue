<script setup lang="ts">
import type { FileItem } from '../../types';

defineProps<{
  items: FileItem[];
  currentFolderName?: string;
}>();

const emit = defineEmits<{
  navigate: [folderId: string | null];
}>();
</script>

<template>
  <nav class="flex items-center gap-1 text-sm text-gray-600 py-2 min-h-[2rem]" aria-label="Breadcrumb">
    <button
      @click="emit('navigate', null)"
      class="hover:text-blue-600 hover:underline font-medium"
    >
      My Drive
    </button>
    <template v-for="item in items" :key="item.id">
      <span class="text-gray-400">/</span>
      <button
        @click="emit('navigate', item.id)"
        class="hover:text-blue-600 hover:underline"
      >
        {{ item.name }}
      </button>
    </template>
    <template v-if="currentFolderName">
      <span class="text-gray-400">/</span>
      <span class="text-gray-900 font-medium">{{ currentFolderName }}</span>
    </template>
  </nav>
</template>
