import { motion } from 'motion/react'
import { item } from '../../lib/motion'

export default function PageHeader({ eyebrow, title, description, actions, badge }) {
  return (
    <motion.header variants={item} className="mb-7 flex flex-col gap-4 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-3 flex items-center gap-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-indigo-300">
            <span className="h-px w-6 bg-gradient-to-r from-indigo-400 to-transparent" aria-hidden />
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[28px] font-semibold tracking-tight text-ink sm:text-[34px]">{title}</h1>
          {badge}
        </div>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </motion.header>
  )
}
