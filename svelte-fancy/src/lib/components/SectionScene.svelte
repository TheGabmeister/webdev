<script lang="ts">
  import type { PointerState, SectionConfig, SectionMetric } from '../types'

  export let section: SectionConfig
  export let metric: SectionMetric
  export let pointer: PointerState
  export let activeSectionId = ''
  export let scrollToSection: (id: string) => void

  const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

  $: progress = clamp(metric?.progress ?? 0)
  $: viewportProgress = clamp(metric?.viewportProgress ?? 0)
  $: visibility = clamp(metric?.visibility ?? 0)
  $: heroLift = (0.5 - progress) * 7
  $: takeoverWave = Math.sin(progress * Math.PI)
  $: proofX = (pointer.x - 0.5) * 100
  $: proofY = (pointer.y - 0.5) * 78
  $: proofPower = pointer.active ? 1 : 0.4
  $: systemsReveal = clamp(viewportProgress * 1.2)
</script>

<div class="frame" data-scene={section.scene}>
  {#if section.scene === 'hero'}
    <div class="copy-panel hero-copy" style={`transform: translateY(${heroLift}vh)`}>
      <p class="eyebrow">{section.eyebrow}</p>
      <h1>{section.title}</h1>
      <p class="body">{section.body}</p>

      {#if section.chips}
        <div class="chip-row" aria-label="Launch tags">
          {#each section.chips as chip}
            <span>{chip}</span>
          {/each}
        </div>
      {/if}
    </div>

    <div class="hero-stage" style={`--progress:${progress}; --viewport:${viewportProgress}`}>
      <div class="hero-plinth hero-plinth-a"></div>
      <div class="hero-plinth hero-plinth-b"></div>
      <div class="hero-plinth hero-plinth-c"></div>

      <svg class="hero-grid" viewBox="0 0 800 560" aria-hidden="true">
        <defs>
          <radialGradient id="heroCore" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stop-color="rgba(246,221,193,0.9)" />
            <stop offset="60%" stop-color="rgba(214,184,154,0.18)" />
            <stop offset="100%" stop-color="rgba(214,184,154,0)" />
          </radialGradient>
        </defs>
        <rect x="14" y="14" width="772" height="532" rx="28" />
        <circle cx="400" cy="280" r="178" />
        <circle cx="400" cy="280" r="120" />
        <path d="M180 280H620" />
        <path d="M400 76V484" />
        <path d="M244 142L556 418" />
        <path d="M556 142L244 418" />
        <circle cx="400" cy="280" r="88" fill="url(#heroCore)" stroke="none" />
      </svg>

      <div class="hero-band">
        <div>
          <span class="band-label">Phase</span>
          <strong>Authoring</strong>
        </div>
        <div>
          <span class="band-label">Vector</span>
          <strong>Thermal / precise</strong>
        </div>
        <div>
          <span class="band-label">Output</span>
          <strong>Desktop signal</strong>
        </div>
      </div>
    </div>
  {/if}

  {#if section.scene === 'thesis'}
    <div class="copy-panel compact">
      <p class="eyebrow">{section.eyebrow}</p>
      <h2>{section.title}</h2>
      <p class="body">{section.body}</p>
    </div>

    <div class="thesis-grid">
      <div class="stat-grid">
        {#each section.stats ?? [] as stat}
          <article class="stat-card" style={`transform: translateY(${(1 - visibility) * 2.5}rem)`}>
            <span class="stat-label">{stat.label}</span>
            <strong>{stat.value}</strong>
            <p>{stat.note}</p>
          </article>
        {/each}
      </div>

      <div class="thesis-diagram">
        <div class="diagram-raster"></div>
        {#each section.details ?? [] as detail}
          <article class="detail-row">
            <span>{detail.meta}</span>
            <h3>{detail.title}</h3>
            <p>{detail.body}</p>
          </article>
        {/each}
      </div>
    </div>
  {/if}

  {#if section.scene === 'takeover'}
    <div class="takeover-shell">
      <div class="copy-panel compact takeover-copy">
        <p class="eyebrow">{section.eyebrow}</p>
        <h2>{section.title}</h2>
        <p class="body">{section.body}</p>
        {#if section.chips}
          <div class="chip-row">
            {#each section.chips as chip}
              <span>{chip}</span>
            {/each}
          </div>
        {/if}
      </div>

      <div class="takeover-stage" style={`--wave:${takeoverWave}; --progress:${progress}`}>
        <div class="takeover-frame">
          <div class="takeover-ring outer"></div>
          <div class="takeover-ring mid"></div>
          <div class="takeover-ring inner"></div>
          <div class="takeover-axis axis-h"></div>
          <div class="takeover-axis axis-v"></div>
          <div class="takeover-wording">
            <span>Page</span>
            <span>Field</span>
            <span>One machine</span>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if section.scene === 'proof'}
    <div class="copy-panel compact">
      <p class="eyebrow">{section.eyebrow}</p>
      <h2>{section.title}</h2>
      <p class="body">{section.body}</p>
    </div>

    <div class="proof-grid">
      <div class="proof-console">
        <div class="console-topline">
          <span>Steering window</span>
          <span>{pointer.active ? 'Tracking live input' : 'Awaiting cursor'}</span>
        </div>

        <div class="proof-field" style={`--x:${proofX}px; --y:${proofY}px; --power:${proofPower}`}>
          <div class="proof-core"></div>
          <div class="proof-reticle"></div>
          <div class="proof-wave proof-wave-a"></div>
          <div class="proof-wave proof-wave-b"></div>
          <div class="proof-wave proof-wave-c"></div>
          <div class="proof-gridline proof-gridline-h"></div>
          <div class="proof-gridline proof-gridline-v"></div>
        </div>
      </div>

      <div class="proof-details">
        {#each section.details ?? [] as detail}
          <article class="proof-card">
            <span>{detail.meta}</span>
            <h3>{detail.title}</h3>
            <p>{detail.body}</p>
          </article>
        {/each}
      </div>
    </div>
  {/if}

  {#if section.scene === 'systems'}
    <div class="copy-panel compact">
      <p class="eyebrow">{section.eyebrow}</p>
      <h2>{section.title}</h2>
      <p class="body">{section.body}</p>
    </div>

    <div class="systems-grid">
      <div class="systems-stack">
        {#each section.details ?? [] as detail, index}
          <article
            class="systems-card"
            style={`transform: translate3d(0, ${(1 - systemsReveal) * (index + 1) * 1.25}rem, 0)`}
          >
            <span>{detail.meta}</span>
            <h3>{detail.title}</h3>
            <p>{detail.body}</p>
          </article>
        {/each}
      </div>

      <div class="vault-view">
        <div class="vault-grid"></div>
        <div class="vault-column vault-column-a"></div>
        <div class="vault-column vault-column-b"></div>
        <div class="vault-column vault-column-c"></div>
        <div class="vault-rim"></div>
        <div class="vault-rim vault-rim-inner"></div>
      </div>
    </div>
  {/if}

  {#if section.scene === 'cta'}
    <div class="cta-shell">
      <div class="copy-panel cta-copy">
        <p class="eyebrow">{section.eyebrow}</p>
        <h2>{section.title}</h2>
        <p class="body">{section.body}</p>
      </div>

      <div class="cta-panel">
        <span class="cta-state">Current focus / {activeSectionId}</span>
        <div class="cta-actions">
          <button type="button" class="primary" onclick={() => scrollToSection('proof')}>
            {section.cta?.primary}
          </button>
          <button type="button" class="secondary" onclick={() => scrollToSection('hero')}>
            {section.cta?.secondary}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .frame {
    position: relative;
    display: grid;
    gap: clamp(2rem, 5vw, 4.5rem);
    align-content: center;
    max-width: 92rem;
    margin: 0 auto;
    min-height: inherit;
    padding: clamp(5rem, 7vw, 7rem) 0;
  }

  .copy-panel {
    position: relative;
    z-index: 2;
    max-width: 40rem;
    display: grid;
    gap: 1.15rem;
  }

  .copy-panel.compact {
    max-width: 34rem;
  }

  .copy-panel h1,
  .copy-panel h2 {
    margin: 0;
    font-family: 'Manrope', sans-serif;
    font-size: clamp(3.8rem, 7vw, 7.6rem);
    line-height: 0.92;
    letter-spacing: -0.05em;
    text-transform: uppercase;
    color: rgba(255, 248, 241, 0.96);
  }

  .copy-panel h2 {
    font-size: clamp(2.8rem, 5vw, 5.6rem);
  }

  .eyebrow {
    margin: 0;
    font-size: 0.72rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(234, 217, 198, 0.78);
  }

  .body {
    margin: 0;
    max-width: 34rem;
    font-size: 1.04rem;
    line-height: 1.65;
    color: rgba(232, 223, 212, 0.78);
  }

  .chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
  }

  .chip-row span {
    padding: 0.5rem 0.85rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    font-size: 0.7rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(248, 239, 226, 0.76);
    background: rgba(255, 255, 255, 0.04);
  }

  .hero-stage {
    position: relative;
    min-height: min(46rem, 68vh);
    border-radius: 2.2rem;
    overflow: hidden;
    background:
      linear-gradient(140deg, rgba(26, 22, 24, 0.95), rgba(10, 9, 11, 0.72)),
      radial-gradient(circle at 50% 50%, rgba(246, 221, 193, 0.16), rgba(246, 221, 193, 0));
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 2rem 5rem rgba(0, 0, 0, 0.3);
  }

  .hero-grid {
    position: absolute;
    inset: 8%;
    width: 84%;
    height: 84%;
    fill: none;
    stroke: rgba(255, 255, 255, 0.16);
    stroke-width: 1.5;
    transform: scale(calc(0.94 + var(--progress) * 0.16));
    transition: transform 200ms ease;
  }

  .hero-plinth {
    position: absolute;
    border-radius: 999px;
    filter: blur(0.1rem);
    opacity: 0.72;
  }

  .hero-plinth-a {
    inset: 12% auto auto 10%;
    width: 16rem;
    height: 16rem;
    background: radial-gradient(circle, rgba(246, 221, 193, 0.24), rgba(246, 221, 193, 0));
  }

  .hero-plinth-b {
    right: 12%;
    top: 20%;
    width: 18rem;
    height: 18rem;
    background: radial-gradient(circle, rgba(185, 151, 116, 0.22), rgba(185, 151, 116, 0));
  }

  .hero-plinth-c {
    left: 28%;
    bottom: 8%;
    width: 22rem;
    height: 10rem;
    background: radial-gradient(circle, rgba(214, 184, 154, 0.18), rgba(214, 184, 154, 0));
  }

  .hero-band {
    position: absolute;
    left: 1.4rem;
    right: 1.4rem;
    bottom: 1.4rem;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.8rem;
  }

  .hero-band div {
    display: grid;
    gap: 0.18rem;
    padding: 0.9rem 1rem;
    border-radius: 1.2rem;
    background: rgba(9, 9, 11, 0.42);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .band-label,
  .stat-label,
  .detail-row span,
  .proof-card span,
  .systems-card span,
  .cta-state,
  .console-topline {
    font-size: 0.68rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(232, 214, 194, 0.66);
  }

  .hero-band strong,
  .stat-card strong {
    font-size: 1.05rem;
    font-weight: 700;
    color: rgba(255, 247, 237, 0.92);
  }

  .thesis-grid,
  .proof-grid,
  .systems-grid {
    display: grid;
    gap: clamp(1.2rem, 2vw, 1.8rem);
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
    align-items: stretch;
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }

  .stat-card,
  .detail-row,
  .proof-card,
  .systems-card,
  .cta-panel,
  .proof-console {
    position: relative;
    overflow: hidden;
    border-radius: 1.6rem;
    border: 1px solid rgba(255, 255, 255, 0.09);
    background:
      linear-gradient(180deg, rgba(26, 21, 24, 0.74), rgba(10, 9, 11, 0.52)),
      rgba(11, 10, 12, 0.4);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 1.5rem 4rem rgba(0, 0, 0, 0.16);
  }

  .stat-card {
    padding: 1.25rem;
    display: grid;
    align-content: start;
    gap: 0.6rem;
    min-height: 16rem;
  }

  .stat-card p,
  .detail-row p,
  .proof-card p,
  .systems-card p {
    margin: 0;
    font-size: 0.96rem;
    line-height: 1.6;
    color: rgba(232, 223, 212, 0.72);
  }

  .thesis-diagram {
    position: relative;
    display: grid;
    gap: 1rem;
    padding: 1.25rem;
    border-radius: 1.9rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: linear-gradient(180deg, rgba(14, 13, 15, 0.6), rgba(8, 8, 10, 0.38));
    overflow: hidden;
  }

  .diagram-raster {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
    background-size: 100% 3.25rem, 3.25rem 100%;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.9), transparent 90%);
    opacity: 0.28;
  }

  .detail-row {
    padding: 1rem 1.15rem;
    margin-top: auto;
  }

  .detail-row h3,
  .proof-card h3,
  .systems-card h3 {
    margin: 0.38rem 0 0.45rem;
    font-size: 1.25rem;
    line-height: 1.15;
    color: rgba(255, 247, 237, 0.94);
  }

  .takeover-shell {
    display: grid;
    gap: 2rem;
  }

  .takeover-copy {
    max-width: 39rem;
  }

  .takeover-stage {
    position: sticky;
    top: 12vh;
    min-height: 72vh;
    display: grid;
    place-items: center;
  }

  .takeover-frame {
    position: relative;
    width: min(100%, 64rem);
    aspect-ratio: 1.24 / 1;
    border-radius: 2.8rem;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background:
      radial-gradient(circle at 50% 50%, rgba(246, 221, 193, calc(0.1 + var(--wave) * 0.28)), transparent 42%),
      linear-gradient(180deg, rgba(27, 24, 26, 0.86), rgba(6, 6, 8, 0.56));
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04), 0 3rem 6rem rgba(0, 0, 0, 0.24);
    transform: scale(calc(0.86 + var(--progress) * 0.18));
  }

  .takeover-ring,
  .vault-rim {
    position: absolute;
    inset: 50%;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.12);
    transform: translate(-50%, -50%);
  }

  .takeover-ring.outer {
    width: 82%;
    height: 82%;
  }

  .takeover-ring.mid {
    width: 58%;
    height: 58%;
  }

  .takeover-ring.inner {
    width: 32%;
    height: 32%;
    background: radial-gradient(circle, rgba(246, 221, 193, 0.24), rgba(246, 221, 193, 0));
  }

  .takeover-axis {
    position: absolute;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.18), transparent);
  }

  .axis-h {
    inset: 50% 10% auto;
    height: 1px;
  }

  .axis-v {
    inset: 10% auto 10% 50%;
    width: 1px;
    background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.18), transparent);
  }

  .takeover-wording {
    position: absolute;
    inset: auto 8% 8%;
    display: flex;
    justify-content: space-between;
    gap: 0.8rem;
    font-size: 0.75rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(239, 226, 212, 0.72);
  }

  .proof-console {
    padding: 1rem;
    display: grid;
    gap: 0.9rem;
  }

  .console-topline {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  .proof-field {
    position: relative;
    min-height: 28rem;
    border-radius: 1.4rem;
    overflow: hidden;
    background:
      radial-gradient(circle at calc(50% + var(--x)) calc(50% + var(--y)), rgba(246, 221, 193, 0.22), transparent 18rem),
      linear-gradient(180deg, rgba(18, 17, 19, 0.92), rgba(8, 8, 10, 0.8));
  }

  .proof-core,
  .proof-reticle,
  .proof-wave {
    position: absolute;
    inset: 50%;
    border-radius: 50%;
    transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y)));
  }

  .proof-core {
    width: 7rem;
    height: 7rem;
    background: radial-gradient(circle, rgba(246, 221, 193, 0.88), rgba(214, 184, 154, 0.08) 68%, transparent 70%);
    filter: blur(calc(0.04rem + (1 - var(--power)) * 0.15rem));
  }

  .proof-reticle {
    width: 11rem;
    height: 11rem;
    border: 1px solid rgba(255, 255, 255, 0.18);
  }

  .proof-wave {
    border: 1px solid rgba(255, 255, 255, 0.08);
    opacity: 0.7;
  }

  .proof-wave-a {
    width: 18rem;
    height: 18rem;
  }

  .proof-wave-b {
    width: 26rem;
    height: 26rem;
  }

  .proof-wave-c {
    width: 34rem;
    height: 34rem;
  }

  .proof-gridline {
    position: absolute;
    background: rgba(255, 255, 255, 0.08);
  }

  .proof-gridline-h {
    left: 8%;
    right: 8%;
    top: calc(50% + var(--y));
    height: 1px;
  }

  .proof-gridline-v {
    top: 8%;
    bottom: 8%;
    left: calc(50% + var(--x));
    width: 1px;
  }

  .proof-details {
    display: grid;
    gap: 1rem;
  }

  .proof-card,
  .systems-card {
    padding: 1.15rem 1.2rem 1.25rem;
  }

  .systems-stack {
    display: grid;
    gap: 1rem;
  }

  .vault-view {
    position: relative;
    min-height: 36rem;
    border-radius: 2rem;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.09);
    background:
      radial-gradient(circle at 50% 50%, rgba(246, 221, 193, 0.14), transparent 42%),
      linear-gradient(180deg, rgba(18, 15, 17, 0.9), rgba(8, 8, 10, 0.6));
  }

  .vault-grid {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
    background-size: 100% 4rem, 4rem 100%;
    mask-image: radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.86), transparent 85%);
  }

  .vault-column {
    position: absolute;
    bottom: 12%;
    width: 18%;
    border-radius: 999px 999px 1.2rem 1.2rem;
    background: linear-gradient(180deg, rgba(246, 221, 193, 0.24), rgba(185, 151, 116, 0.04));
    border: 1px solid rgba(255, 255, 255, 0.08);
    transform: perspective(48rem) rotateX(56deg);
  }

  .vault-column-a {
    left: 12%;
    height: 32%;
  }

  .vault-column-b {
    left: 40%;
    height: 48%;
  }

  .vault-column-c {
    right: 12%;
    height: 39%;
  }

  .vault-rim {
    width: 70%;
    height: 70%;
    top: 50%;
    left: 50%;
  }

  .vault-rim-inner {
    width: 42%;
    height: 42%;
    border-color: rgba(246, 221, 193, 0.18);
  }

  .cta-shell {
    display: grid;
    gap: clamp(1.4rem, 2vw, 2rem);
    align-items: end;
    grid-template-columns: minmax(0, 1fr) minmax(16rem, 24rem);
  }

  .cta-copy {
    max-width: 38rem;
  }

  .cta-panel {
    padding: 1.25rem;
    display: grid;
    gap: 1rem;
    align-self: stretch;
  }

  .cta-actions {
    display: flex;
    gap: 0.8rem;
    flex-wrap: wrap;
  }

  .cta-actions button {
    padding: 0.95rem 1.2rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 0.78rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      transform 160ms ease,
      border-color 160ms ease,
      background 160ms ease;
  }

  .cta-actions button:hover {
    transform: translateY(-0.15rem);
    border-color: rgba(246, 221, 193, 0.34);
  }

  .cta-actions .primary {
    background: linear-gradient(180deg, rgba(246, 221, 193, 0.94), rgba(214, 184, 154, 0.76));
    color: #120f11;
  }

  .cta-actions .secondary {
    background: rgba(255, 255, 255, 0.04);
    color: rgba(250, 241, 230, 0.92);
  }

  @media (max-width: 1180px) {
    .thesis-grid,
    .proof-grid,
    .systems-grid,
    .cta-shell {
      grid-template-columns: 1fr;
    }

    .stat-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
