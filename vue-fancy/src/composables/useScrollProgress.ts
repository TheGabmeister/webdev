import { onBeforeUnmount, onMounted, reactive } from 'vue'
import type { SceneId } from '../types/scenes'
import { clamp } from '../utils/motion'

export function useScrollProgress(
  sceneIds: SceneId[],
  sceneRefs: Record<SceneId, HTMLElement | null>,
) {
  const progressById = reactive(
    Object.fromEntries(sceneIds.map((id) => [id, 0])) as Record<SceneId, number>,
  )

  let frameHandle = 0

  const measure = () => {
    const viewportHeight = window.innerHeight || 1

    for (const id of sceneIds) {
      const element = sceneRefs[id]

      if (!element) {
        continue
      }

      const rect = element.getBoundingClientRect()
      const progress = (viewportHeight - rect.top) / (viewportHeight + rect.height)
      progressById[id] = clamp(progress)
    }

    frameHandle = 0
  }

  const requestMeasure = () => {
    if (frameHandle) {
      return
    }

    frameHandle = window.requestAnimationFrame(measure)
  }

  onMounted(() => {
    measure()
    window.addEventListener('scroll', requestMeasure, { passive: true })
    window.addEventListener('resize', requestMeasure, { passive: true })
    window.visualViewport?.addEventListener('resize', requestMeasure, { passive: true })
  })

  onBeforeUnmount(() => {
    if (frameHandle) {
      window.cancelAnimationFrame(frameHandle)
    }

    window.removeEventListener('scroll', requestMeasure)
    window.removeEventListener('resize', requestMeasure)
    window.visualViewport?.removeEventListener('resize', requestMeasure)
  })

  return {
    progressById,
    refreshProgress: requestMeasure,
  }
}
