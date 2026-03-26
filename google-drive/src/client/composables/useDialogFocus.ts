import { nextTick, onMounted, onUnmounted, type Ref } from 'vue';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useDialogFocus<ContainerEl extends HTMLElement, FocusEl extends HTMLElement = ContainerEl>(options: {
  containerRef: Ref<ContainerEl | undefined>;
  initialFocusRef?: Ref<FocusEl | undefined>;
  onClose: () => void;
}) {
  const previousActiveElement =
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  function getFocusableElements(): HTMLElement[] {
    const container = options.containerRef.value;
    if (!container) {
      return [];
    }

    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (element) => !element.hasAttribute('disabled') && element.tabIndex !== -1,
    );
  }

  function handleKeydown(event: KeyboardEvent) {
    const container = options.containerRef.value;
    if (!container) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      options.onClose();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      container.focus();
      return;
    }

    const activeElement = document.activeElement as HTMLElement | null;
    const currentIndex = activeElement ? focusable.indexOf(activeElement) : -1;

    event.preventDefault();

    if (event.shiftKey) {
      const nextIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
      focusable[nextIndex]?.focus();
      return;
    }

    const nextIndex = currentIndex === -1 || currentIndex === focusable.length - 1 ? 0 : currentIndex + 1;
    focusable[nextIndex]?.focus();
  }

  onMounted(async () => {
    await nextTick();

    const initialFocus = options.initialFocusRef?.value ?? getFocusableElements()[0] ?? options.containerRef.value;
    initialFocus?.focus();

    document.addEventListener('keydown', handleKeydown, true);
  });

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown, true);
    previousActiveElement?.focus();
  });
}
