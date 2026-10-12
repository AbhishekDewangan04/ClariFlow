import { useRef } from 'react'
import { motion } from 'motion/react'
import { item } from '../../lib/motion'
import { useLiquidGlass } from '../../hooks/useLiquidGlass'

/**
 * Glass panel. `liquid` adds Apple-style WebGPU/WebGL refraction with fallback;
 * `interactive` adds a cursor-tracking spotlight + lift on hover;
 * `reveal` makes it join its parent's staggered entrance.
 */
export function Card({ liquid = false, interactive = false, reveal = false, className = '', children, ...props }) {
  const cardRef = useRef(null)
  useLiquidGlass(liquid ? cardRef : null, 'card')

  const onPointerMove = interactive
    ? (e) => {
        const r = e.currentTarget.getBoundingClientRect()
        e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
        e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
      }
    : undefined
  const Comp = reveal ? motion.div : 'div'
  const glassClass = liquid ? 'liquid-glass liquid-bevel' : 'glass'

  return (
    <Comp
      ref={cardRef}
      {...(reveal ? { variants: item } : {})}
      onPointerMove={onPointerMove}
      className={`${glassClass} spot rounded-2xl ${interactive ? 'transition-transform duration-300 hover:-translate-y-0.5' : ''} ${className}`}
      {...props}
    >
      {children}
    </Comp>
  )
}

export function CardHeader({ title, description, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 border-b border-edge px-5 py-4 sm:px-6 ${className}`}>
      <div className="min-w-0">
        <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-slate-400">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
