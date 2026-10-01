import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { easyUiSpring, usePrefersReducedMotion } from './motion-utils'

type AnimatedNumberProps = {
  /** Numeric source of truth. Optional when `formatted` is provided. */
  value?: number
  /** Optional pre-formatted string. When provided, replaces value-based formatting. */
  formatted?: string
  /** Optional aria-label override (defaults to the formatted value). */
  ariaLabel?: string
  /** Optional extra classes for the inline wrapper. */
  className?: string
  /** Optional fixed width to reserve for the value, expressed in CSS units. */
  minWidth?: string
}

/**
 * AnimatedNumber morphs between numeric values with a quick vertical swap.
 * The final rendered DOM is a single text node so screen readers and the
 * host's `getByText` assertions continue to find the value.
 */
export function AnimatedNumber({
  value,
  formatted,
  ariaLabel,
  className,
  minWidth,
}: AnimatedNumberProps) {
  const reducedMotion = usePrefersReducedMotion()
  const previousValue = useRef<number | string>(formatted ?? value ?? 0)
  const initialText = formatted ?? (value !== undefined ? String(value) : '')
  const [display, setDisplay] = useState<{ token: string; text: string }>({
    token: 'initial',
    text: initialText,
  })

  useEffect(() => {
    const nextText = formatted ?? (value !== undefined ? String(value) : '')
    const previousText =
      typeof previousValue.current === 'number'
        ? String(previousValue.current)
        : previousValue.current
    if (nextText === previousText) return
    const token = `${value ?? 'fmt'}-${nextText}`
    previousValue.current = formatted ? nextText : (value ?? 0)
    setDisplay({ token, text: nextText })
  }, [formatted, value])

  const wrapperStyle: React.CSSProperties = {}
  if (minWidth) wrapperStyle.minWidth = minWidth

  return (
    <span
      aria-label={ariaLabel ?? display.text}
      className={`easyui-animated-number${className ? ` ${className}` : ''}`}
      style={wrapperStyle}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ opacity: 1, y: 0 }}
          className="easyui-animated-number__value"
          exit={{ opacity: 0, y: reducedMotion ? 0 : -6 }}
          initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }}
          key={display.token}
          transition={reducedMotion ? { duration: 0 } : easyUiSpring}
        >
          {display.text as ReactNode}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}