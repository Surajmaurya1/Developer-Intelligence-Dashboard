import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { easyUiSpring, usePrefersReducedMotion } from './motion-utils'

type NotFoundProps = {
  eyebrow: string
  title: string
  description: string
  /** Render prop for the recovery action (typically a Link). */
  renderAction: () => ReactNode
  /** Optional extra heading id used by the surrounding section. */
  headingId?: string
}

const GLYPHS = ['4', '0', '4'] as const

/**
 * NotFound renders a 404 surface with floating glyph physics and an
 * accessible recovery action. It preserves the eyebrow / title / description
 * pattern used by the host's NotFoundPage so existing assertions still pass.
 */
export function NotFound({
  eyebrow,
  title,
  description,
  renderAction,
  headingId = 'not-found-title',
}: NotFoundProps) {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <section
      aria-labelledby={headingId}
      className="easyui-not-found"
    >
      <div aria-hidden="true" className="easyui-not-found__glyphs">
        {GLYPHS.map((char, index) => (
          <motion.span
            animate={{ y: 0, rotate: 0 }}
            className={`easyui-not-found__glyph easyui-not-found__glyph--${index}`}
            initial={
              reducedMotion
                ? false
                : { y: -8, rotate: (index - 1) * 6 }
            }
            key={char}
            transition={reducedMotion ? { duration: 0 } : easyUiSpring}
            whileHover={
              reducedMotion
                ? undefined
                : { y: -4, rotate: (index - 1) * 10 }
            }
          >
            {char}
          </motion.span>
        ))}
      </div>
      <p className="eyebrow">{eyebrow}</p>
      <h1 id={headingId}>{title}</h1>
      <p>{description}</p>
      <div className="easyui-not-found__action">{renderAction()}</div>
    </section>
  )
}