import { useTheme } from './hooks/useTheme'
import { Scene } from './components/Scene'
import { Topbar } from './components/Topbar'
import { Hero } from './components/Hero'
import { FeaturesSection } from './components/FeaturesSection'
import { RecipeSection } from './components/RecipeSection'
import { NotesSection } from './components/NotesSection'
import { Footer } from './components/Footer'

export function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="page-shell">
      <Scene />
      <Topbar theme={theme} onToggle={toggleTheme} />
      <main id="app">
        <Hero />
        <FeaturesSection />
        <RecipeSection />
        <NotesSection />
      </main>
      <Footer />
    </div>
  )
}
