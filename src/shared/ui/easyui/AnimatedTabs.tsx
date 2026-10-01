import { useId, type KeyboardEvent } from 'react'
import { motion } from 'motion/react'
import { easyUiSpring, usePrefersReducedMotion } from './motion-utils'

export type AnimatedTabItem<TValue extends string> = {
  value: TValue
  label: string
}

type AnimatedTabsProps<TValue extends string> = {
  items: ReadonlyArray<AnimatedTabItem<TValue>>
  value: TValue
  onChange: (value: TValue) => void
  ariaLabel: string
  /** Optional id prefix for the underlying radio buttons. */
  idPrefix?: string
  /** Optional extra classes for the outer container. */
  className?: string
}

/**
 * AnimatedTabs renders a radiogroup with a sliding pill indicator.
 *
 * The host's tests rely on the radiogroup semantics, so this component
 * keeps the exact ARIA contract expected by the search page:
 *   • outer container has role="radiogroup"
 *   • each option is a button with role="radio", aria-checked, and a stable id
 *   • arrow keys cycle through the options and focus the next radio
 */
export function AnimatedTabs<TValue extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  idPrefix,
  className,
}: AnimatedTabsProps<TValue>) {
  const generatedId = useId()
  const prefix = idPrefix ?? generatedId.replace(/:/g, '')
  const reducedMotion = usePrefersReducedMotion()

  function focusOption(nextValue: TValue): void {
    onChange(nextValue)
    if (typeof document !== 'undefined') {
      document.getElementById(`${prefix}-${nextValue}`)?.focus()
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    const currentIndex = items.findIndex((item) => item.value === value)
    if (currentIndex < 0) return
    const nextItem =
      items[(currentIndex + direction + items.length) % items.length]
    if (nextItem) focusOption(nextItem.value)
  }

  return (
    <div
      aria-label={ariaLabel}
      className={`easyui-animated-tabs${className ? ` ${className}` : ''}`}
      onKeyDown={handleKeyDown}
      role="radiogroup"
      tabIndex={-1}
    >
      {items.map((item) => {
        const isActive = item.value === value
        return (
          <button
            aria-checked={isActive}
            className={`easyui-animated-tabs__option${
              isActive ? ' is-active' : ''
            }`}
            id={`${prefix}-${item.value}`}
            key={item.value}
            onClick={() => onChange(item.value)}
            role="radio"
            tabIndex={isActive ? 0 : -1}
            type="button"
          >
            {isActive && (
              <motion.span
                aria-hidden="true"
                className="easyui-animated-tabs__indicator"
                layoutId={`easyui-tabs-indicator-${prefix}`}
                transition={
                  reducedMotion ? { duration: 0 } : easyUiSpring
                }
              />
            )}
            <span className="easyui-animated-tabs__label">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}