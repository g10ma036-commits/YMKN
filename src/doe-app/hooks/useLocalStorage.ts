import { useEffect, useRef } from 'react'
import type { DOEState } from '../types/doe'

const STORAGE_KEY = 'doe-analyst-project'

export function usePersistState(state: DOEState): void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {
        // Storage quota exceeded or unavailable
      }
    }, 300)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [state])
}

export function loadPersistedState(): DOEState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as DOEState
  } catch {
    return null
  }
}
