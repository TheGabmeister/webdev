<script setup lang="ts">
import type { FileItem } from '../../types';
import FileRow from './FileRow.vue';

defineProps<{
  files: FileItem[];
  loading: boolean;
}>();

const emit = defineEmits<{
  open: [file: FileItem];
  contextmenu: [event: MouseEvent, file: FileItem];
}>();
</script>

<template>
  <div class="flex-1 overflow-auto">
    <div v-if="loading" class="flex items-center justify-center h-64">
      <div class="text-gray-400">Loading...</div>
    </div>

    <div v-else-if="files.length === 0" class="flex items-center justify-center h-64">
      <div class="text-gray-400 text-center">
        <p class="text-lg mb-1">No files here</p>
        <p class="text-sm">Drop files here or use the New button</p>
      </div>
    </div>

    <table v-else class="w-full">
      <thead>
        <tr class="border-b border-gray-200 text-left">
          <th class="px-4 py-2 text-sm font-medium text-gray-600">Name</th>
          <th class="px-4 py-2 text-sm font-medium text-gray-600 w-36">Last modified</th>
          <th class="px-4 py-2 text-sm font-medium text-gray-600 w-28 text-right">File size</th>
        </tr>
      </thead>
      <tbody>
        <FileRow
          v-for="file in files"
          :key="file.id"
          :file="file"
          @open="emit('open', file)"
          @contextmenu="(e, f) => emit('contextmenu', e, f)"
        />
      </tbody>
    </table>
  </div>
</template>
