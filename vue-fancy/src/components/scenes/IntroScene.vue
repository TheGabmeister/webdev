<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SceneComponentProps } from '../../types/scenes'
import { mapRange, mix } from '../../utils/motion'

const props = defineProps<SceneComponentProps>()

const root = ref<HTMLElement | null>(null)

const titleStyle = computed(() => {
  const y = mix(22, -28, props.progress)
  const scale = mix(0.96, 1.06, props.progress)

  return {
    transform: `translate3d(0, ${y}px, 0) scale(${scale})`,
    opacity: mapRange(props.progress, 0, 0.2, 0.4, 1),
  }
})

const gridStyle = computed(() => {
  const rotate = mix(-8, 6, props.progress)
  const shift = mix(-18, 20, props.progress)

  return {
    transform: `translate3d(${shift}px, 0, 0) rotate(${rotate}deg)`,
  }
})

const metrics = computed(() => [
  { label: 'Scroll phase', value: `${Math.round(props.progress * 100)}%` },
  { label: 'Motion tier', value: props.motionTier },
  { label: 'Scene state', value: props.isActive ? 'active' : 'queued' },
])

watch(
  () => props.isActive,
  (active) => {
    if (!active || !root.value?.animate) {
      return
    }

    root.value.animate(
      [
        { opacity: 0.2, transform: 'translate3d(0, 24px, 0) scale(0.985)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
      ],
      {
        duration: props.motionTier === 'calm' ? 320 : 760,
        easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)',
        fill: 'both',
      },
    )
  },
)
</script>

<template>
  <div ref="root" class="intro-scene">
    <div class="intro-scene__halo" :style="gridStyle" />
    <div class="intro-scene__copy" :style="titleStyle">
      <p class="intro-scene__eyebrow">Reactive exhibit / Vue 3.5 / native scroll</p>
      <h3>Vue<br />in motion.</h3>
      <p class="intro-scene__lead">
        Scroll through five linked scenes built to show state, structure, and animation behaving as one system.
      </p>
    </div>

    <svg
      class="intro-scene__diagram"
      viewBox="0 0 640 420"
      aria-hidden="true"
      :style="gridStyle"
    >
      <defs>
        <linearGradient id="intro-grid-gradient" x1="0%" x2="100%">
          <stop offset="0%" stop-color="#7ae7ff" stop-opacity="0.08" />
          <stop offset="100%" stop-color="#96a8ff" stop-opacity="0.3" />
        </linearGradient>
      </defs>
      <g opacity="0.85">
        <path
          d="M70 320 C170 250, 260 270, 350 210 S500 120, 580 170"
          stroke="url(#intro-grid-gradient)"
          stroke-width="3"
          fill="none"
          stroke-linecap="round"
        />
        <circle cx="350" cy="210" r="18" class="intro-scene__pulse" />
        <circle cx="510" cy="145" r="11" class="intro-scene__pulse intro-scene__pulse--soft" />
        <rect x="110" y="72" width="420" height="246" rx="28" class="intro-scene__frame" />
      </g>
    </svg>

    <div class="intro-scene__metrics">
      <article v-for="metric in metrics" :key="metric.label">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
      </article>
    </div>
  </div>
</template>

<style scoped>
.intro-scene {
  position: relative;
  display: grid;
  gap: 1.25rem;
  min-height: 100%;
}

.intro-scene__halo {
  position: absolute;
  inset: 12% 20% auto auto;
  width: min(22rem, 42vw);
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 35%, rgba(122, 231, 255, 0.34), transparent 48%),
    radial-gradient(circle at 70% 60%, rgba(150, 168, 255, 0.22), transparent 52%);
  filter: blur(18px);
  pointer-events: none;
}

.intro-scene__copy {
  position: relative;
  z-index: 2;
  max-width: 32rem;
}

.intro-scene__eyebrow {
  margin: 0 0 0.9rem;
  font-family: var(--font-mono);
  font-size: 0.74rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(231, 237, 255, 0.62);
}

.intro-scene h3 {
  margin: 0;
  font-size: clamp(3.4rem, 11vw, 7rem);
  line-height: 0.92;
  letter-spacing: -0.07em;
}

.intro-scene__lead {
  max-width: 26rem;
  margin: 1rem 0 0;
  color: rgba(231, 237, 255, 0.78);
}

.intro-scene__diagram {
  width: min(100%, 38rem);
  justify-self: end;
  overflow: visible;
}

.intro-scene__frame {
  fill: rgba(10, 16, 28, 0.44);
  stroke: rgba(231, 237, 255, 0.12);
}

.intro-scene__pulse {
  fill: rgba(122, 231, 255, 0.28);
  stroke: rgba(122, 231, 255, 0.7);
  stroke-width: 2;
}

.intro-scene__pulse--soft {
  fill: rgba(150, 168, 255, 0.22);
  stroke: rgba(150, 168, 255, 0.6);
}

.intro-scene__metrics {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

.intro-scene__metrics article {
  display: grid;
  gap: 0.38rem;
  padding: 0.95rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
}

.intro-scene__metrics span {
  color: rgba(231, 237, 255, 0.58);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.intro-scene__metrics strong {
  font-size: 1rem;
  font-weight: 600;
}

@media (max-width: 980px) {
  .intro-scene__diagram {
    justify-self: start;
  }

  .intro-scene__metrics {
    grid-template-columns: 1fr;
  }
}
</style>
