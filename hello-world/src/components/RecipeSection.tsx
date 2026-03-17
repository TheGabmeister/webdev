export function RecipeSection() {
  return (
    <section id="recipe" className="section">
      <div className="section-head">
        <p className="eyebrow">Build recipe</p>
        <h2>A beginner path from plain HTML to a stylish landing page.</h2>
      </div>

      <div className="recipe-grid">
        <article className="recipe-card">
          <h3>Start with content</h3>
          <ol className="steps">
            <li>Write a headline that sets the vibe.</li>
            <li>Add one short paragraph that explains the page.</li>
            <li>Place two clear action buttons under it.</li>
            <li>Use cards to break supporting ideas into chunks.</li>
          </ol>
        </article>

        <article className="recipe-card highlight">
          <h3>Then add visual seasoning</h3>
          <ul className="checklist">
            <li>Rounded corners to soften the layout</li>
            <li>One warm accent color and one cool accent color</li>
            <li>Soft shadows so cards float off the page</li>
            <li>Slow keyframe animations for just a few shapes</li>
          </ul>
        </article>
      </div>
    </section>
  )
}
