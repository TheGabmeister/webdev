<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useFilesStore } from '../../stores/files';

const emit = defineEmits<{
  newFolder: [];
  uploadFile: [];
}>();

const router = useRouter();
const route = useRoute();
const filesStore = useFilesStore();
const showNewMenu = ref(false);

onMounted(() => {
  filesStore.fetchStorage();
});

function toggleNewMenu() {
  showNewMenu.value = !showNewMenu.value;
}

function closeNewMenu() {
  showNewMenu.value = false;
}

function handleNewFolder() {
  closeNewMenu();
  emit('newFolder');
}

function isActive(name: string): boolean {
  if (name === 'drive') return route.name === 'drive' || route.name === 'drive-folder';
  if (name === 'starred') return route.name === 'drive-starred';
  if (name === 'trash') return route.name === 'drive-trash';
  return false;
}
</script>

<template>
  <aside class="w-56 bg-white border-r flex flex-col shrink-0 h-full">
    <div class="p-3">
      <div class="relative">
        <button
          @click="toggleNewMenu"
          class="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-2xl shadow-sm hover:shadow-md text-sm font-medium text-gray-700"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New
        </button>

        <div
          v-if="showNewMenu"
          class="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
          @click.stop
        >
          <button
            @click="handleNewFolder"
            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            New folder
          </button>
          <button
            @click="closeNewMenu(); emit('uploadFile')"
            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload file
          </button>
        </div>
      </div>
    </div>

    <!-- Click outside to close -->
    <div v-if="showNewMenu" class="fixed inset-0 z-40" @click="closeNewMenu" />

    <nav class="flex-1 px-2 space-y-0.5">
      <router-link
        to="/drive"
        class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
        :class="isActive('drive') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        My Drive
      </router-link>

      <router-link
        to="/drive/starred"
        class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
        :class="isActive('starred') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        Starred
      </router-link>

      <router-link
        to="/drive/trash"
        class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
        :class="isActive('trash') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Trash
      </router-link>
    </nav>

    <div class="p-4 border-t">
      <div class="text-xs text-gray-500 mb-1">{{ filesStore.storageText }}</div>
      <div class="w-full bg-gray-200 rounded-full h-1.5">
        <div
          class="h-1.5 rounded-full transition-all"
          :class="filesStore.storageColor"
          :style="{ width: `${Math.min(filesStore.storagePercent, 100)}%` }"
        />
      </div>
    </div>
  </aside>
</template>
