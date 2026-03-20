<script setup lang="ts">
import { Teleport, computed, ref, watch } from 'vue'
import type { SceneComponentProps } from '../../types/scenes'
import { mix } from '../../utils/motion'

type OrbitLayer = 'signal' | 'memory' | 'release'

const props = defineProps<SceneComponentProps>()

const root = ref<HTMLElement | null>(null)
const currentLayer = ref<OrbitLayer>('signal')
const layers: OrbitLayer[] = ['signal', 'memory', 'release']

const orbitNodes = computed(() =>
  layers.map((layer, index) => {
    const active = layer === currentLayer.value
    const angle = index * (Math.PI * 2 / 3) + props.progress * Math.PI * 0.9
    const distance = mix(80, props.motionTier === 'full' ? 132 : 108, props.progress)

    return {
      id: layer,
      active,
      style: {
        transform: `translate3d(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance * 0.65}px, 0)`,
      },
    }
  }),
)

watch(
  () => props.isActive,
  (active) => {
    if (!active || !root.value?.animate) {
      return
    }

    root.value.animate(
      [
        { opacity: 0.45, transform: 'translate3d(0, 18px, 0) scale(0.985)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
      ],
      {
        duration: props.motionTier === 'calm' ? 260 : 620,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'both',
      },
    )
  },
)

const overlayCopy = computed(() => {
  if (currentLayer.value === 'signal') {
    return 'Live overlay mirrors the highlighted orbital layer.'
  }

  if (currentLayer.value === 'memory') {
    return 'Teleported state stays aligned while the shell continues to scroll normally.'
  }

  return 'The overlay can collapse cleanly without losing the scene’s focal state.'
})
</script>

<template>
  <div ref="root" class="overlay-orbit">
    <div class="overlay-orbit__controls">
      <button
        v-for="layer in layers"
        :key="layer"
        type="button"
        :class="{ 'is-active': layer === currentLayer }"
        @click="currentLayer = layer"
      >
        {{ layer }}
      </button>
    </div>

    <div class="overlay-orbit__stage">
      <div class="overlay-orbit__core">
        <span
          v-for="node in orbitNodes"
          :key="node.id"
          class="overlay-orbit__node"
          :class="{ 'is-active': node.active }"
          :style="node.style"
        >
          {{ node.id }}
        </span>
        <div class="overlay-orbit__center">
          <strong>{{ currentLayer }}</strong>
          <small>focus lock</small>
        </div>
      </div>

      <p class="overlay-orbit__caption">{{ overlayCopy }}</p>
    </div>

    <Teleport to="body">
      <aside
        v-if="props.isActive"
        class="overlay-orbit__teleport"
        :class="`is-${currentLayer}`"
        aria-label="Layer overlay"
      >
        <span>Overlay orbit</span>
        <strong>{{ currentLayer }}</strong>
        <p>{{ overlayCopy }}</p>
      </aside>
    </Teleport>
  </div>
</template>

<style scoped>
.overlay-orbit {
  display: grid;
  gap: 1rem;
}

.overlay-orbit__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.overlay-orbit__controls button {
  padding: 0.72rem 0.95rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(240, 243, 255, 0.72);
  text-transform: capitalize;
  transition:
    transform 180ms ease,
    background 180ms ease,
    color 180ms ease;
}

.overlay-orbit__controls button.is-active {
  background: rgba(253, 176, 255, 0.16);
  color: rgba(255, 238, 255, 0.95);
}

.overlay-orbit__stage {
  display: grid;
  gap: 1rem;
}

.overlay-orbit__core {
  position: relative;
  min-height: 24rem;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 30px;
  background:
    radial-gradient(circle at 50% 50%, rgba(253, 176, 255, 0.18), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.04));
}

.overlay-orbit__core::before,
.overlay-orbit__core::after {
  content: '';
  position: absolute;
  inset: 18% 28%;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 50%;
}

.overlay-orbit__core::after {
  inset: 30% 38%;
}

.overlay-orbit__center {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  gap: 0.2rem;
  place-items: center;
  width: 7rem;
  aspect-ratio: 1;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  background: rgba(12, 18, 30, 0.82);
  transform: translate(-50%, -50%);
}

.overlay-orbit__center strong {
  font-size: 1.1rem;
  text-transform: capitalize;
}

.overlay-orbit__center small {
  color: rgba(231, 237, 255, 0.58);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.overlay-orbit__node {
  position: absolute;
  top: 50%;
  left: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 6.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(231, 237, 255, 0.72);
  text-transform: capitalize;
}

.overlay-orbit__node.is-active {
  background: rgba(253, 176, 255, 0.18);
  color: rgba(255, 240, 255, 0.96);
}

.overlay-orbit__caption {
  margin: 0;
  max-width: 30rem;
  color: rgba(231, 237, 255, 0.76);
}

:global(.overlay-orbit__teleport) {
  position: fixed;
  top: 120px;
  right: 24px;
  z-index: 30;
  width: min(18rem, calc(100vw - 40px));
  padding: 1rem 1.05rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 22px;
  background: rgba(9, 13, 22, 0.82);
  box-shadow: 0 18px 45px rgba(4, 7, 13, 0.34);
  backdrop-filter: blur(16px);
}

:global(.overlay-orbit__teleport span) {
  display: block;
  margin-bottom: 0.4rem;
  color: rgba(231, 237, 255, 0.56);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

:global(.overlay-orbit__teleport strong) {
  display: block;
  margin-bottom: 0.45rem;
  font-size: 1.15rem;
  text-transform: capitalize;
}

:global(.overlay-orbit__teleport p) {
  margin: 0;
  color: rgba(231, 237, 255, 0.74);
  font-size: 0.88rem;
  line-height: 1.5;
}

@media (max-width: 980px) {
  .overlay-orbit__core {
    min-height: 18rem;
  }

  :global(.overlay-orbit__teleport) {
    top: auto;
    right: 16px;
    bottom: 124px;
  }
}
</style>
