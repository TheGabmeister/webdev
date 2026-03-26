<script setup lang="ts">
import { ref, onMounted } from 'vue';
import * as filesApi from '../../api/files';

const props = defineProps<{
  fileId: string;
  fileName: string;
  isFolder: boolean;
}>();

const emit = defineEmits<{
  close: [];
  move: [parentId: string | null];
}>();

interface FolderNode {
  id: string | null;
  name: string;
  children: FolderNode[] | null; // null means not loaded yet
  expanded: boolean;
  loading: boolean;
  disabled: boolean;
}

const root = ref<FolderNode>({
  id: null,
  name: 'My Drive',
  children: null,
  expanded: true,
  loading: false,
  disabled: false,
});

const selected = ref<string | null>(null);
const error = ref('');

onMounted(async () => {
  await loadChildren(root.value);
});

async function isDescendantFolder(folderId: string): Promise<boolean> {
  if (!props.isFolder) {
    return false;
  }

  const path = await filesApi.getFilePath(folderId);
  return path.some((folder) => folder.id === props.fileId);
}

async function loadChildren(node: FolderNode) {
  if (node.children !== null || node.loading) return;
  node.loading = true;
  error.value = '';

  try {
    const folders = await filesApi.listFiles(node.id, true);
    const candidateNodes = await Promise.all(folders.map(async (folder) => ({
      id: folder.id,
      name: folder.name,
      children: null,
      expanded: false,
      loading: false,
      disabled: folder.id === props.fileId || await isDescendantFolder(folder.id),
    })));

    node.children = candidateNodes.filter((folder) => !folder.disabled);
  } catch {
    node.children = [];
    error.value = 'Failed to load available folders';
  }
  node.loading = false;
}

async function toggleExpand(node: FolderNode) {
  if (!node.expanded) {
    await loadChildren(node);
  }
  node.expanded = !node.expanded;
}

function selectFolder(id: string | null) {
  selected.value = id;
  error.value = '';
}

function handleMove() {
  emit('move', selected.value);
}
</script>

<template>
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" @click.self="emit('close')">
    <div class="bg-white rounded-lg shadow-xl w-96 p-6 max-h-[70vh] flex flex-col" role="dialog" aria-label="Move to">
      <h2 class="text-lg font-medium mb-2">Move "{{ fileName }}"</h2>

      <div class="flex-1 overflow-auto border border-gray-200 rounded-md p-2 my-2 min-h-[200px]">
        <FolderTreeNode
          :node="root"
          :selected="selected"
          :depth="0"
          @select="selectFolder"
          @toggle="toggleExpand"
        />
      </div>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <div class="flex justify-end gap-2 mt-2">
        <button
          type="button"
          @click="emit('close')"
          class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
        >
          Cancel
        </button>
        <button
          @click="handleMove"
          class="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
        >
          Move here
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

const FolderTreeNode = defineComponent({
  name: 'FolderTreeNode',
  props: {
    node: { type: Object as PropType<FolderNode>, required: true },
    selected: { type: [String, null] as PropType<string | null>, default: null },
    depth: { type: Number, default: 0 },
  },
  emits: ['select', 'toggle'],
  template: `
    <div>
      <div
        class="flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-sm"
        :class="selected === node.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'"
        :style="{ paddingLeft: depth * 16 + 8 + 'px' }"
        @click="$emit('select', node.id)"
      >
        <button
          v-if="node.children === null || (node.children && node.children.length > 0)"
          class="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
          @click.stop="$emit('toggle', node)"
        >
          {{ node.expanded ? '▾' : '▸' }}
        </button>
        <span v-else class="w-4" />
        <span>📁</span>
        <span class="truncate">{{ node.name }}</span>
        <span v-if="node.loading" class="text-xs text-gray-400 ml-1">...</span>
      </div>
      <div v-if="node.expanded && node.children">
        <FolderTreeNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :selected="selected"
          :depth="depth + 1"
          @select="(id: any) => $emit('select', id)"
          @toggle="(n: any) => $emit('toggle', n)"
        />
      </div>
    </div>
  `,
});
</script>
