<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import type { FileItem } from '../../types';
import { useDialogFocus } from '../../composables/useDialogFocus';

const props = defineProps<{
  file: FileItem;
}>();

const emit = defineEmits<{
  close: [];
  rename: [name: string];
}>();

const name = ref(props.file.name);
const error = ref('');
const inputRef = ref<HTMLInputElement>();
const dialogRef = ref<HTMLElement>();

const INVALID_CHARS = /[/\\:*?"<>|]/;
useDialogFocus({
  containerRef: dialogRef,
  initialFocusRef: inputRef,
  onClose: () => emit('close'),
});

onMounted(() => {
  nextTick(() => inputRef.value?.select());
});

function validate(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return 'Name cannot be empty';
  if (INVALID_CHARS.test(trimmed)) return 'Name contains invalid characters (/ \\ : * ? " < > |)';
  return null;
}

function handleSubmit() {
  const err = validate(name.value);
  if (err) {
    error.value = err;
    return;
  }
  emit('rename', name.value.trim());
}
</script>

<template>
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="emit('close')">
    <div
      ref="dialogRef"
      class="bg-white rounded-lg shadow-xl w-96 p-6"
      role="dialog"
      aria-label="Rename"
      tabindex="-1"
    >
      <h2 class="text-lg font-medium mb-4">Rename</h2>

      <form @submit.prevent="handleSubmit">
        <div v-if="error" class="text-red-600 text-sm mb-2">{{ error }}</div>
        <input
          ref="inputRef"
          v-model="name"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          aria-label="New name"
          @input="error = ''"
        />
        <div class="flex justify-end gap-2 mt-4">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            Rename
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
