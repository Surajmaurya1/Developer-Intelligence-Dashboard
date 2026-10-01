import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { easyUiSpring, usePrefersReducedMotion } from './motion-utils'

type SlidePaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  ariaLabel: string
  /** Optional extra classes for the outer navigation element. */
  className?: string
  /** Optional override for the Previous/Next button labels. */
  previousLabel?: string
  nextLabel?: string
}

const PAGE_WINDOW = 5
const BUTTON_MIN_HEIGHT_REM = 2.75
const INDICATOR_HEIGHT_REM = 2.25

/**
 * SlidePagination preserves the navigation role and button accessible names
 * the tests rely on, while replacing the static active highlight with a
 * shared-layout pill that slides between pages.
 */
export function SlidePagination({
  page,
  totalPages,
  onPageChange,
  ariaLabel,
  className,
  previousLabel = 'Previous',
  nextLabel = 'Next',
}: SlidePaginationProps) {
  const reducedMotion = usePrefersReducedMotion()
  const navRef = useRef<HTMLElement | null>(null)
  const [indicator, setIndicator] = useState<{
    left: number
    width: number
  } | null>(null)

  const start = Math.max(
    1,
    Math.min(
      page - Math.floor(PAGE_WINDOW / 2),
      Math.max(1, totalPages - PAGE_WINDOW + 1),
    ),
  )
  const end = Math.min(totalPages, start + PAGE_WINDOW - 1)
  const pages =
    end >= start
      ? Array.from({ length: end - start + 1 }, (_, index) => start + index)
      : []

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return
    const nav = navRef.current
    if (!nav) return
    const target = nav.querySelector<HTMLElement>(
      `[data-easyui-pagination-active="true"]`,
    )
    if (!target) {
      setIndicator(null)
      return
    }
    const navRect = nav.getBoundingClientRect()
    const rect = target.getBoundingClientRect()
    setIndicator({
      left: rect.left - navRect.left + rect.width / 2,
      width: rect.width,
    })
  }, [page, totalPages, pages.length])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleResize = (): void => {
      const nav = navRef.current
      if (!nav) return
      const target = nav.querySelector<HTMLElement>(
        `[data-easyui-pagination-active="true"]`,
      )
      if (!target) return
      const navRect = nav.getBoundingClientRect()
      const rect = target.getBoundingClientRect()
      setIndicator({
        left: rect.left - navRect.left + rect.width / 2,
        width: rect.width,
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (totalPages <= 1) return null

  return (
    <nav
      aria-label={ariaLabel}
      className={`easyui-slide-pagination${className ? ` ${className}` : ''}`}
      ref={navRef}
    >
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        type="button"
      >
        {previousLabel}
      </button>
      {pages.map((pageNumber) => {
        const isActive = pageNumber === page
        return (
          <button
            aria-current={isActive ? 'page' : undefined}
            aria-label={`Page ${pageNumber}`}
            data-easyui-pagination-active={isActive ? 'true' : 'false'}
            key={pageNumber}
            onClick={() => onPageChange(pageNumber)}
            style={{
              minHeight: `${BUTTON_MIN_HEIGHT_REM}rem`,
              position: 'relative',
            }}
            type="button"
          >
            {pageNumber}
          </button>
        )
      })}
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        type="button"
      >
        {nextLabel}
      </button>

      {indicator && (
        <motion.span
          animate={{
            left: indicator.left,
            width: indicator.width,
          }}
          aria-hidden="true"
          className="easyui-slide-pagination__indicator"
          initial={false}
          style={{ height: `${INDICATOR_HEIGHT_REM}rem` }}
          transition={reducedMotion ? { duration: 0 } : easyUiSpring}
        />
      )}
    </nav>
  )
}