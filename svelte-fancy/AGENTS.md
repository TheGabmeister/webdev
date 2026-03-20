# Agent Instructions

## Purpose
These instructions govern future agent work in this repository for the Svelte animation showcase. Read this file together with `SPEC.md` and `PLANS.md` before making product, architecture, or implementation decisions.

## Required Workflow
- Read `SPEC.md` before starting any milestone work.
- Treat `PLANS.md` as the execution source of truth.
- Update milestone status in `PLANS.md` as work progresses.
- Do not begin a later milestone until the current one has been reviewed.
- If new product or architecture decisions appear, revise the docs before implementing against the new assumptions.

## Product And Scope Guardrails
- Preserve a coherent motion language across the whole page.
- Do not let sections turn into unrelated visual mini-projects.
- Keep the app as a single-route SPA on the existing Svelte + Vite stack unless the user explicitly changes direction.
- Optimize for modern evergreen desktop browsers only.
- Do not spend time on mobile or tablet support unless the user changes scope.
- Do not add reduced-motion parity, extensive accessibility fallback work, or broad environment hardening unless requested later.
- Avoid heavy media dependence and audio-based storytelling.

## Technical Guardrails
- Prefer native Svelte, CSS, and SVG solutions.
- Add third-party libraries only when the improvement is concrete and substantial.
- Favor reusable motion primitives plus a lightweight shared orchestration layer over a rigid global timeline engine.
- Keep section-local logic close to the section unless coordination clearly belongs in shared infrastructure.
- Use a section-driven config model for metadata, copy, and motion hooks, but do not overengineer a generic storytelling framework.
- Preserve native scroll behavior unless there is a compelling reason to introduce managed scrolling.
- Ensure resize recalculation is treated as a first-class runtime concern during implementation.

## Design Guardrails
- Avoid generic design patterns, flat backgrounds, default font stacks, and interchangeable landing-page aesthetics.
- Maintain the editorial-futurist direction with warm metallic neutrals, bold typography, and precise composition.
- Keep copy minimal and sharp.
- Favor procedural visuals and layered motion over stock-feeling asset-heavy treatments.
- The strongest signature moment should be a cohesive page-takeover sequence.

## Review Standard
- Before milestone signoff, run `svelte-check` and the production build.
- Plan for manual desktop review in current Chrome, Safari, Firefox, and Edge.
- Validate section navigation, scroll continuity, resize recalculation, initial load behavior, and the stability of the signature takeover sequence.
- If the output feels generic, correct the design and motion direction before considering the milestone complete.
