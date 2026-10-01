import { useEffect, useState } from 'react'

/**
 * Returns true when the user has requested reduced motion at the OS level.
 * Updates live if the user toggles the preference during the session.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (event: MediaQueryListEvent): void => {
      setReduced(event.matches)
    }
    setReduced(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return reduced
}

/**
 * Spring configuration used across the easyui primitives.
 * Slightly snappier than the default but still feels physical.
 */
export const easyUiSpring = {
  type: 'spring' as const,
  stiffness: 360,
  damping: 32,
  mass: 0.9,
}

/**
 * Common color tokens so multiple primitives stay in sync with the host theme.
 * They intentionally reference CSS custom properties defined in styles.css.
 */
export const easyUiColors = {
  accent: 'rgb(var(--easyui-accent) / <alpha-value>)',
  accentSoft: 'rgb(var(--easyui-accent-soft) / <alpha-value>)',
}