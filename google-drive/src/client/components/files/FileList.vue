<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { FileItem } from '../../types';
import FileRow from './FileRow.vue';

const props = defineProps<{
  files: FileItem[];
  loading: boolean;
  selectedIds: Set<string>;
}>();

const emit = defineEmits<{
  open: [file: FileItem];
  contextmenu: [event: MouseEvent, file: FileItem];
  select: [file: FileItem, index: number, event: MouseEvent | KeyboardEvent];
  keyaction: [action: string, file: FileItem];
}>();

const focusedIndex = ref(0);
const tableRef = ref<HTMLElement>();

function handleKeydown(e: KeyboardEvent) {
  if (!props.files.length) return;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      focusedIndex.value = Math.min(focusedIndex.value + 1, props.files.length - 1);
      if (e.shiftKey) {
        emit('select', props.files[focusedIndex.value], focusedIndex.value, e);
      }
      break;
    case 'ArrowUp':
      e.preventDefault();
      focusedIndex.value = Math.max(focusedIndex.value - 1, 0);
      if (e.shiftKey) {
        emit('select', props.files[focusedIndex.value], focusedIndex.value, e);
      }
      break;
    case 'Enter':
      e.preventDefault();
      emit('open', props.files[focusedIndex.value]);
      break;
    case ' ':
      e.preventDefault();
      emit('keyaction', 'toggle-select', props.files[focusedIndex.value]);
      break;
    case 'F2':
      e.preventDefault();
      emit('keyaction', 'rename', props.files[focusedIndex.value]);
      break;
    case 'Escape':
      e.preventDefault();
      emit('keyaction', 'escape', props.files[focusedIndex.value]);
      break;
    case 'F10':
      if (e.shiftKey) {
        e.preventDefault();
        emit('keyaction', 'contextmenu', props.files[focusedIndex.value]);
      }
      break;
    case 'ContextMenu':
      e.preventDefault();
      emit('keyaction', 'contextmenu', props.files[focusedIndex.value]);
      break;
  }
}

onMounted(() => {
  tableRef.value?.focus();
});
</script>

<template>
  <div
    ref="tableRef"
    class="flex-1 overflow-auto focus:outline-none"
    tabindex="0"
    @keydown="handleKeydown"
    role="grid"
    aria-label="File list"
  >
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
          v-for="(file, index) in files"
          :key="file.id"
          :file="file"
          :selected="selectedIds.has(file.id)"
          :focused="index === focusedIndex"
          @open="emit('open', file)"
          @select="(e: MouseEvent) => emit('select', file, index, e)"
          @contextmenu="(e, f) => emit('contextmenu', e, f)"
        />
      </tbody>
    </table>
  </div>
</template>
