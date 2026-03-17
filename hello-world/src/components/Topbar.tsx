type TopbarProps = {
  theme: 'sunrise' | 'night'
  onToggle: () => void
}

export function Topbar({ theme, onToggle }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">S</span>
        Sunbeam Studio
      </div>

      <div className="topbar-actions">
        <nav>
          <a className="nav-link" href="#features">Features</a>
          <a className="nav-link" href="#recipe">Recipe</a>
          <a className="nav-link" href="#notes">Notes</a>
        </nav>

        <button
          id="theme-toggle"
          className="theme-toggle"
          type="button"
          aria-pressed={theme === 'night'}
          onClick={onToggle}
        >
          {theme === 'night' ? 'Switch to day' : 'Switch to night'}
        </button>
      </div>
    </header>
  )
}
