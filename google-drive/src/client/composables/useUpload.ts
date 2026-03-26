import { ref, computed } from 'vue';
import * as uploadApi from '../api/upload';
import { useFilesStore } from '../stores/files';

export type UploadStatus = 'queued' | 'uploading' | 'completed' | 'failed' | 'canceled';

export interface UploadItem {
  id: string;
  file: File;
  parentId: string | null;
  status: UploadStatus;
  progress: number;
  error: string;
  fileId: string | null;
  xhr: XMLHttpRequest | null;
}

const MAX_CONCURRENT = 3;
let idCounter = 0;

const items = ref<UploadItem[]>([]);
const collapsed = ref(false);

const activeCount = computed(() => items.value.filter(i => i.status === 'uploading').length);
const hasItems = computed(() => items.value.length > 0);
const allDone = computed(() => items.value.length > 0 && items.value.every(i => i.status === 'completed' || i.status === 'failed' || i.status === 'canceled'));

function addFiles(fileList: FileList | File[], parentId: string | null) {
  for (const file of fileList) {
    const item: UploadItem = {
      id: `upload-${++idCounter}`,
      file,
      parentId,
      status: 'queued',
      progress: 0,
      error: '',
      fileId: null,
      xhr: null,
    };
    items.value.push(item);
  }
  processQueue();
}

function processQueue() {
  const uploading = items.value.filter(i => i.status === 'uploading').length;
  const slotsAvailable = MAX_CONCURRENT - uploading;
  const queued = items.value.filter(i => i.status === 'queued');

  for (let i = 0; i < Math.min(slotsAvailable, queued.length); i++) {
    startUpload(queued[i]);
  }
}

async function startUpload(item: UploadItem) {
  item.status = 'uploading';
  item.progress = 0;
  item.error = '';

  try {
    // Get presigned URL
    const { fileId, uploadUrl } = await uploadApi.getUploadUrl({
      name: item.file.name,
      mimeType: item.file.type || 'application/octet-stream',
      size: item.file.size,
      parentId: item.parentId,
    });

    item.fileId = fileId;

    // Upload to S3 via XHR for progress tracking
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      item.xhr = xhr;

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          item.progress = Math.round((e.loaded / e.total) * 100);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      xhr.addEventListener('abort', () => reject(new Error('Upload canceled')));

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', item.file.type || 'application/octet-stream');
      xhr.send(item.file);
    });

    // Confirm upload
    await uploadApi.confirmUpload(fileId);

    item.status = 'completed';
    item.progress = 100;

    // Refresh file list and storage
    const filesStore = useFilesStore();
    await filesStore.refreshCurrentView();
    await filesStore.fetchStorage();
  } catch (e: any) {
    if (item.status === 'canceled') return;
    item.status = 'failed';
    item.error = e.body?.error || e.message || 'Upload failed';
  } finally {
    item.xhr = null;
    processQueue();
  }
}

function cancelUpload(id: string) {
  const item = items.value.find(i => i.id === id);
  if (!item) return;

  if (item.status === 'uploading' && item.xhr) {
    item.xhr.abort();
  }
  item.status = 'canceled';
  item.xhr = null;
  processQueue();
}

function retryUpload(id: string) {
  const item = items.value.find(i => i.id === id);
  if (!item || (item.status !== 'failed' && item.status !== 'canceled')) return;

  item.status = 'queued';
  item.progress = 0;
  item.error = '';
  item.fileId = null;
  processQueue();
}

function clearCompleted() {
  items.value = items.value.filter(i => i.status !== 'completed' && i.status !== 'failed' && i.status !== 'canceled');
}

export function useUpload() {
  return {
    items,
    collapsed,
    activeCount,
    hasItems,
    allDone,
    addFiles,
    cancelUpload,
    retryUpload,
    clearCompleted,
  };
}
