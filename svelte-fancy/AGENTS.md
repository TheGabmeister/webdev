# Agent Instructions

## Purpose
These instructions govern future agent work in this repository for the finished Svelte animation showcase. `AGENTS.md` is now the primary repo-level source of truth. `SPEC.md` and `PLANS.md` were intentionally removed and should not be recreated unless the user explicitly asks for new planning documents.

## Current Product State
- The app is a completed single-route Svelte + Vite showcase with a cinematic scroll-led narrative.
- The experience is desktop-only by intent.
- The visual direction is editorial-futurist with warm metallic neutrals, strong typography, layered gradients, procedural surfaces, and precise motion.
- The narrative currently resolves through six major sections: opening hero, credibility, signature takeover, interactive proof, systems detail, and closing CTA.

## Required Workflow
- Read this file before making product, architecture, or implementation decisions.
- Start by inspecting the current implementation instead of assuming old plans still apply.
- Preserve the shipped experience unless the user explicitly asks for a new direction.
- If you make a meaningful product or architecture change, update this file so future sessions inherit the new assumptions.
- Do not recreate deleted planning/spec files by default.

## Current Architecture Map
- [src/App.svelte](C:/dev/webdev/svelte-fancy/src/App.svelte)
  Owns the page shell, measured section geometry, scroll-derived orchestration state, pointer tracking, takeover overlay, and scene assembly.
- [src/lib/content/sections.ts](C:/dev/webdev/svelte-fancy/src/lib/content/sections.ts)
  Holds the lightweight section config model for ids, labels, copy, scene types, accents, and section-specific content payloads.
- [src/lib/components/SectionScene.svelte](C:/dev/webdev/svelte-fancy/src/lib/components/SectionScene.svelte)
  Renders section-local scenes from config plus shared metrics.
- [src/lib/components/ProgressNav.svelte](C:/dev/webdev/svelte-fancy/src/lib/components/ProgressNav.svelte)
  Renders the fixed narrative progress/navigation UI.
- [src/lib/types.ts](C:/dev/webdev/svelte-fancy/src/lib/types.ts)
  Defines the shared config, metric, and pointer types.

## Product And Scope Guardrails
- Keep the app as a single-route SPA on the existing Svelte + Vite stack unless the user explicitly changes direction.
- Preserve a coherent motion language across the whole page.
- Do not let sections drift into unrelated mini-projects or disconnected visual styles.
- Continue optimizing for modern evergreen desktop browsers only unless scope changes.
- Do not spend time on mobile or tablet support unless requested.
- Do not add reduced-motion parity, broad accessibility fallback work, or generalized hardening unless the user asks for it.
- Avoid heavy media dependence and audio-based storytelling.

## Technical Guardrails
- Prefer native Svelte, CSS, and SVG solutions.
- Add third-party libraries only when the gain is concrete and substantial.
- Preserve the lightweight orchestration model in `App.svelte`; do not replace it with a rigid global timeline engine without a strong reason.
- Keep section-local logic close to the scene unless coordination clearly belongs in shared infrastructure.
- Extend the section-driven config model when adding or editing scenes, but do not overengineer it into a generic storytelling framework.
- Preserve native scroll behavior unless there is a compelling reason to introduce managed scrolling.
- Treat resize recalculation as a first-class runtime concern whenever section geometry or motion mapping changes.

## Design Guardrails
- Avoid generic landing-page patterns, flat backgrounds, and interchangeable premium-marketing aesthetics.
- Maintain the editorial-futurist direction with warm metallic neutrals, bold composition, and sharp restrained copy.
- Favor procedural visuals, masks, rings, grids, transforms, layered light, and authored spacing over asset-heavy decoration.
- The signature page-takeover sequence should remain the strongest moment in the experience unless the user asks to replace it.

## Change Guidance
- For copy or section changes, update `sections.ts` first and keep the narrative arc coherent end to end.
- For motion or orchestration changes, inspect `App.svelte` and `SectionScene.svelte` together so shared metrics and local visuals stay aligned.
- For navigation changes, preserve the relationship between fixed progress UI and free native scrolling.
- If the user asks for a major redesign, revise these instructions after implementing the new direction.

## Review Standard
- Before signoff on meaningful changes, run `npm run check`.
- Before signoff on meaningful changes, run `npm run build`.
- When motion, layout, or interaction changes are involved, manually review in desktop browsers when possible.
- Validate section navigation, scroll continuity, resize recalculation, initial load behavior, and the stability of the takeover sequence.
- If the output starts feeling generic, correct the design and motion direction before considering the work complete.
