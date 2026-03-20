<script setup lang="ts">
import type { MotionTier, SceneDefinition, SceneId } from '../types/scenes'

defineProps<{
  scenes: SceneDefinition[]
  activeId: SceneId
  motionTier: MotionTier
  reviewMode: boolean
}>()
</script>

<template>
  <nav class="progress-rail" aria-label="Scene navigation">
    <div class="progress-rail__meta">
      <span class="progress-rail__brand">Vue Fancy</span>
      <span class="progress-rail__tier">{{ motionTier }}</span>
    </div>

    <a
      v-for="scene in scenes"
      :key="scene.id"
      class="progress-rail__item"
      :class="{ 'is-active': scene.id === activeId }"
      :href="`#${scene.id}`"
      :aria-current="scene.id === activeId ? 'true' : undefined"
    >
      <span class="progress-rail__index">0{{ scene.index }}</span>
      <span class="progress-rail__label">{{ scene.title }}</span>
    </a>

    <div v-if="reviewMode" class="progress-rail__review-flag">review</div>
  </nav>
</template>

<style scoped>
.progress-rail {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 40;
  display: grid;
  gap: 0.85rem;
  width: min(18rem, calc(100vw - 32px));
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 24px;
  background: rgba(9, 14, 26, 0.68);
  box-shadow: 0 18px 50px rgba(5, 8, 15, 0.35);
  backdrop-filter: blur(18px);
}

.progress-rail__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(231, 237, 255, 0.72);
}

.progress-rail__brand {
  font-weight: 700;
}

.progress-rail__tier {
  padding: 0.32rem 0.55rem;
  border-radius: 999px;
  background: rgba(122, 231, 255, 0.12);
  color: rgba(167, 241, 255, 0.92);
}

.progress-rail__item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem;
  align-items: center;
  padding: 0.7rem 0.8rem;
  border-radius: 18px;
  color: rgba(231, 237, 255, 0.76);
  transition:
    background 180ms ease,
    color 180ms ease,
    transform 180ms ease;
}

.progress-rail__item:hover {
  transform: translateX(-2px);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(245, 247, 255, 0.96);
}

.progress-rail__item.is-active {
  background:
    linear-gradient(135deg, rgba(122, 231, 255, 0.22), rgba(150, 168, 255, 0.12)),
    rgba(255, 255, 255, 0.04);
  color: rgba(245, 247, 255, 1);
}

.progress-rail__index {
  font-family: var(--font-mono);
  font-size: 0.76rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(122, 231, 255, 0.82);
}

.progress-rail__label {
  font-size: 0.9rem;
}

.progress-rail__review-flag {
  justify-self: start;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  background: rgba(255, 211, 138, 0.14);
  color: rgba(255, 220, 163, 0.95);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

@media (max-width: 880px) {
  .progress-rail {
    top: auto;
    right: 16px;
    bottom: 16px;
    left: 16px;
    width: auto;
    gap: 0.6rem;
    padding: 0.85rem;
  }

  .progress-rail__item {
    grid-template-columns: auto 1fr;
    padding: 0.58rem 0.7rem;
  }

  .progress-rail__label {
    font-size: 0.82rem;
  }
}
</style>
