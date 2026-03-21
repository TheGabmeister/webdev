<script lang="ts">
  import type { SectionConfig, SectionMetric } from '../types'

  export let sections: SectionConfig[] = []
  export let metrics: Record<string, SectionMetric> = {}
  export let activeSectionId = ''
  export let globalProgress = 0
  export let scrollToSection: (id: string) => void

  const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))
</script>

<aside class="progress-nav" aria-label="Section navigation">
  <div class="progress-shell">
    <div class="progress-copy">
      <span class="progress-label">Narrative</span>
      <span class="progress-value">{Math.round(globalProgress * 100)}%</span>
    </div>

    <div class="progress-track" aria-hidden="true">
      <span class="progress-fill" style={`transform: scaleY(${clamp(globalProgress, 0, 1)})`}></span>
    </div>
  </div>

  <div class="section-list">
    {#each sections as section, index}
      {@const metric = metrics[section.id]}
      {@const progress = metric ? clamp(metric.viewportProgress, 0, 1) : 0}

      <button
        type="button"
        class:active={section.id === activeSectionId}
        class="section-link"
        onclick={() => scrollToSection(section.id)}
        aria-current={section.id === activeSectionId ? 'true' : undefined}
      >
        <span class="section-index">{String(index + 1).padStart(2, '0')}</span>
        <span class="section-meta">
          <span class="section-label">{section.label}</span>
          <span class="section-progress">
            <span class="section-progress-fill" style={`transform: scaleX(${progress})`}></span>
          </span>
        </span>
      </button>
    {/each}
  </div>
</aside>

<style>
  .progress-nav {
    position: fixed;
    top: 2.4rem;
    right: 2.4rem;
    z-index: 30;
    display: grid;
    gap: 1.1rem;
    width: min(15rem, 22vw);
  }

  .progress-shell {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.8rem;
    align-items: center;
    padding: 0.95rem 1rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 1.4rem;
    background:
      linear-gradient(180deg, rgba(18, 16, 19, 0.8), rgba(10, 9, 11, 0.62)),
      rgba(10, 9, 11, 0.4);
    backdrop-filter: blur(18px);
    box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, 0.24);
  }

  .progress-copy {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.62rem;
    color: rgba(240, 228, 215, 0.78);
  }

  .progress-value {
    font-size: 0.72rem;
    color: rgba(255, 244, 230, 0.92);
  }

  .progress-track {
    position: relative;
    width: 0.32rem;
    height: 3.6rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
    justify-self: end;
    transform-origin: bottom center;
  }

  .progress-fill {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(246, 221, 193, 0.95), rgba(185, 151, 116, 0.55));
    transform-origin: bottom center;
  }

  .section-list {
    display: grid;
    gap: 0.55rem;
  }

  .section-link {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.85rem;
    align-items: center;
    width: 100%;
    padding: 0.8rem 0.9rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 1.2rem;
    background:
      linear-gradient(180deg, rgba(25, 21, 23, 0.56), rgba(10, 9, 11, 0.34)),
      rgba(8, 8, 10, 0.35);
    color: inherit;
    cursor: pointer;
    transition:
      transform 160ms ease,
      border-color 160ms ease,
      background 160ms ease;
  }

  .section-link:hover,
  .section-link.active {
    transform: translateX(-0.2rem);
    border-color: rgba(246, 221, 193, 0.3);
    background:
      linear-gradient(180deg, rgba(36, 30, 31, 0.84), rgba(12, 11, 13, 0.5)),
      rgba(8, 8, 10, 0.38);
  }

  .section-index {
    font-size: 0.64rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(233, 214, 194, 0.72);
  }

  .section-meta {
    display: grid;
    gap: 0.38rem;
    min-width: 0;
  }

  .section-label {
    font-size: 0.78rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(255, 247, 237, 0.88);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .section-progress {
    position: relative;
    height: 0.18rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }

  .section-progress-fill {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(246, 221, 193, 0.88), rgba(214, 184, 154, 0.3));
    transform-origin: left center;
  }

  @media (max-width: 1180px) {
    .progress-nav {
      width: min(12rem, 25vw);
      right: 1.5rem;
    }
  }
</style>
