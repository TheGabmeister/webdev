import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as filesApi from '../api/files';
import * as storageApi from '../api/storage';
import type { FileItem } from '../types';

export type ViewMode = 'folder' | 'starred' | 'trash' | 'search';

export const useFilesStore = defineStore('files', () => {
  const files = ref<FileItem[]>([]);
  const breadcrumbs = ref<FileItem[]>([]);
  const currentFolderId = ref<string | null>(null);
  const viewMode = ref<ViewMode>('folder');
  const searchQuery = ref('');
  const loading = ref(false);
  const storageUsed = ref(BigInt(0));
  const storageLimit = ref(BigInt(1073741824));

  const storagePercent = computed(() => {
    if (storageLimit.value === BigInt(0)) return 0;
    return Number((storageUsed.value * BigInt(100)) / storageLimit.value);
  });

  const storageColor = computed(() => {
    const pct = storagePercent.value;
    if (pct > 80) return 'bg-red-500';
    if (pct >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  });

  const storageText = computed(() => {
    const usedMB = (Number(storageUsed.value) / (1024 * 1024)).toFixed(1);
    const limitGB = (Number(storageLimit.value) / (1024 * 1024 * 1024)).toFixed(0);
    return `${usedMB} MB of ${limitGB} GB used`;
  });

  async function fetchStorage() {
    const info = await storageApi.getStorage();
    storageUsed.value = BigInt(info.used);
    storageLimit.value = BigInt(info.limit);
  }

  async function fetchFiles(folderId?: string | null) {
    loading.value = true;
    viewMode.value = 'folder';
    currentFolderId.value = folderId || null;
    try {
      files.value = await filesApi.listFiles(folderId);
      if (folderId) {
        breadcrumbs.value = await filesApi.getFilePath(folderId);
      } else {
        breadcrumbs.value = [];
      }
    } finally {
      loading.value = false;
    }
  }

  async function fetchStarred() {
    loading.value = true;
    viewMode.value = 'starred';
    currentFolderId.value = null;
    breadcrumbs.value = [];
    try {
      files.value = await filesApi.getStarredFiles();
    } finally {
      loading.value = false;
    }
  }

  async function fetchTrash() {
    loading.value = true;
    viewMode.value = 'trash';
    currentFolderId.value = null;
    breadcrumbs.value = [];
    try {
      files.value = await filesApi.getTrashedFiles();
    } finally {
      loading.value = false;
    }
  }

  async function fetchSearch(q: string) {
    loading.value = true;
    viewMode.value = 'search';
    searchQuery.value = q;
    currentFolderId.value = null;
    breadcrumbs.value = [];
    try {
      files.value = await filesApi.searchFiles(q);
    } finally {
      loading.value = false;
    }
  }

  async function createFolder(name: string) {
    await filesApi.createFolder(name, currentFolderId.value);
    await refreshCurrentView();
  }

  async function renameFile(id: string, name: string) {
    await filesApi.updateFile(id, { name });
    await refreshCurrentView();
  }

  async function toggleStar(id: string, starred: boolean) {
    await filesApi.updateFile(id, { starred });
    await refreshCurrentView();
  }

  async function moveFile(id: string, parentId: string | null) {
    await filesApi.updateFile(id, { parentId });
    await refreshCurrentView();
  }

  async function trashFile(id: string) {
    await filesApi.trashFile(id);
    await refreshCurrentView();
    await fetchStorage();
  }

  async function restoreFile(id: string) {
    await filesApi.restoreFile(id);
    await refreshCurrentView();
  }

  async function deleteFile(id: string) {
    await filesApi.deleteFile(id);
    await refreshCurrentView();
    await fetchStorage();
  }

  async function emptyTrash() {
    const trashIds = files.value.map(f => f.id);
    if (trashIds.length === 0) return;
    await filesApi.bulkDelete(trashIds);
    await refreshCurrentView();
    await fetchStorage();
  }

  async function refreshCurrentView() {
    switch (viewMode.value) {
      case 'folder':
        await fetchFiles(currentFolderId.value);
        break;
      case 'starred':
        await fetchStarred();
        break;
      case 'trash':
        await fetchTrash();
        break;
      case 'search':
        await fetchSearch(searchQuery.value);
        break;
    }
  }

  return {
    files, breadcrumbs, currentFolderId, viewMode, searchQuery, loading,
    storageUsed, storageLimit, storagePercent, storageColor, storageText,
    fetchStorage, fetchFiles, fetchStarred, fetchTrash, fetchSearch,
    createFolder, renameFile, toggleStar, moveFile,
    trashFile, restoreFile, deleteFile, emptyTrash, refreshCurrentView,
  };
});
