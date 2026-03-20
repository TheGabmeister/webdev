<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, watch } from 'vue'
import AdaptiveFinaleScene from './components/scenes/AdaptiveFinaleScene.vue'
import IntroScene from './components/scenes/IntroScene.vue'
import MorphEngineScene from './components/scenes/MorphEngineScene.vue'
import OverlayOrbitScene from './components/scenes/OverlayOrbitScene.vue'
import ReactiveFieldScene from './components/scenes/ReactiveFieldScene.vue'
import ProgressRail from './components/ProgressRail.vue'
import ReviewModePanel from './components/ReviewModePanel.vue'
import { useMotionTier } from './composables/useMotionTier'
import { useReviewMode } from './composables/useReviewMode'
import { useSceneActivation } from './composables/useSceneActivation'
import { useSceneRegistry } from './composables/useSceneRegistry'
import { useScrollProgress } from './composables/useScrollProgress'
import type { SceneId } from './types/scenes'

const sceneComponents = {
  intro: IntroScene,
  'reactive-field': ReactiveFieldScene,
  'morph-engine': MorphEngineScene,
  'overlay-orbit': OverlayOrbitScene,
  'adaptive-finale': AdaptiveFinaleScene,
}

const { scenes, sceneIds, sceneMap } = useSceneRegistry()

const sceneRefs = reactive(
  Object.fromEntries(sceneIds.map((id) => [id, null])) as Record<SceneId, HTMLElement | null>,
)

function setSceneRef(id: SceneId, element: Element | null) {
  sceneRefs[id] = element instanceof HTMLElement ? element : null
  refreshProgress()
  refreshActive()
}

const { progressById, refreshProgress } = useScrollProgress(sceneIds, sceneRefs)
const { activeId, refreshActive } = useSceneActivation(sceneIds, sceneRefs)
const { tier, reasons, averageFrameMs } = useMotionTier()
const { reviewMode } = useReviewMode()

const activeScene = computed(() => sceneMap[activeId.value])

const handleHashSync = () => {
  refreshProgress()
  refreshActive()
}

onMounted(() => {
  nextTick(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1)) as SceneId
    const target = hash ? sceneRefs[hash] : null

    if (target) {
      target.scrollIntoView({ block: 'start' })
    }

    refreshProgress()
    refreshActive()
  })

  window.addEventListener('hashchange', handleHashSync)
})

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', handleHashSync)
})

watch(activeId, (id) => {
  document.title = `Vue Fancy • ${sceneMap[id].title}`
})
</script>

<template>
  <div class="app-shell">
    <ProgressRail
      :scenes="scenes"
      :active-id="activeId"
      :motion-tier="tier"
      :review-mode="reviewMode"
    />

    <ReviewModePanel
      v-if="reviewMode"
      :active-scene="activeScene"
      :motion-tier="tier"
      :reasons="reasons"
      :average-frame-ms="averageFrameMs"
    />

    <header class="masthead">
      <p class="masthead__label">Single-route Vue showcase</p>
      <div>
        <h1>Five scenes, one reactive motion system.</h1>
        <p>
          Native scroll, DOM/SVG choreography, typed scene metadata, and adaptive motion tiers without a heavy animation runtime.
        </p>
      </div>
    </header>

    <main class="scene-stack">
      <section
        v-for="scene in scenes"
        :id="scene.id"
        :key="scene.id"
        :ref="(element) => setSceneRef(scene.id, element)"
        class="scene-panel"
        :class="{ 'is-active': activeId === scene.id }"
      >
        <div class="scene-panel__sticky">
          <div class="scene-panel__grid">
            <aside class="scene-panel__meta">
              <p class="scene-panel__kicker">{{ scene.kicker }}</p>
              <h2>{{ scene.title }}</h2>
              <p class="scene-panel__summary">{{ scene.summary }}</p>

              <dl class="scene-panel__cues">
                <div>
                  <dt>Enter</dt>
                  <dd>{{ scene.enter }}</dd>
                </div>
                <div>
                  <dt>Exit</dt>
                  <dd>{{ scene.exit }}</dd>
                </div>
                <div>
                  <dt>Reduced motion</dt>
                  <dd>{{ scene.reducedMotionStrategy }}</dd>
                </div>
              </dl>

              <div class="scene-panel__tags">
                <span>{{ scene.theme }}</span>
                <span>{{ scene.supportsInteraction ? 'Interactive' : 'Directed' }}</span>
              </div>
            </aside>

            <div class="scene-panel__stage">
              <component
                :is="sceneComponents[scene.id]"
                :definition="scene"
                :progress="progressById[scene.id]"
                :is-active="activeId === scene.id"
                :motion-tier="tier"
                :review-mode="reviewMode"
              />

              <div v-if="reviewMode" class="scene-panel__debug">
                <span>#{{ scene.id }}</span>
                <span>{{ Math.round(progressById[scene.id] * 100) }}% progress</span>
                <span>{{ scene.reviewHint }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
}

.masthead {
  display: grid;
  gap: 1.1rem;
  padding: 6rem 5vw 1rem;
}

.masthead__label {
  margin: 0;
  color: rgba(255, 211, 138, 0.88);
  font-family: var(--font-mono);
  font-size: 0.76rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.masthead h1 {
  max-width: 12ch;
  margin: 0;
  font-size: clamp(3.2rem, 10vw, 6.8rem);
  line-height: 0.9;
  letter-spacing: -0.08em;
}

.masthead p:last-child {
  max-width: 44rem;
  margin: 1rem 0 0;
  color: rgba(231, 237, 255, 0.76);
}

.scene-stack {
  padding-bottom: 12rem;
}

.scene-panel {
  position: relative;
  min-height: 185svh;
}

.scene-panel__sticky {
  position: sticky;
  top: 0;
  min-height: 100svh;
  display: grid;
  align-items: center;
  padding: 2rem 5vw;
}

.scene-panel__grid {
  position: relative;
  display: grid;
  gap: 2rem;
  grid-template-columns: minmax(18rem, 0.75fr) minmax(0, 1.25fr);
  align-items: center;
}

.scene-panel__meta,
.scene-panel__stage {
  position: relative;
  padding: 1.35rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 32px;
  background: rgba(10, 15, 28, 0.52);
  backdrop-filter: blur(18px);
}

.scene-panel__meta {
  display: grid;
  gap: 1rem;
}

.scene-panel__kicker {
  margin: 0;
  color: rgba(122, 231, 255, 0.88);
  font-family: var(--font-mono);
  font-size: 0.74rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.scene-panel h2 {
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.8rem);
  line-height: 0.96;
  letter-spacing: -0.06em;
}

.scene-panel__summary {
  margin: 0;
  color: rgba(231, 237, 255, 0.8);
}

.scene-panel__cues {
  display: grid;
  gap: 0.9rem;
  margin: 0;
}

.scene-panel__cues div {
  display: grid;
  gap: 0.24rem;
}

.scene-panel__cues dt {
  color: rgba(231, 237, 255, 0.5);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.scene-panel__cues dd {
  margin: 0;
  color: rgba(240, 243, 255, 0.84);
  line-height: 1.5;
}

.scene-panel__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.scene-panel__tags span,
.scene-panel__debug span {
  padding: 0.45rem 0.65rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(240, 243, 255, 0.82);
  font-size: 0.78rem;
}

.scene-panel__stage {
  min-height: 38rem;
  display: grid;
  align-content: start;
  gap: 0.9rem;
}

.scene-panel__debug {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.scene-panel.is-active .scene-panel__meta,
.scene-panel.is-active .scene-panel__stage {
  border-color: rgba(122, 231, 255, 0.16);
}

@media (max-width: 1100px) {
  .scene-panel__grid {
    grid-template-columns: 1fr;
  }

  .scene-panel__stage {
    min-height: auto;
  }
}

@media (max-width: 880px) {
  .masthead {
    padding: 3rem 16px 1rem;
  }

  .scene-panel__sticky {
    padding: 1rem 16px;
  }

  .scene-panel__meta,
  .scene-panel__stage {
    padding: 1rem;
    border-radius: 24px;
  }

  .scene-panel {
    min-height: 165svh;
  }
}
</style>
