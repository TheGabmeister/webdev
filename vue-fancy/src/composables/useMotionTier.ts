import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { MotionTier } from '../types/scenes'

type NavigatorWithHints = Navigator & {
  deviceMemory?: number
}

export function useMotionTier() {
  const prefersReducedMotion = ref(false)
  const isCompactViewport = ref(false)
  const runtimePenalty = ref(false)
  const hardwarePenalty = ref(false)
  const averageFrameMs = ref(16)

  let mediaQuery: MediaQueryList | null = null
  let frameHandle = 0

  const updateViewportState = () => {
    isCompactViewport.value = window.innerWidth < 980

    const device = navigator as NavigatorWithHints
    hardwarePenalty.value =
      typeof device.deviceMemory === 'number'
        ? device.deviceMemory <= 4
        : navigator.hardwareConcurrency <= 4
  }

  const updateReducedMotion = () => {
    prefersReducedMotion.value = mediaQuery?.matches ?? false
  }

  const sampleFrames = () => {
    const samples: number[] = []
    let previous = performance.now()

    const tick = (now: number) => {
      const delta = now - previous
      previous = now
      samples.push(delta)

      if (samples.length >= 90) {
        const total = samples.reduce((sum, value) => sum + value, 0)
        averageFrameMs.value = total / samples.length
        runtimePenalty.value = averageFrameMs.value > 22
        return
      }

      frameHandle = window.requestAnimationFrame(tick)
    }

    frameHandle = window.requestAnimationFrame(tick)
  }

  const tier = computed<MotionTier>(() => {
    if (prefersReducedMotion.value) {
      return 'calm'
    }

    if (isCompactViewport.value || runtimePenalty.value || hardwarePenalty.value) {
      return 'lite'
    }

    return 'full'
  })

  const reasons = computed(() => {
    const activeReasons: string[] = []

    if (prefersReducedMotion.value) {
      activeReasons.push('prefers-reduced-motion')
    }

    if (isCompactViewport.value) {
      activeReasons.push('compact viewport')
    }

    if (hardwarePenalty.value) {
      activeReasons.push('conservative hardware budget')
    }

    if (runtimePenalty.value) {
      activeReasons.push(`frame budget drift (${averageFrameMs.value.toFixed(1)}ms avg)`)
    }

    return activeReasons
  })

  onMounted(() => {
    mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    updateReducedMotion()
    updateViewportState()
    sampleFrames()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateReducedMotion)
    } else {
      mediaQuery.addListener(updateReducedMotion)
    }

    window.addEventListener('resize', updateViewportState, { passive: true })
  })

  onBeforeUnmount(() => {
    if (frameHandle) {
      window.cancelAnimationFrame(frameHandle)
    }

    if (mediaQuery) {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', updateReducedMotion)
      } else {
        mediaQuery.removeListener(updateReducedMotion)
      }
    }

    window.removeEventListener('resize', updateViewportState)
  })

  return {
    tier,
    reasons,
    averageFrameMs,
  }
}
