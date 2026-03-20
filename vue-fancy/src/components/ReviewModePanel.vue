<script setup lang="ts">
import type { MotionTier, SceneDefinition } from '../types/scenes'

defineProps<{
  activeScene: SceneDefinition
  motionTier: MotionTier
  reasons: string[]
  averageFrameMs: number
}>()
</script>

<template>
  <aside class="review-panel" aria-label="Review diagnostics">
    <p class="review-panel__label">Review mode</p>
    <h2>{{ activeScene.title }}</h2>
    <dl class="review-panel__grid">
      <div>
        <dt>Hash</dt>
        <dd>#{{ activeScene.id }}</dd>
      </div>
      <div>
        <dt>Tier</dt>
        <dd>{{ motionTier }}</dd>
      </div>
      <div>
        <dt>Frame avg</dt>
        <dd>{{ averageFrameMs.toFixed(1) }}ms</dd>
      </div>
      <div>
        <dt>Hint</dt>
        <dd>{{ activeScene.reviewHint }}</dd>
      </div>
    </dl>
    <p class="review-panel__reasons">
      {{ reasons.length ? reasons.join(' / ') : 'full fidelity budget intact' }}
    </p>
  </aside>
</template>

<style scoped>
.review-panel {
  position: fixed;
  left: 24px;
  bottom: 24px;
  z-index: 35;
  width: min(28rem, calc(100vw - 32px));
  padding: 1rem 1.1rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 22px;
  background: rgba(8, 12, 20, 0.78);
  box-shadow: 0 18px 45px rgba(3, 6, 12, 0.34);
  backdrop-filter: blur(18px);
}

.review-panel__label {
  margin: 0 0 0.45rem;
  color: rgba(255, 211, 138, 0.9);
  font-family: var(--font-mono);
  font-size: 0.74rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.review-panel h2 {
  margin: 0 0 0.8rem;
  font-size: 1rem;
}

.review-panel__grid {
  display: grid;
  gap: 0.7rem;
  margin: 0;
}

.review-panel__grid div {
  display: grid;
  gap: 0.16rem;
}

.review-panel dt {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(231, 237, 255, 0.48);
}

.review-panel dd {
  margin: 0;
  color: rgba(242, 245, 255, 0.92);
  font-size: 0.9rem;
  line-height: 1.45;
}

.review-panel__reasons {
  margin: 0.9rem 0 0;
  color: rgba(231, 237, 255, 0.72);
  font-size: 0.84rem;
}

@media (max-width: 880px) {
  .review-panel {
    left: 16px;
    bottom: 124px;
    padding: 0.95rem 1rem;
  }
}
</style>
