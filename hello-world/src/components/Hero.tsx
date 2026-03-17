export function Hero() {
  return (
    <section className="hero">
      <div>
        <p className="eyebrow">CSS-only home page experiment</p>
        <h1>Make a simple page feel alive.</h1>
        <p className="intro">
          This version stays beginner-friendly: one HTML file, no images,
          no libraries, and no heavy framework. The motion still comes from
          gradients, floating shapes, layered cards, and hover states. A
          small TypeScript layer now handles the theme switch.
        </p>

        <div className="button-row">
          <a className="button button-primary" href="#features">Tour the layout</a>
          <a className="button button-secondary" href="#recipe">Steal the recipe</a>
        </div>

        <div className="pill-row">
          <span className="pill">Animated gradients</span>
          <span className="pill">Glass cards</span>
          <span className="pill">Theme switch</span>
          <span className="pill">Hover buttons</span>
          <span className="pill">Soft floating shapes</span>
        </div>
      </div>

      <aside className="showcase">
        <div className="showcase-header">
          <div>
            <p className="showcase-label">Today's moodboard</p>
            <h2>Glow, drift, sparkle</h2>
          </div>

          <div className="spark"></div>
        </div>

        <div className="mini-card">
          <p className="mini-label">Energy meter</p>
          <div className="meter">
            <span className="meter-bar"></span>
          </div>
        </div>

        <div className="mini-card">
          <p className="mini-label">Scene ingredients</p>
          <div className="tag-list">
            <span className="tag">warm sky</span>
            <span className="tag">rounded cards</span>
            <span className="tag">gentle motion</span>
            <span className="tag">bright buttons</span>
          </div>
        </div>

        <p className="quote">
          "Good home pages feel welcoming before they feel complicated."
        </p>
      </aside>
    </section>
  )
}
