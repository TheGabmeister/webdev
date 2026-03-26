import { ref, computed } from 'vue';
import type { FileItem } from '../types';

const selectedIds = ref<Set<string>>(new Set());
const lastClickedIndex = ref<number>(-1);

export function useSelection() {
  const selectedCount = computed(() => selectedIds.value.size);
  const hasSelection = computed(() => selectedIds.value.size > 0);

  function isSelected(id: string): boolean {
    return selectedIds.value.has(id);
  }

  function clearSelection() {
    selectedIds.value = new Set();
    lastClickedIndex.value = -1;
  }

  function handleClick(file: FileItem, index: number, files: FileItem[], event: MouseEvent | KeyboardEvent) {
    if (event.ctrlKey || event.metaKey) {
      // Toggle single item
      const next = new Set(selectedIds.value);
      if (next.has(file.id)) {
        next.delete(file.id);
      } else {
        next.add(file.id);
      }
      selectedIds.value = next;
      lastClickedIndex.value = index;
    } else if (event.shiftKey && lastClickedIndex.value >= 0) {
      // Range select
      const start = Math.min(lastClickedIndex.value, index);
      const end = Math.max(lastClickedIndex.value, index);
      const next = new Set(selectedIds.value);
      for (let i = start; i <= end; i++) {
        next.add(files[i].id);
      }
      selectedIds.value = next;
    } else {
      // Single select
      selectedIds.value = new Set([file.id]);
      lastClickedIndex.value = index;
    }
  }

  function toggleSelection(file: FileItem, index: number) {
    const next = new Set(selectedIds.value);
    if (next.has(file.id)) {
      next.delete(file.id);
    } else {
      next.add(file.id);
    }
    selectedIds.value = next;
    lastClickedIndex.value = index;
  }

  function getSelectedIds(): string[] {
    return Array.from(selectedIds.value);
  }

  function getSelectedFiles(files: FileItem[]): FileItem[] {
    return files.filter(f => selectedIds.value.has(f.id));
  }

  return {
    selectedIds,
    selectedCount,
    hasSelection,
    isSelected,
    clearSelection,
    handleClick,
    toggleSelection,
    getSelectedIds,
    getSelectedFiles,
  };
}
