<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SceneComponentProps } from '../../types/scenes'
import { mix } from '../../utils/motion'

const props = defineProps<SceneComponentProps>()

const root = ref<HTMLElement | null>(null)

function buildWavePath(progress: number, amplitude: number, offset: number) {
  const points: string[] = []
  const width = 640
  const height = 250
  const centerY = height / 2 + offset

  for (let x = 0; x <= width; x += 24) {
    const ratio = x / width
    const y = centerY + Math.sin(ratio * Math.PI * 4 + progress * Math.PI * 1.8) * amplitude
    points.push(`${x},${y.toFixed(1)}`)
  }

  return `M ${points.join(' L ')}`
}

const amplitude = computed(() => {
  const base = props.motionTier === 'full' ? 42 : props.motionTier === 'lite' ? 28 : 18
  return mix(base * 0.8, base, props.progress)
})

const primaryPath = computed(() => buildWavePath(props.progress, amplitude.value, -8))
const secondaryPath = computed(() => buildWavePath(props.progress * 0.8 + 0.12, amplitude.value * 0.55, 34))
const revealWidth = computed(() => `${mix(26, 100, props.progress)}%`)
const dashOffset = computed(() => `${mix(180, 0, props.progress)}`)

watch(
  () => props.isActive,
  (active) => {
    if (!active || !root.value?.animate) {
      return
    }

    root.value.animate(
      [
        { opacity: 0.35, transform: 'translate3d(0, 18px, 0)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ],
      {
        duration: props.motionTier === 'calm' ? 260 : 680,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'both',
      },
    )
  },
)
</script>

<template>
  <div ref="root" class="morph-engine">
    <div class="morph-engine__frame">
      <div class="morph-engine__reveal" :style="{ width: revealWidth }" />

      <svg class="morph-engine__svg" viewBox="0 0 640 260" aria-hidden="true">
        <defs>
          <linearGradient id="morph-primary-gradient" x1="0%" x2="100%">
            <stop offset="0%" stop-color="#7ae7ff" />
            <stop offset="50%" stop-color="#ffd38a" />
            <stop offset="100%" stop-color="#96a8ff" />
          </linearGradient>
          <linearGradient id="morph-fill-gradient" x1="0%" x2="100%">
            <stop offset="0%" stop-color="#7ae7ff" stop-opacity="0.2" />
            <stop offset="100%" stop-color="#ffd38a" stop-opacity="0.04" />
          </linearGradient>
        </defs>

        <path
          :d="`${primaryPath} L 640,260 L 0,260 Z`"
          fill="url(#morph-fill-gradient)"
          opacity="0.7"
        />
        <path
          :d="primaryPath"
          fill="none"
          stroke="url(#morph-primary-gradient)"
          stroke-width="4"
          stroke-linecap="round"
          stroke-dasharray="14 12"
          :stroke-dashoffset="dashOffset"
        />
        <path
          :d="secondaryPath"
          fill="none"
          stroke="rgba(231, 237, 255, 0.48)"
          stroke-width="2.2"
          stroke-linecap="round"
          opacity="0.8"
        />
      </svg>
    </div>

    <div class="morph-engine__stats">
      <article>
        <span>Path amplitude</span>
        <strong>{{ Math.round(amplitude) }} units</strong>
      </article>
      <article>
        <span>Reveal plane</span>
        <strong>{{ revealWidth }}</strong>
      </article>
      <article>
        <span>Runtime</span>
        <strong>DOM + SVG only</strong>
      </article>
    </div>
  </div>
</template>

<style scoped>
.morph-engine {
  display: grid;
  gap: 1rem;
}

.morph-engine__frame {
  position: relative;
  overflow: hidden;
  min-height: 24rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 30px;
  background:
    radial-gradient(circle at 20% 20%, rgba(122, 231, 255, 0.08), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.04));
}

.morph-engine__frame::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.85), transparent 90%);
}

.morph-engine__reveal {
  position: absolute;
  top: 8%;
  bottom: 8%;
  left: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.14);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.03), transparent);
}

.morph-engine__svg {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
}

.morph-engine__stats {
  display: grid;
  gap: 0.8rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.morph-engine__stats article {
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
}

.morph-engine__stats span {
  display: block;
  margin-bottom: 0.36rem;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(231, 237, 255, 0.58);
}

.morph-engine__stats strong {
  font-size: 1.05rem;
}

@media (max-width: 980px) {
  .morph-engine__frame {
    min-height: 18rem;
  }

  .morph-engine__stats {
    grid-template-columns: 1fr;
  }
}
</style>
