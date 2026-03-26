<script setup lang="ts">
import { useUpload } from '../../composables/useUpload';

const upload = useUpload();

function statusLabel(status: string): string {
  switch (status) {
    case 'queued': return 'Queued';
    case 'uploading': return 'Uploading';
    case 'completed': return 'Completed';
    case 'failed': return 'Failed';
    case 'canceled': return 'Canceled';
    default: return status;
  }
}
</script>

<template>
  <div
    v-if="upload.hasItems.value"
    class="fixed bottom-0 right-4 w-80 bg-white border border-gray-300 rounded-t-lg shadow-xl z-40"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between px-4 py-2 bg-gray-50 rounded-t-lg cursor-pointer border-b"
      @click="upload.collapsed.value = !upload.collapsed.value"
    >
      <span class="text-sm font-medium">
        <template v-if="upload.allDone.value">Uploads complete</template>
        <template v-else>Uploading {{ upload.activeCount.value }} file(s)</template>
      </span>
      <div class="flex items-center gap-2">
        <button
          v-if="upload.allDone.value"
          class="text-xs text-gray-500 hover:text-gray-700"
          @click.stop="upload.clearCompleted()"
        >
          Clear
        </button>
        <span class="text-gray-400 text-xs">{{ upload.collapsed.value ? '▲' : '▼' }}</span>
      </div>
    </div>

    <!-- File list -->
    <div v-if="!upload.collapsed.value" class="max-h-64 overflow-auto">
      <div
        v-for="item in upload.items.value"
        :key="item.id"
        class="px-4 py-2 border-b border-gray-100 last:border-0"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm truncate flex-1" :title="item.file.name">{{ item.file.name }}</span>
          <div class="flex items-center gap-1 shrink-0">
            <template v-if="item.status === 'uploading'">
              <span class="text-xs text-gray-500">{{ item.progress }}%</span>
              <button
                @click="upload.cancelUpload(item.id)"
                class="text-xs text-red-500 hover:text-red-700 px-1"
                title="Cancel"
              >
                ✕
              </button>
            </template>
            <template v-else-if="item.status === 'failed' || item.status === 'canceled'">
              <button
                @click="upload.retryUpload(item.id)"
                class="text-xs text-blue-600 hover:text-blue-800 px-1"
              >
                Retry
              </button>
            </template>
            <template v-else-if="item.status === 'completed'">
              <span class="text-xs text-green-600">✓</span>
            </template>
            <template v-else>
              <span class="text-xs text-gray-400">{{ statusLabel(item.status) }}</span>
            </template>
          </div>
        </div>

        <!-- Progress bar -->
        <div v-if="item.status === 'uploading'" class="mt-1 w-full bg-gray-200 rounded-full h-1">
          <div class="bg-blue-500 h-1 rounded-full transition-all" :style="{ width: `${item.progress}%` }" />
        </div>

        <!-- Error message -->
        <div v-if="item.error" class="text-xs text-red-500 mt-0.5">{{ item.error }}</div>
      </div>
    </div>
  </div>
</template>
