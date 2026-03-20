<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { MotionTier, SceneComponentProps } from '../../types/scenes'
import { mix } from '../../utils/motion'

const props = defineProps<SceneComponentProps>()

const root = ref<HTMLElement | null>(null)

const tiers: Array<{ id: MotionTier; title: string; copy: string }> = [
  {
    id: 'full',
    title: 'Full',
    copy: 'Highest layer count with broader depth and richer overlap.',
  },
  {
    id: 'lite',
    title: 'Lite',
    copy: 'Same narrative, fewer concurrent effects, cleaner spacing.',
  },
  {
    id: 'calm',
    title: 'Calm',
    copy: 'Parallel low-motion mode that keeps every scene intact.',
  },
]

const ringStyle = computed(() => {
  const rotate = mix(-18, 24, props.progress)
  const scale = mix(0.92, 1.06, props.progress)

  return {
    transform: `rotate(${rotate}deg) scale(${scale})`,
  }
})

watch(
  () => props.isActive,
  (active) => {
    if (!active || !root.value?.animate) {
      return
    }

    root.value.animate(
      [
        { opacity: 0.38, transform: 'translate3d(0, 24px, 0) scale(0.985)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
      ],
      {
        duration: props.motionTier === 'calm' ? 280 : 700,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'both',
      },
    )
  },
)
</script>

<template>
  <div ref="root" class="adaptive-finale">
    <div class="adaptive-finale__hero">
      <div class="adaptive-finale__rings" :style="ringStyle">
        <span />
        <span />
        <span />
      </div>

      <div class="adaptive-finale__copy">
        <p class="adaptive-finale__eyebrow">Current motion tier</p>
        <h3>{{ motionTier }}</h3>
        <p>
          One story, one scene graph, multiple motion budgets resolved at runtime without changing the route model.
        </p>
      </div>
    </div>

    <div class="adaptive-finale__cards">
      <article
        v-for="tierEntry in tiers"
        :key="tierEntry.id"
        :class="{ 'is-active': tierEntry.id === motionTier }"
      >
        <span>{{ tierEntry.title }}</span>
        <p>{{ tierEntry.copy }}</p>
      </article>
    </div>

    <div class="adaptive-finale__links">
      <a href="#intro">Intro</a>
      <a href="#reactive-field">Field</a>
      <a href="#morph-engine">Morph</a>
      <a href="#overlay-orbit">Orbit</a>
    </div>
  </div>
</template>

<style scoped>
.adaptive-finale {
  display: grid;
  gap: 1.1rem;
}

.adaptive-finale__hero {
  display: grid;
  gap: 1rem;
  grid-template-columns: 0.9fr 1.1fr;
  align-items: center;
}

.adaptive-finale__rings {
  position: relative;
  min-height: 20rem;
}

.adaptive-finale__rings span {
  position: absolute;
  inset: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.adaptive-finale__rings span:nth-child(1) {
  width: min(22rem, 100%);
  aspect-ratio: 1;
  background: radial-gradient(circle at 50% 50%, rgba(150, 168, 255, 0.18), transparent 58%);
}

.adaptive-finale__rings span:nth-child(2) {
  width: min(16rem, 72%);
  aspect-ratio: 1;
}

.adaptive-finale__rings span:nth-child(3) {
  width: min(10rem, 44%);
  aspect-ratio: 1;
  background: radial-gradient(circle at 50% 50%, rgba(122, 231, 255, 0.16), transparent 64%);
}

.adaptive-finale__copy {
  max-width: 28rem;
}

.adaptive-finale__eyebrow {
  margin: 0 0 0.7rem;
  color: rgba(231, 237, 255, 0.58);
  font-family: var(--font-mono);
  font-size: 0.74rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.adaptive-finale__copy h3 {
  margin: 0;
  font-size: clamp(2.6rem, 7vw, 4.6rem);
  line-height: 0.95;
  letter-spacing: -0.06em;
  text-transform: capitalize;
}

.adaptive-finale__copy p:last-child {
  color: rgba(231, 237, 255, 0.76);
}

.adaptive-finale__cards {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.adaptive-finale__cards article {
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
}

.adaptive-finale__cards article.is-active {
  background: rgba(150, 168, 255, 0.14);
}

.adaptive-finale__cards span {
  display: block;
  margin-bottom: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(231, 237, 255, 0.58);
}

.adaptive-finale__cards p {
  margin: 0;
  color: rgba(240, 243, 255, 0.8);
}

.adaptive-finale__links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.adaptive-finale__links a {
  padding: 0.72rem 0.95rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(240, 243, 255, 0.86);
}

@media (max-width: 980px) {
  .adaptive-finale__hero,
  .adaptive-finale__cards {
    grid-template-columns: 1fr;
  }

  .adaptive-finale__rings {
    min-height: 14rem;
  }
}
</style>
