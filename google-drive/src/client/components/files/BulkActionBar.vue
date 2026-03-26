<script setup lang="ts">
import type { FileItem } from '../../types';

const props = defineProps<{
  selectedFiles: FileItem[];
  isTrashView: boolean;
}>();

const emit = defineEmits<{
  moveTo: [];
  trash: [];
  download: [];
  restore: [];
  deleteForever: [];
  clearSelection: [];
}>();

const hasFolders = () => props.selectedFiles.some(f => f.isFolder);
const totalSize = () => props.selectedFiles.reduce((sum, f) => sum + Number(f.size), 0);
const MAX_BULK_DOWNLOAD_SIZE = 500 * 1024 * 1024;

function canBulkDownload(): { allowed: boolean; reason: string } {
  if (hasFolders()) return { allowed: false, reason: 'Folders cannot be downloaded in bulk' };
  if (props.selectedFiles.length > 50) return { allowed: false, reason: 'Maximum 50 files per download' };
  if (totalSize() > MAX_BULK_DOWNLOAD_SIZE) return { allowed: false, reason: 'Total size exceeds 500 MB' };
  return { allowed: true, reason: '' };
}
</script>

<template>
  <div class="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center gap-3 mb-2">
    <span class="text-sm font-medium text-blue-800">
      {{ selectedFiles.length }} selected
    </span>

    <div class="flex-1" />

    <template v-if="isTrashView">
      <button
        @click="emit('restore')"
        class="text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-100 px-3 py-1 rounded"
      >
        Restore
      </button>
      <button
        @click="emit('deleteForever')"
        class="text-sm text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded"
      >
        Delete forever
      </button>
    </template>
    <template v-else>
      <button
        @click="emit('moveTo')"
        class="text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-100 px-3 py-1 rounded"
      >
        Move to
      </button>
      <button
        @click="emit('trash')"
        class="text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-100 px-3 py-1 rounded"
      >
        Move to trash
      </button>
      <button
        v-if="canBulkDownload().allowed"
        @click="emit('download')"
        class="text-sm text-blue-700 hover:text-blue-900 hover:bg-blue-100 px-3 py-1 rounded"
      >
        Download
      </button>
      <span
        v-else
        class="text-xs text-gray-500 italic"
        :title="canBulkDownload().reason"
      >
        {{ canBulkDownload().reason }}
      </span>
    </template>

    <button
      @click="emit('clearSelection')"
      class="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded"
    >
      ✕
    </button>
  </div>
</template>
