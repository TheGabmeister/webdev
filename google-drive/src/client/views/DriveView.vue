<script setup lang="ts">
import { watch, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFilesStore } from '../stores/files';
import { useUpload } from '../composables/useUpload';
import { useSelection } from '../composables/useSelection';
import * as filesApi from '../api/files';
import type { FileItem } from '../types';

import AppHeader from '../components/layout/AppHeader.vue';
import AppSidebar from '../components/layout/AppSidebar.vue';
import UploadPanel from '../components/layout/UploadPanel.vue';
import Breadcrumbs from '../components/files/Breadcrumbs.vue';
import FileList from '../components/files/FileList.vue';
import ContextMenu from '../components/files/ContextMenu.vue';
import FilePreview from '../components/files/FilePreview.vue';
import BulkActionBar from '../components/files/BulkActionBar.vue';
import NewFolderModal from '../components/modals/NewFolderModal.vue';
import RenameModal from '../components/modals/RenameModal.vue';
import MoveModal from '../components/modals/MoveModal.vue';

const route = useRoute();
const router = useRouter();
const filesStore = useFilesStore();
const upload = useUpload();
const selection = useSelection();

// Modals
const showNewFolder = ref(false);
const showRename = ref(false);
const showMove = ref(false);
const showPreview = ref(false);

// Context menu
const contextMenu = ref<{ file: FileItem; x: number; y: number } | null>(null);

// Target file for rename/move/preview
const targetFile = ref<FileItem | null>(null);

// Current folder name for breadcrumbs
const currentFolderName = ref('');

// Drag and drop
const isDragging = ref(false);

// File picker
const fileInputRef = ref<HTMLInputElement>();

// Move modal target (for bulk move)
const bulkMoveMode = ref(false);

const PREVIEWABLE_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
]);

const isTrashView = computed(() => filesStore.viewMode === 'trash');
const selectedFiles = computed(() => selection.getSelectedFiles(filesStore.files));

// Route watcher
watch(
  () => [route.name, route.params.id, route.query.q],
  async () => {
    contextMenu.value = null;
    selection.clearSelection();
    const routeName = route.name as string;

    if (routeName === 'drive') {
      currentFolderName.value = '';
      await filesStore.fetchFiles(null);
    } else if (routeName === 'drive-folder') {
      const folderId = route.params.id as string;
      await filesStore.fetchFiles(folderId);
      try {
        const folder = await filesApi.getFile(folderId);
        currentFolderName.value = folder.name;
      } catch {
        currentFolderName.value = '';
      }
    } else if (routeName === 'drive-starred') {
      currentFolderName.value = '';
      await filesStore.fetchStarred();
    } else if (routeName === 'drive-trash') {
      currentFolderName.value = '';
      await filesStore.fetchTrash();
    } else if (routeName === 'drive-search') {
      currentFolderName.value = '';
      const q = route.query.q as string;
      if (q) await filesStore.fetchSearch(q);
    }
  },
  { immediate: true },
);

function viewTitle(): string {
  switch (filesStore.viewMode) {
    case 'starred': return 'Starred';
    case 'trash': return 'Trash';
    case 'search': return `Search results for "${filesStore.searchQuery}"`;
    default: return '';
  }
}

// --- File actions ---
function handleOpen(file: FileItem) {
  if (file.isFolder) {
    router.push(`/drive/folder/${file.id}`);
  } else if (file.mimeType && PREVIEWABLE_MIME_TYPES.has(file.mimeType)) {
    targetFile.value = file;
    showPreview.value = true;
  } else {
    handleDownload(file);
  }
}

async function handleDownload(file: FileItem) {
  try {
    const { url } = await filesApi.getDownloadUrl(file.id);
    window.open(url, '_blank');
  } catch { /* silently fail */ }
}

function handleContextMenu(event: MouseEvent, file: FileItem) {
  contextMenu.value = { file, x: event.clientX, y: event.clientY };
}

function handleRename(file: FileItem) {
  targetFile.value = file;
  showRename.value = true;
}

function handleMoveTo(file: FileItem) {
  targetFile.value = file;
  bulkMoveMode.value = false;
  showMove.value = true;
}

async function handleStar(file: FileItem) {
  await filesStore.toggleStar(file.id, !file.starred);
}

async function handleTrash(file: FileItem) {
  await filesStore.trashFile(file.id);
  selection.clearSelection();
}

async function handleRestore(file: FileItem) {
  await filesStore.restoreFile(file.id);
  selection.clearSelection();
}

async function handleDeleteForever(file: FileItem) {
  await filesStore.deleteFile(file.id);
  selection.clearSelection();
}

async function handleEmptyTrash() {
  if (filesStore.files.length === 0) return;
  await filesStore.emptyTrash();
}

async function handleCreateFolder(name: string) {
  showNewFolder.value = false;
  await filesStore.createFolder(name);
}

async function handleRenameSubmit(name: string) {
  if (!targetFile.value) return;
  showRename.value = false;
  await filesStore.renameFile(targetFile.value.id, name);
}

async function handleMoveSubmit(parentId: string | null) {
  if (bulkMoveMode.value) {
    const ids = selection.getSelectedIds();
    await filesApi.bulkMove(ids, parentId || '');
    showMove.value = false;
    selection.clearSelection();
    await filesStore.refreshCurrentView();
  } else if (targetFile.value) {
    await filesStore.moveFile(targetFile.value.id, parentId);
    showMove.value = false;
  }
}

function handleBreadcrumbNav(folderId: string | null) {
  if (folderId) {
    router.push(`/drive/folder/${folderId}`);
  } else {
    router.push('/drive');
  }
}

// --- Selection actions ---
function handleSelect(file: FileItem, index: number, event: MouseEvent | KeyboardEvent) {
  selection.handleClick(file, index, filesStore.files, event);
}

function handleKeyAction(action: string, file: FileItem) {
  if (action === 'rename') handleRename(file);
  else if (action === 'contextmenu') {
    const rect = document.querySelector(`[data-file-id="${file.id}"]`)?.getBoundingClientRect();
    contextMenu.value = { file, x: rect?.right ?? 300, y: rect?.top ?? 200 };
  }
  else if (action === 'escape') {
    selection.clearSelection();
    contextMenu.value = null;
  }
}

// --- Bulk actions ---
async function handleBulkTrash() {
  const ids = selection.getSelectedIds();
  await filesApi.bulkTrash(ids);
  selection.clearSelection();
  await filesStore.refreshCurrentView();
  await filesStore.fetchStorage();
}

async function handleBulkRestore() {
  const ids = selection.getSelectedIds();
  await filesApi.bulkRestore(ids);
  selection.clearSelection();
  await filesStore.refreshCurrentView();
}

async function handleBulkDelete() {
  const ids = selection.getSelectedIds();
  await filesApi.bulkDelete(ids);
  selection.clearSelection();
  await filesStore.refreshCurrentView();
  await filesStore.fetchStorage();
}

async function handleBulkDownload() {
  const selected = selectedFiles.value;
  if (selected.length === 1 && !selected[0].isFolder) {
    await handleDownload(selected[0]);
  } else {
    // Bulk download as ZIP
    const ids = selected.map(f => f.id);
    try {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
      const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : '';
      const res = await fetch('/api/files/bulk-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        credentials: 'include',
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const body = await res.json();
        alert(body.error || 'Download failed');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'download.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Download failed');
    }
  }
}

function handleBulkMove() {
  bulkMoveMode.value = true;
  targetFile.value = selectedFiles.value[0] || null;
  showMove.value = true;
}

// --- Upload ---
function triggerFilePicker() {
  fileInputRef.value?.click();
}

function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    upload.addFiles(input.files, filesStore.currentFolderId);
    input.value = '';
  }
}

// --- Drag and drop ---
function handleDragEnter(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer?.types.includes('Files')) {
    isDragging.value = true;
  }
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
}

function handleDragLeave(e: DragEvent) {
  if (e.currentTarget === e.target || !e.relatedTarget) {
    isDragging.value = false;
  }
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  isDragging.value = false;
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    upload.addFiles(e.dataTransfer.files, filesStore.currentFolderId);
  }
}
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <AppHeader />

    <div class="flex flex-1 overflow-hidden">
      <AppSidebar
        @new-folder="showNewFolder = true"
        @upload-file="triggerFilePicker"
      />

      <main
        class="flex-1 flex flex-col overflow-hidden px-6 pt-2 relative"
        @dragenter="handleDragEnter"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
      >
        <!-- Drag overlay -->
        <div
          v-if="isDragging"
          class="absolute inset-0 bg-blue-50/80 border-2 border-dashed border-blue-400 rounded-lg z-30 flex items-center justify-center pointer-events-none"
        >
          <div class="text-blue-600 text-lg font-medium">Drop files to upload</div>
        </div>

        <!-- Header row: breadcrumbs/title + actions -->
        <div class="flex items-center justify-between">
          <div v-if="filesStore.viewMode === 'folder'">
            <Breadcrumbs
              :items="filesStore.breadcrumbs"
              :current-folder-name="currentFolderName"
              @navigate="handleBreadcrumbNav"
            />
          </div>
          <div v-else class="py-2">
            <h2 class="text-lg font-medium text-gray-800">{{ viewTitle() }}</h2>
          </div>

          <button
            v-if="isTrashView && filesStore.files.length > 0"
            @click="handleEmptyTrash"
            class="text-sm text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-md"
          >
            Empty trash
          </button>
        </div>

        <!-- Bulk action bar -->
        <BulkActionBar
          v-if="selection.hasSelection.value"
          :selected-files="selectedFiles"
          :is-trash-view="isTrashView"
          @move-to="handleBulkMove"
          @trash="handleBulkTrash"
          @download="handleBulkDownload"
          @restore="handleBulkRestore"
          @delete-forever="handleBulkDelete"
          @clear-selection="selection.clearSelection()"
        />

        <!-- File list -->
        <FileList
          :files="filesStore.files"
          :loading="filesStore.loading"
          :selected-ids="selection.selectedIds.value"
          @open="handleOpen"
          @contextmenu="handleContextMenu"
          @select="handleSelect"
          @keyaction="handleKeyAction"
        />
      </main>
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      class="hidden"
      @change="handleFileInput"
    />

    <!-- Upload panel -->
    <UploadPanel />

    <!-- Context menu -->
    <ContextMenu
      v-if="contextMenu"
      :file="contextMenu.file"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :is-trash-view="isTrashView"
      @close="contextMenu = null"
      @open="handleOpen(contextMenu!.file)"
      @download="handleDownload(contextMenu!.file)"
      @rename="handleRename(contextMenu!.file)"
      @star="handleStar(contextMenu!.file)"
      @move-to="handleMoveTo(contextMenu!.file)"
      @trash="handleTrash(contextMenu!.file)"
      @restore="handleRestore(contextMenu!.file)"
      @delete-forever="handleDeleteForever(contextMenu!.file)"
    />

    <!-- Modals -->
    <NewFolderModal
      v-if="showNewFolder"
      @close="showNewFolder = false"
      @create="handleCreateFolder"
    />

    <RenameModal
      v-if="showRename && targetFile"
      :file="targetFile"
      @close="showRename = false"
      @rename="handleRenameSubmit"
    />

    <MoveModal
      v-if="showMove && targetFile"
      :file-id="bulkMoveMode ? '' : targetFile.id"
      :file-name="bulkMoveMode ? `${selection.selectedCount.value} items` : targetFile.name"
      :is-folder="bulkMoveMode ? false : targetFile.isFolder"
      @close="showMove = false"
      @move="handleMoveSubmit"
    />

    <FilePreview
      v-if="showPreview && targetFile"
      :file="targetFile"
      @close="showPreview = false"
      @download="handleDownload(targetFile!); showPreview = false"
    />
  </div>
</template>
