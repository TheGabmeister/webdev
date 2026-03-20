import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useReviewMode() {
  const reviewMode = ref(false)

  const readQueryState = () => {
    reviewMode.value = new URLSearchParams(window.location.search).get('review') === '1'
  }

  onMounted(() => {
    readQueryState()
    window.addEventListener('popstate', readQueryState)
    window.addEventListener('hashchange', readQueryState)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('popstate', readQueryState)
    window.removeEventListener('hashchange', readQueryState)
  })

  return {
    reviewMode,
  }
}
