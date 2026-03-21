<script lang="ts">
  import { onMount, tick } from 'svelte'
  import ProgressNav from './lib/components/ProgressNav.svelte'
  import SectionScene from './lib/components/SectionScene.svelte'
  import { sections } from './lib/content/sections'
  import type { PointerState, SectionMetric } from './lib/types'

  const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

  const fallbackMetric: SectionMetric = {
    start: 0,
    end: 1,
    height: 1,
    progress: 0,
    viewportProgress: 0,
    visibility: 0,
    distance: 0,
    active: false
  }

  let sectionElements: HTMLElement[] = []
  let sectionLayouts = sections.map(() => ({ start: 0, end: 1, height: 1 }))
  let sectionMetrics: Record<string, SectionMetric> = Object.fromEntries(
    sections.map((section) => [section.id, fallbackMetric])
  )
  let activeSectionId = sections[0].id
  let activeSectionIndex = 0
  let globalProgress = 0
  let viewportWidth = 1
  let viewportHeight = 1
  let pointer: PointerState = { x: 0.5, y: 0.5, active: false }

  let frame = 0
  let needsMeasure = true

  function scheduleUpdate(measure = false) {
    needsMeasure = needsMeasure || measure

    if (frame) {
      return
    }

    frame = requestAnimationFrame(() => {
      frame = 0

      if (needsMeasure) {
        measureSections()
      }

      updateMetrics()
    })
  }

  function measureSections() {
    sectionLayouts = sections.map((_, index) => {
      const node = sectionElements[index]

      if (!node) {
        return { start: 0, end: 1, height: 1 }
      }

      const rect = node.getBoundingClientRect()
      const start = rect.top + window.scrollY
      const height = Math.max(rect.height, 1)

      return {
        start,
        end: start + height,
        height
      }
    })

    needsMeasure = false
  }

  function updateMetrics() {
    const scrollTop = window.scrollY
    const scrollBottom = scrollTop + viewportHeight
    const scrollCenter = scrollTop + viewportHeight * 0.5
    let nextActiveId = sections[0].id
    let nextActiveIndex = 0
    let closestDistance = Number.POSITIVE_INFINITY

    sectionMetrics = Object.fromEntries(
      sections.map((section, index) => {
        const layout = sectionLayouts[index]
        const visiblePixels = Math.max(
          0,
          Math.min(layout.end, scrollBottom) - Math.max(layout.start, scrollTop)
        )
        const visibility = clamp(visiblePixels / Math.min(layout.height, viewportHeight))
        const progress = clamp((scrollCenter - layout.start) / layout.height)
        const viewportProgress = clamp(
          (scrollBottom - layout.start) / (layout.height + viewportHeight)
        )
        const sectionCenter = layout.start + layout.height * 0.5
        const distance = Math.abs(scrollCenter - sectionCenter)
        const active = scrollCenter >= layout.start && scrollCenter < layout.end

        if (distance < closestDistance) {
          closestDistance = distance
          nextActiveId = section.id
          nextActiveIndex = index
        }

        return [
          section.id,
          {
            start: layout.start,
            end: layout.end,
            height: layout.height,
            progress,
            viewportProgress,
            visibility,
            distance,
            active
          } satisfies SectionMetric
        ]
      })
    )

    activeSectionId = nextActiveId
    activeSectionIndex = nextActiveIndex

    const documentHeight = Math.max(document.documentElement.scrollHeight - viewportHeight, 1)
    globalProgress = clamp(scrollTop / documentHeight)
  }

  function scrollToSection(id: string) {
    const index = sections.findIndex((section) => section.id === id)
    sectionElements[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handlePointerMove(event: PointerEvent) {
    pointer = {
      x: clamp(event.clientX / viewportWidth),
      y: clamp(event.clientY / viewportHeight),
      active: true
    }
  }

  function handlePointerLeave() {
    pointer = {
      x: 0.5,
      y: 0.5,
      active: false
    }
  }

  $: takeoverMetric = sectionMetrics.takeover ?? fallbackMetric
  $: takeoverStrength = clamp(Math.sin(takeoverMetric.viewportProgress * Math.PI) * 1.15)
  $: takeoverScale = 0.78 + takeoverMetric.progress * 0.42
  $: takeoverRotation = (takeoverMetric.progress - 0.5) * 16

  onMount(() => {
    let resizeObserver: ResizeObserver | undefined

    const handleScroll = () => scheduleUpdate()
    const handleResize = () => {
      viewportWidth = window.innerWidth
      viewportHeight = window.innerHeight
      scheduleUpdate(true)
    }

    const setup = async () => {
      await tick()
      viewportWidth = window.innerWidth
      viewportHeight = window.innerHeight

      resizeObserver = new ResizeObserver(() => scheduleUpdate(true))

      for (const element of sectionElements) {
        if (element) {
          resizeObserver.observe(element)
        }
      }

      scheduleUpdate(true)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)

    setup()

    return () => {
      if (frame) {
        cancelAnimationFrame(frame)
      }

      resizeObserver?.disconnect()
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  })
</script>

<svelte:head>
  <title>Aurelia Field</title>
  <meta
    name="description"
    content="Editorial-futurist Svelte showcase with scroll-led motion, a page takeover sequence, and a controlled interactive proof scene."
  />
</svelte:head>

<div
  class="page-shell"
  style={`--takeover:${takeoverStrength}; --takeover-scale:${takeoverScale}; --takeover-rotation:${takeoverRotation}deg; --active-index:${activeSectionIndex};`}
>
  <div class="ambient ambient-a" aria-hidden="true"></div>
  <div class="ambient ambient-b" aria-hidden="true"></div>
  <div class="noise-plane" aria-hidden="true"></div>

  <div class="takeover-overlay" aria-hidden="true">
    <div class="overlay-ring overlay-ring-a"></div>
    <div class="overlay-ring overlay-ring-b"></div>
    <div class="overlay-axis overlay-axis-h"></div>
    <div class="overlay-axis overlay-axis-v"></div>
    <div class="overlay-core"></div>
  </div>

  <header class="masthead">
    <button type="button" class="brand" onclick={() => scrollToSection('hero')}>
      Aurelia Field
    </button>
    <div class="masthead-meta">
      <span>Desktop motion study</span>
      <span>{sections[activeSectionIndex]?.label}</span>
    </div>
  </header>

  <ProgressNav
    {sections}
    metrics={sectionMetrics}
    {activeSectionId}
    {globalProgress}
    {scrollToSection}
  />

  <main class="story" onpointermove={handlePointerMove} onpointerleave={handlePointerLeave}>
    {#each sections as section, index}
      <section
        id={section.id}
        class:active={section.id === activeSectionId}
        class={`story-section scene-${section.scene}`}
        style={`min-height:${section.heightVh}vh; --section-accent:${section.accent};`}
        bind:this={sectionElements[index]}
      >
        <SectionScene
          {section}
          metric={sectionMetrics[section.id] ?? fallbackMetric}
          {pointer}
          {activeSectionId}
          {scrollToSection}
        />
      </section>
    {/each}
  </main>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&display=swap');

  :global(html) {
    scroll-behavior: auto;
    background: #09080a;
  }

  :global(body) {
    margin: 0;
    min-width: 1180px;
    background:
      radial-gradient(circle at top, rgba(44, 32, 24, 0.44), transparent 32rem),
      linear-gradient(180deg, #0e0c0f, #09080a 22%, #0d0a0d 74%, #09080a);
    color: #f7eee6;
    font-family: 'Manrope', sans-serif;
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(button),
  :global(input),
  :global(textarea) {
    font: inherit;
  }

  .page-shell {
    position: relative;
    overflow-x: clip;
    isolation: isolate;
  }

  .ambient,
  .noise-plane,
  .takeover-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
  }

  .ambient {
    z-index: -3;
    filter: blur(3rem);
    opacity: 0.5;
  }

  .ambient-a {
    left: -12vw;
    top: 8vh;
    width: 36vw;
    height: 36vw;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(214, 184, 154, 0.22), transparent 68%);
  }

  .ambient-b {
    right: -10vw;
    top: 46vh;
    width: 30vw;
    height: 30vw;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(185, 151, 116, 0.16), transparent 72%);
  }

  .noise-plane {
    z-index: -2;
    opacity: 0.32;
    background:
      linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 100% 4.25rem, 4.25rem 100%;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.6), transparent 100%);
  }

  .takeover-overlay {
    z-index: -1;
    opacity: calc(var(--takeover) * 0.95);
    transform: scale(var(--takeover-scale)) rotate(var(--takeover-rotation));
    transition:
      opacity 220ms ease,
      transform 220ms ease;
  }

  .overlay-ring,
  .overlay-core {
    position: absolute;
    inset: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
  }

  .overlay-ring-a {
    width: min(80vw, 66rem);
    height: min(80vw, 66rem);
    border: 1px solid rgba(246, 221, 193, 0.16);
  }

  .overlay-ring-b {
    width: min(48vw, 40rem);
    height: min(48vw, 40rem);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .overlay-core {
    width: min(20vw, 16rem);
    height: min(20vw, 16rem);
    background: radial-gradient(circle, rgba(246, 221, 193, 0.18), rgba(246, 221, 193, 0));
  }

  .overlay-axis {
    position: absolute;
    background: rgba(255, 255, 255, 0.08);
  }

  .overlay-axis-h {
    left: 14vw;
    right: 14vw;
    top: 50%;
    height: 1px;
  }

  .overlay-axis-v {
    top: 12vh;
    bottom: 12vh;
    left: 50%;
    width: 1px;
  }

  .masthead {
    position: fixed;
    top: 2rem;
    left: 2.5rem;
    z-index: 24;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .brand {
    padding: 0;
    border: 0;
    background: transparent;
    color: rgba(252, 244, 236, 0.96);
    font-size: 1rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
  }

  .masthead-meta {
    display: flex;
    gap: 0.8rem;
    align-items: center;
    padding: 0.55rem 0.85rem;
    border-radius: 999px;
    background: rgba(13, 12, 15, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(16px);
    font-size: 0.68rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(231, 217, 201, 0.72);
  }

  .story {
    position: relative;
    z-index: 1;
  }

  .story-section {
    position: relative;
    padding: 0 6vw;
  }

  .story-section::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 50% 18%, color-mix(in srgb, var(--section-accent) 14%, transparent), transparent 38%),
      linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.04) 42%, transparent 100%);
    opacity: 0.7;
    pointer-events: none;
  }

  .story-section.active::before {
    opacity: 1;
  }

  :global(::selection) {
    background: rgba(246, 221, 193, 0.24);
    color: #fff7ef;
  }
</style>
