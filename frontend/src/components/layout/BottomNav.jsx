import { useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import { NAV, ADMIN_NAV } from './nav'
import { useLiquidGlass } from '../../hooks/useLiquidGlass'
import { useAuth } from '../../context/AuthContext.jsx'

/** Floating glass tab bar for small screens (replaces a hamburger drawer). */
export default function BottomNav() {
  const controlRef = useRef(null)
  const { user } = useAuth()
  useLiquidGlass(controlRef, 'control')

  const items = user?.role === 'admin' ? [...NAV, ...ADMIN_NAV] : NAV

  return (
    <nav
      ref={controlRef}
      aria-label="Main"
      className="fixed inset-x-3 bottom-3 z-40 rounded-2xl liquid-glass liquid-bevel p-1.5 shadow-[0_20px_50px_-12px_rgb(0_0_0/0.95)] pb-[max(0.375rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <ul className={`grid gap-1`} style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map(({ to, label, icon: Icon, end, tag }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-white' : 'text-slate-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill-bottom"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      className="absolute inset-0 rounded-xl bg-gradient-to-b from-indigo-500/30 to-indigo-500/10 ring-1 ring-inset ring-white/10"
                    />
                  )}
                  <Icon className={`relative z-10 size-5 ${isActive ? 'text-indigo-200' : ''}`} aria-hidden />
                  <span className="relative z-10 flex items-center gap-1">
                    {label}
                    {tag && <span className="size-1.5 rounded-full bg-amber-400" aria-label="preview" />}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
