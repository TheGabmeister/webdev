<script setup lang="ts">
import type { FileItem } from '../../types';

const props = defineProps<{
  file: FileItem;
}>();

const emit = defineEmits<{
  open: [file: FileItem];
  contextmenu: [event: MouseEvent, file: FileItem];
}>();

function handleClick() {
  if (props.file.isFolder) {
    emit('open', props.file);
  }
}

function handleDoubleClick() {
  if (!props.file.isFolder) {
    emit('open', props.file);
  }
}

function formatSize(sizeStr: string): string {
  const size = Number(sizeStr);
  if (size === 0) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getIcon(file: FileItem): string {
  if (file.isFolder) return '📁';
  const mime = file.mimeType || '';
  if (mime.startsWith('image/')) return '🖼️';
  if (mime === 'application/pdf') return '📄';
  if (mime.includes('zip') || mime.includes('archive')) return '📦';
  if (mime.startsWith('text/')) return '📝';
  return '📎';
}
</script>

<template>
  <tr
    class="hover:bg-gray-50 cursor-pointer border-b border-gray-100 select-none"
    @click="handleClick"
    @dblclick="handleDoubleClick"
    @contextmenu.prevent="emit('contextmenu', $event, props.file)"
  >
    <td class="px-4 py-2 flex items-center gap-2 text-sm">
      <span class="text-base">{{ getIcon(props.file) }}</span>
      <span class="truncate" :title="props.file.name">{{ props.file.name }}</span>
    </td>
    <td class="px-4 py-2 text-sm text-gray-500 whitespace-nowrap">
      {{ formatDate(props.file.updatedAt) }}
    </td>
    <td class="px-4 py-2 text-sm text-gray-500 whitespace-nowrap text-right">
      {{ props.file.isFolder ? '—' : formatSize(props.file.size) }}
    </td>
  </tr>
</template>
