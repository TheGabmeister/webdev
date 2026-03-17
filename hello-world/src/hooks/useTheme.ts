import { useEffect, useState } from 'react'

type ThemeName = 'sunrise' | 'night'

const storageKey = 'sunbeam-theme'
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

const readStoredTheme = (): ThemeName | null => {
  try {
    const stored = window.localStorage.getItem(storageKey)
    if (stored === 'sunrise' || stored === 'night') return stored
  } catch {
    // ignore
  }
  return null
}

const getPreferredTheme = (): ThemeName => {
  return readStoredTheme() ?? (mediaQuery.matches ? 'night' : 'sunrise')
}

export function useTheme(): { theme: ThemeName; toggleTheme: () => void } {
  const [theme, setTheme] = useState<ThemeName>(getPreferredTheme)

  useEffect(() => {
    document.documentElement.dataset['theme'] = theme
    try {
      window.localStorage.setItem(storageKey, theme)
    } catch {
      // ignore
    }
  }, [theme])

  useEffect(() => {
    const handler = (e: MediaQueryListEvent) => {
      if (readStoredTheme()) return
      setTheme(e.matches ? 'night' : 'sunrise')
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const toggleTheme = () =>
    setTheme(prev => (prev === 'night' ? 'sunrise' : 'night'))

  return { theme, toggleTheme }
}
