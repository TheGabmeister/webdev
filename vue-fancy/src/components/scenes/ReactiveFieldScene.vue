<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SceneComponentProps } from '../../types/scenes'
import { clamp, mapRange, mix } from '../../utils/motion'

type FieldMode = 'orbit' | 'weave' | 'pulse'

const props = defineProps<SceneComponentProps>()

const root = ref<HTMLElement | null>(null)
const energy = ref(68)
const mode = ref<FieldMode>('orbit')

const modes: FieldMode[] = ['orbit', 'weave', 'pulse']

const nodeCount = computed(() => {
  const base = props.motionTier === 'full' ? 14 : 10
  return base + Math.round(energy.value / 18)
})

const density = computed(() => clamp(energy.value / 100, 0.18, 1))
const amplitude = computed(() => clamp(0.25 + props.progress * 0.48 + density.value * 0.22, 0, 1))
const cadence = computed(() =>
  mode.value === 'orbit' ? 'vector loop' : mode.value === 'weave' ? 'cross weave' : 'pulse burst',
)

const nodes = computed(() =>
  Array.from({ length: nodeCount.value }, (_, index) => {
    const step = index / nodeCount.value
    const angle = step * Math.PI * 2 + props.progress * Math.PI * 1.8
    const radius = mix(24, 42 + density.value * 18, step)
    const offset = mode.value === 'weave' ? Math.sin(angle * 2) * 14 : Math.cos(angle * 1.4) * 10
    const x = 50 + Math.cos(angle) * radius + offset
    const y = 50 + Math.sin(angle) * radius * 0.7
    const size = mode.value === 'pulse' ? mix(8, 28, (Math.sin(angle * 1.5) + 1) / 2) : mix(8, 20, step)

    return {
      id: `${mode.value}-${index}`,
      style: {
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: `${clamp(0.34 + density.value * 0.55 - step * 0.22, 0.2, 0.95)}`,
        transform: `translate(-50%, -50%) scale(${mix(0.8, 1.2, amplitude.value)})`,
      },
    }
  }),
)

const fieldStyle = computed(() => {
  const depth = mix(0.96, 1.03, props.progress)
  const rotate = mode.value === 'weave' ? mix(-8, 8, props.progress) : mix(-2, 5, props.progress)

  return {
    transform: `scale(${depth}) rotate(${rotate}deg)`,
  }
})

const stats = computed(() => [
  { label: 'Energy', value: `${energy.value}` },
  { label: 'Density', value: `${Math.round(density.value * 100)}%` },
  { label: 'Cadence', value: cadence.value },
])

const fieldCaption = computed(() => {
  if (mode.value === 'orbit') {
    return 'Orbital mode keeps the system coherent while density climbs.'
  }

  if (mode.value === 'weave') {
    return 'Weave mode offsets the grid and exposes how layout follows state.'
  }

  return 'Pulse mode compresses the field into synchronous bursts.'
})

watch(
  () => props.isActive,
  (active) => {
    if (!active || !root.value?.animate) {
      return
    }

    root.value.animate(
      [
        { opacity: 0.4, transform: 'translate3d(0, 20px, 0) scale(0.98)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
      ],
      {
        duration: props.motionTier === 'calm' ? 280 : 620,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'both',
      },
    )
  },
)

const gaugeStyle = computed(() => ({
  width: `${mapRange(energy.value, 0, 100, 12, 100)}%`,
}))
</script>

<template>
  <div ref="root" class="reactive-field">
    <div class="reactive-field__controls">
      <label>
        <span>Signal energy</span>
        <input v-model.number="energy" type="range" min="12" max="100" />
      </label>

      <div class="reactive-field__mode-switch" aria-label="Field mode">
        <button
          v-for="entry in modes"
          :key="entry"
          type="button"
          :class="{ 'is-active': entry === mode }"
          @click="mode = entry"
        >
          {{ entry }}
        </button>
      </div>

      <div class="reactive-field__gauge">
        <span>Resolved pressure</span>
        <div><i :style="gaugeStyle" /></div>
      </div>
    </div>

    <div class="reactive-field__stage" :style="fieldStyle">
      <div class="reactive-field__field">
        <span
          v-for="node in nodes"
          :key="node.id"
          class="reactive-field__node"
          :style="node.style"
        />
      </div>

      <div class="reactive-field__cards">
        <article v-for="stat in stats" :key="stat.label">
          <span>{{ stat.label }}</span>
          <strong>{{ stat.value }}</strong>
        </article>
      </div>
    </div>

    <p class="reactive-field__caption">
      {{ fieldCaption }}
    </p>
  </div>
</template>

<style scoped>
.reactive-field {
  display: grid;
  gap: 1rem;
}

.reactive-field__controls {
  display: grid;
  gap: 0.95rem;
  grid-template-columns: 1.25fr 1fr 1fr;
}

.reactive-field__controls label,
.reactive-field__gauge,
.reactive-field__cards article {
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.035);
}

.reactive-field__controls span,
.reactive-field__cards span,
.reactive-field__gauge span {
  display: block;
  margin-bottom: 0.45rem;
  color: rgba(231, 237, 255, 0.6);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.reactive-field__controls input {
  width: 100%;
  accent-color: #6cf5c2;
}

.reactive-field__mode-switch {
  display: grid;
  gap: 0.55rem;
}

.reactive-field__mode-switch button {
  padding: 0.72rem 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.025);
  color: rgba(240, 243, 255, 0.74);
  text-transform: capitalize;
  transition:
    background 180ms ease,
    transform 180ms ease,
    color 180ms ease;
}

.reactive-field__mode-switch button.is-active {
  background: rgba(108, 245, 194, 0.16);
  color: rgba(226, 255, 246, 0.96);
}

.reactive-field__mode-switch button:hover {
  transform: translateY(-1px);
}

.reactive-field__gauge div {
  overflow: hidden;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
}

.reactive-field__gauge i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(108, 245, 194, 0.3), rgba(122, 231, 255, 0.88));
}

.reactive-field__stage {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1.3fr 0.8fr;
  align-items: stretch;
}

.reactive-field__field {
  position: relative;
  min-height: 22rem;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 30px;
  background:
    radial-gradient(circle at 50% 50%, rgba(108, 245, 194, 0.18), transparent 38%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.03));
}

.reactive-field__field::before,
.reactive-field__field::after {
  content: '';
  position: absolute;
  inset: 10%;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.reactive-field__field::after {
  inset: 20%;
}

.reactive-field__node {
  position: absolute;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.92), rgba(108, 245, 194, 0.2));
  box-shadow: 0 0 20px rgba(108, 245, 194, 0.18);
}

.reactive-field__cards {
  display: grid;
  gap: 0.9rem;
}

.reactive-field__cards strong {
  font-size: 1.2rem;
  text-transform: capitalize;
}

.reactive-field__caption {
  margin: 0;
  max-width: 34rem;
  color: rgba(231, 237, 255, 0.76);
}

@media (max-width: 980px) {
  .reactive-field__controls,
  .reactive-field__stage {
    grid-template-columns: 1fr;
  }

  .reactive-field__field {
    min-height: 18rem;
  }
}
</style>
