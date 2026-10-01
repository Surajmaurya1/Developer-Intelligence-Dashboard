import { useRef, useState, type ReactNode } from 'react'
import { motion, useMotionTemplate, useMotionValue } from 'motion/react'
import { usePrefersReducedMotion } from './motion-utils'

type SpotlightCardProps = {
  children: ReactNode
  className?: string
  /** Optional inline style for the wrapper element. */
  style?: React.CSSProperties
}

/**
 * SpotlightCard adds a subtle pointer-tracking highlight on top of an existing
 * card surface. It preserves the semantics of the children it wraps so it can
 * be applied to existing articles, sections, or panels without changing what
 * the assistive technology sees.
 */
export function SpotlightCard({
  children,
  className,
  style,
}: SpotlightCardProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const mouseX = useMotionValue(50)
  const mouseY = useMotionValue(50)
  const reducedMotion = usePrefersReducedMotion()
  const [hasInteracted, setHasInteracted] = useState(false)

  const background = useMotionTemplate`radial-gradient(
    420px circle at ${mouseX}% ${mouseY}%,
    rgba(56, 132, 255, 0.18),
    rgba(56, 132, 255, 0) 60%
  )`

  const borderBackground = useMotionTemplate`radial-gradient(
    220px circle at ${mouseX}% ${mouseY}%,
    rgba(56, 132, 255, 0.55),
    rgba(56, 132, 255, 0) 70%
  )`

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reducedMotion) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    mouseX.set(Math.max(0, Math.min(100, x)))
    mouseY.set(Math.max(0, Math.min(100, y)))
    if (!hasInteracted) setHasInteracted(true)
  }

  function handlePointerLeave() {
    if (reducedMotion) return
    // Fade the highlight back to center so it doesn't snap to a corner.
    mouseX.set(50)
    mouseY.set(50)
  }

  const wrapperClass = ['easyui-spotlight', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={wrapperClass}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      ref={wrapperRef}
      style={style}
    >
      <motion.div
        aria-hidden="true"
        className="easyui-spotlight__glow"
        style={{ background }}
      />
      <motion.div
        aria-hidden="true"
        className={`easyui-spotlight__border${hasInteracted ? ' is-engaged' : ''}`}
        style={{ background: borderBackground }}
      />
      <div className="easyui-spotlight__content">{children}</div>
    </div>
  )
}