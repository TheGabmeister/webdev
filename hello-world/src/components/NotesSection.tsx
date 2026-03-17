export function NotesSection() {
  return (
    <section id="notes" className="section">
      <div className="section-head">
        <p className="eyebrow">Next experiments</p>
        <h2>Easy upgrades once this version feels comfortable.</h2>
      </div>

      <div className="note-grid">
        <article className="note-card">
          <h3>Theme switch is live</h3>
          <p>
            Use the toggle in the header to swap the palette and see how a
            tiny bit of TypeScript changes the experience.
          </p>
        </article>

        <article className="note-card">
          <h3>Split styles into a CSS file</h3>
          <p>
            Move the <code>&lt;style&gt;</code> block into <code>styles.css</code> once the page grows
            past one screen.
          </p>
        </article>

        <article className="note-card">
          <h3>Bring JavaScript back later</h3>
          <p>
            Once the visuals feel good, add TypeScript for tabs, counters,
            dialogs, or more playful interactions.
          </p>
        </article>
      </div>
    </section>
  )
}
