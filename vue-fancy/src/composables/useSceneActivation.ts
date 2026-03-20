import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { SceneId } from '../types/scenes'

export function useSceneActivation(
  sceneIds: SceneId[],
  sceneRefs: Record<SceneId, HTMLElement | null>,
) {
  const activeId = ref<SceneId>(sceneIds[0])
  let frameHandle = 0

  const measure = () => {
    const anchor = window.innerHeight * 0.36
    let winner = activeId.value
    let bestDistance = Number.POSITIVE_INFINITY

    for (const id of sceneIds) {
      const element = sceneRefs[id]

      if (!element) {
        continue
      }

      const rect = element.getBoundingClientRect()
      const inside = rect.top <= anchor && rect.bottom >= anchor
      const distance = inside
        ? 0
        : Math.min(Math.abs(rect.top - anchor), Math.abs(rect.bottom - anchor))

      if (distance < bestDistance) {
        bestDistance = distance
        winner = id
      }
    }

    activeId.value = winner
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
    window.addEventListener('hashchange', requestMeasure)
  })

  onBeforeUnmount(() => {
    if (frameHandle) {
      window.cancelAnimationFrame(frameHandle)
    }

    window.removeEventListener('scroll', requestMeasure)
    window.removeEventListener('resize', requestMeasure)
    window.removeEventListener('hashchange', requestMeasure)
  })

  return {
    activeId,
    refreshActive: requestMeasure,
  }
}
