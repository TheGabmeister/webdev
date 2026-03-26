<script setup lang="ts">
import { watch, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFilesStore } from '../stores/files';
import * as filesApi from '../api/files';
import type { FileItem } from '../types';

import AppHeader from '../components/layout/AppHeader.vue';
import AppSidebar from '../components/layout/AppSidebar.vue';
import Breadcrumbs from '../components/files/Breadcrumbs.vue';
import FileList from '../components/files/FileList.vue';
import ContextMenu from '../components/files/ContextMenu.vue';
import FilePreview from '../components/files/FilePreview.vue';
import NewFolderModal from '../components/modals/NewFolderModal.vue';
import RenameModal from '../components/modals/RenameModal.vue';
import MoveModal from '../components/modals/MoveModal.vue';

const route = useRoute();
const router = useRouter();
const filesStore = useFilesStore();

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

const PREVIEWABLE_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
]);

// Route watcher — load data based on current route
watch(
  () => [route.name, route.params.id, route.query.q],
  async () => {
    contextMenu.value = null;
    const routeName = route.name as string;

    if (routeName === 'drive') {
      currentFolderName.value = '';
      await filesStore.fetchFiles(null);
    } else if (routeName === 'drive-folder') {
      const folderId = route.params.id as string;
      await filesStore.fetchFiles(folderId);
      // Get folder name for breadcrumbs
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

// View title
function viewTitle(): string {
  switch (filesStore.viewMode) {
    case 'starred': return 'Starred';
    case 'trash': return 'Trash';
    case 'search': return `Search results for "${filesStore.searchQuery}"`;
    default: return '';
  }
}

const isTrashView = () => filesStore.viewMode === 'trash';

// File actions
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
  } catch {
    // Silently fail
  }
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
  showMove.value = true;
}

async function handleStar(file: FileItem) {
  await filesStore.toggleStar(file.id, !file.starred);
}

async function handleTrash(file: FileItem) {
  await filesStore.trashFile(file.id);
}

async function handleRestore(file: FileItem) {
  await filesStore.restoreFile(file.id);
}

async function handleDeleteForever(file: FileItem) {
  await filesStore.deleteFile(file.id);
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
  if (!targetFile.value) return;
  await filesStore.moveFile(targetFile.value.id, parentId);
  showMove.value = false;
}

function handleBreadcrumbNav(folderId: string | null) {
  if (folderId) {
    router.push(`/drive/folder/${folderId}`);
  } else {
    router.push('/drive');
  }
}
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <AppHeader />

    <div class="flex flex-1 overflow-hidden">
      <AppSidebar @new-folder="showNewFolder = true" />

      <main class="flex-1 flex flex-col overflow-hidden px-6 pt-2">
        <!-- Breadcrumbs or view title -->
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
            v-if="isTrashView() && filesStore.files.length > 0"
            @click="handleEmptyTrash"
            class="text-sm text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-md"
          >
            Empty trash
          </button>
        </div>

        <!-- File list -->
        <FileList
          :files="filesStore.files"
          :loading="filesStore.loading"
          @open="handleOpen"
          @contextmenu="handleContextMenu"
        />
      </main>
    </div>

    <!-- Context menu -->
    <ContextMenu
      v-if="contextMenu"
      :file="contextMenu.file"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :is-trash-view="isTrashView()"
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
      :file-id="targetFile.id"
      :file-name="targetFile.name"
      :is-folder="targetFile.isFolder"
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
