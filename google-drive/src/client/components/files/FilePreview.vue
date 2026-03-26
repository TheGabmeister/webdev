<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { FileItem } from '../../types';
import * as filesApi from '../../api/files';

const props = defineProps<{
  file: FileItem;
}>();

const emit = defineEmits<{
  close: [];
  download: [];
}>();

const previewUrl = ref('');
const mimeType = ref('');
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    const result = await filesApi.getPreviewUrl(props.file.id);
    previewUrl.value = result.url;
    mimeType.value = result.mimeType;
  } catch (e: any) {
    error.value = e.body?.error || 'Failed to load preview';
  } finally {
    loading.value = false;
  }
});

const isImage = () => mimeType.value.startsWith('image/');
const isPdf = () => mimeType.value === 'application/pdf';
</script>

<template>
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="emit('close')">
    <div class="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full mx-4 flex flex-col" role="dialog" :aria-label="props.file.name">
      <div class="flex items-center justify-between px-4 py-3 border-b">
        <h2 class="text-sm font-medium truncate">{{ props.file.name }}</h2>
        <div class="flex items-center gap-2">
          <button
            @click="emit('download')"
            class="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Download
          </button>
          <button
            @click="emit('close')"
            class="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
          >
            ✕
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-auto flex items-center justify-center p-4 min-h-[300px]">
        <div v-if="loading" class="text-gray-400">Loading preview...</div>
        <div v-else-if="error" class="text-red-500 text-sm">{{ error }}</div>
        <img
          v-else-if="isImage()"
          :src="previewUrl"
          :alt="props.file.name"
          class="max-w-full max-h-full object-contain"
        />
        <iframe
          v-else-if="isPdf()"
          :src="previewUrl"
          class="w-full h-full min-h-[500px]"
          :title="props.file.name"
        />
      </div>
    </div>
  </div>
</template>
