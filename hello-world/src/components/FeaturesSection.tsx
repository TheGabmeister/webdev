export function FeaturesSection() {
  return (
    <section id="features" className="section">
      <div className="section-head">
        <p className="eyebrow">What makes it feel fancy</p>
        <h2>Three small tricks that change the mood fast.</h2>
      </div>

      <div className="card-grid">
        <article className="feature-card">
          <p className="card-number">01 / Background</p>
          <h3>Use layers instead of one flat color</h3>
          <p>
            Stack a gradient, a subtle grid, and a few blurred orbs so the
            page already has depth before you style any text.
          </p>
        </article>

        <article className="feature-card">
          <p className="card-number">02 / Layout</p>
          <h3>Give the hero a companion card</h3>
          <p>
            A second column with small panels makes the page feel like a
            product or studio site instead of a single block of text.
          </p>
        </article>

        <article className="feature-card">
          <p className="card-number">03 / Motion</p>
          <h3>Animate only a few elements</h3>
          <p>
            The orbs, spark tile, and meter move slowly. That is enough to
            create energy without making the page noisy.
          </p>
        </article>
      </div>
    </section>
  )
}
