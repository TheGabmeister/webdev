# AGENTS.md

## Project Purpose
This repo is a Vue 3.5 + Vite + TypeScript single-page showcase designed to demonstrate advanced Vue orchestration under animation-heavy conditions. The app is a five-scene cinematic exhibit, not a generic marketing site or CRUD app.

The current goal is to preserve and extend that showcase quality:
- Keep the experience single-route.
- Keep the engineering signal in reusable Vue patterns, not heavy animation libraries.
- Prefer DOM/SVG motion, native scroll, and reactive orchestration.

## Stack
- Vue 3.5
- Vite 6
- TypeScript
- No Vue Router
- No Pinia or other global state library
- No third-party animation runtime

## Current Architecture
- [`src/App.vue`](C:/dev/webdev/vue-fancy/src/App.vue): top-level shell, scene loop, progress rail, review panel, scene refs, active scene wiring.
- [`src/data/scenes.ts`](C:/dev/webdev/vue-fancy/src/data/scenes.ts): canonical scene registry and metadata. Treat this as the source of truth for scene order and public scene IDs.
- [`src/types/scenes.ts`](C:/dev/webdev/vue-fancy/src/types/scenes.ts): shared scene and motion types.
- [`src/composables`](C:/dev/webdev/vue-fancy/src/composables/useSceneRegistry.ts): reusable orchestration layer.
- [`src/components/scenes`](C:/dev/webdev/vue-fancy/src/components/scenes/IntroScene.vue): scene implementations.
- [`src/components/ProgressRail.vue`](C:/dev/webdev/vue-fancy/src/components/ProgressRail.vue): persistent scene navigation.
- [`src/components/ReviewModePanel.vue`](C:/dev/webdev/vue-fancy/src/components/ReviewModePanel.vue): reviewer diagnostics UI.
- [`src/styles.css`](C:/dev/webdev/vue-fancy/src/styles.css): global visual system and page-level atmosphere.

## Core Product Constraints
- Keep the major scenes addressable by hash:
  - `#intro`
  - `#reactive-field`
  - `#morph-engine`
  - `#overlay-orbit`
  - `#adaptive-finale`
- Keep review mode query-driven via `?review=1`.
- Preserve motion tier behavior:
  - `full`
  - `lite`
  - `calm`
- Reduced motion should remain a parallel version of the same narrative, not a separate stripped-down app.
- Mobile should preserve the same scene order and intent, with simplified layer count and motion density.
- Do not hijack scroll into a custom timeline system.

## Implementation Rules For Future Sessions
- Prefer extending the existing composable layer before adding one-off scene logic to `App.vue`.
- Add new scene-level behavior through typed data and props first, not ad hoc DOM querying.
- If changing scene order or IDs, update the registry in `src/data/scenes.ts` first and then verify hash navigation.
- Keep runtime dependencies lean. Avoid adding libraries unless they remove real complexity and do not change the architectural direction.
- Prefer CSS transforms, opacity, filters, SVG, and WAAPI over canvas/WebGL unless the user explicitly changes scope.
- Preserve the luminous editorial visual direction already established in `src/styles.css`.

## Workflow
1. Inspect the scene registry and composables before editing scene components.
2. Implement changes with the existing architecture unless there is a clear reason to refactor.
3. Run `npm run build` after meaningful changes.

## What To Check After Changes
- The app still builds with `npm run build`.
- Hash links still land on the correct scenes.
- `?review=1` still exposes reviewer UI and default mode stays clean.
- Motion tier changes still degrade coherently on compact viewports and reduced-motion settings.
- Scene transitions remain smooth and visually intentional on desktop and mobile widths.

## Known Repo Characteristics
- The app currently relies on browser APIs such as `matchMedia`, `visualViewport`, `requestAnimationFrame`, and Teleport.
- Scene activation and scene progress are calculated from live DOM measurements, so layout changes can affect motion behavior.
- The document title is updated from active scene state in `App.vue`.
- The project currently has no automated tests beyond build validation.

## Preferred Change Style
- Make focused changes that preserve the current architecture.
- Avoid replacing the scene system with a framework-driven abstraction.
- Avoid generic UI kits or visual resets that flatten the current art direction.
- If a change increases complexity, document the reasoning in code comments only where necessary.
