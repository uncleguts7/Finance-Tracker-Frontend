import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useGaps } from '@/hooks/useGaps'
import type { Gap } from '@/lib/types'

const DISMISSED_KEY = 'gaps_banner_dismissed_session'

export function GapBanner() {
  const navigate = useNavigate()
  const { data: gapsData, isLoading, isError } = useGaps()
  const gaps = gapsData?.gaps ?? []
  const [dismissed, setDismissed] = useState(false)

  // Session-only dismiss: check sessionStorage on mount
  // (sessionStorage persists only for the browser tab session)
  useEffect(() => {
    try {
      const wasDismissed = sessionStorage.getItem(DISMISSED_KEY) === 'true'
      setDismissed(wasDismissed)
    } catch {
      // sessionStorage unavailable (e.g., private browsing, cookies blocked)
      // Treat as not dismissed
    }
  }, [])

  if (isLoading) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 animate-pulse" aria-busy="true">
        <div className="h-4 w-3/4 bg-amber-100 rounded" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4" role="alert">
        <p className="text-sm text-neutral-700 flex items-center justify-between">
          <span>Could not check for gaps.</span>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </p>
      </div>
    )
  }

  if (gaps.length === 0 || dismissed) {
    return null
  }

  const labels = gaps.map((g: Gap) => g.label).join(', ')

  function handleDismiss() {
    try {
      sessionStorage.setItem(DISMISSED_KEY, 'true')
    } catch {
      // Ignore if storage unavailable
    }
    setDismissed(true)
  }

  function handleResolve() {
    navigate('/gaps')
  }

  return (
    <section
      className="rounded-lg border border-amber-200 bg-amber-50 p-4"
      role="region"
      aria-label="Gap detection banner"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-neutral-700">
          ⚠ You have {gaps.length} untracked month{gaps.length !== 1 ? 's' : ''}: {labels}
        </p>
        <div className="flex gap-2">
          <Button onClick={handleResolve}>Resolve gaps</Button>
          <Button variant="outline" onClick={handleDismiss}>
            Dismiss for this session
          </Button>
        </div>
      </div>
    </section>
  )
}