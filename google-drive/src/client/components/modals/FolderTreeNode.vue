<script lang="ts">
import { defineComponent, type PropType } from 'vue';

export interface FolderNode {
  id: string | null;
  name: string;
  children: FolderNode[] | null;
  expanded: boolean;
  loading: boolean;
  disabled: boolean;
}

export default defineComponent({
  name: 'FolderTreeNode',
  props: {
    node: { type: Object as PropType<FolderNode>, required: true },
    selected: { type: [String, null] as PropType<string | null>, default: null },
    depth: { type: Number, default: 0 },
  },
  emits: ['select', 'toggle'],
});
</script>

<template>
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
        :key="child.id!"
        :node="child"
        :selected="selected"
        :depth="depth + 1"
        @select="(id: any) => $emit('select', id)"
        @toggle="(n: any) => $emit('toggle', n)"
      />
    </div>
  </div>
</template>
