import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

/** Stitch "Theme Switch" pill — toggles the `dark` class, persists to localStorage. */
export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch {
      // storage unavailable; session-only theme
    }
  }, [dark])

  return (
    <button
      type="button"
      onClick={() => setDark((d) => !d)}
      aria-label="Toggle theme"
      className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 text-[13px] font-medium text-muted-foreground shadow-sm transition-colors hover:text-foreground"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      Theme Switch
    </button>
  )
}
