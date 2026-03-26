<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import type { FileItem } from '../../types';

const props = defineProps<{
  file: FileItem;
  x: number;
  y: number;
  isTrashView: boolean;
}>();

const emit = defineEmits<{
  close: [];
  open: [];
  download: [];
  rename: [];
  star: [];
  moveTo: [];
  trash: [];
  restore: [];
  deleteForever: [];
}>();

const menuRef = ref<HTMLElement>();
const previousActiveElement =
  typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;

function handleClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    emit('close');
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    emit('close');
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true);
  document.addEventListener('keydown', handleKeydown, true);
  nextTick(() => {
    menuRef.value?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  });
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true);
  document.removeEventListener('keydown', handleKeydown, true);
  previousActiveElement?.focus();
});
</script>

<template>
  <div
    ref="menuRef"
    class="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[180px]"
    :style="{ left: `${x}px`, top: `${y}px` }"
    role="menu"
    aria-label="File actions"
  >
    <template v-if="isTrashView">
      <button
        class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        role="menuitem"
        @click="emit('restore'); emit('close')"
      >
        Restore
      </button>
      <button
        class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
        role="menuitem"
        @click="emit('deleteForever'); emit('close')"
      >
        Delete forever
      </button>
    </template>
    <template v-else>
      <button
        class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        role="menuitem"
        @click="emit('open'); emit('close')"
      >
        Open
      </button>
      <button
        v-if="!props.file.isFolder"
        class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        role="menuitem"
        @click="emit('download'); emit('close')"
      >
        Download
      </button>
      <hr class="my-1 border-gray-200" />
      <button
        class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        role="menuitem"
        @click="emit('rename'); emit('close')"
      >
        Rename
      </button>
      <button
        class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        role="menuitem"
        @click="emit('star'); emit('close')"
      >
        {{ props.file.starred ? 'Remove from starred' : 'Add to starred' }}
      </button>
      <button
        class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        role="menuitem"
        @click="emit('moveTo'); emit('close')"
      >
        Move to
      </button>
      <hr class="my-1 border-gray-200" />
      <button
        class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
        role="menuitem"
        @click="emit('trash'); emit('close')"
      >
        Move to trash
      </button>
    </template>
  </div>
</template>
