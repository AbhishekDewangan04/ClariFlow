import { NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import Logo from './Logo'
import { NAV } from './nav'
import BackendPill from '../domain/BackendPill'

export default function Sidebar() {
  return (
    <aside className="flex h-full w-[220px] flex-col border-r border-edge bg-void/70 backdrop-blur-2xl">
      <div className="flex h-[70px] items-center px-5">
        <Logo />
      </div>

      <nav aria-label="Main" className="mt-2 flex-1 px-3">
        <p className="px-3 pb-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400/80">Workspace</p>
        <ul className="space-y-1.5">
          {NAV.map(({ to, label, icon: Icon, end, tag }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill-side"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        className="absolute inset-0 rounded-xl border border-indigo-400/50 bg-gradient-to-r from-indigo-600/30 via-indigo-500/20 to-blue-600/10 shadow-[0_0_18px_rgba(99,102,241,0.35),inset_0_1px_1px_rgba(255,255,255,0.15)]"
                      />
                    )}
                    <span className="relative z-10 flex flex-1 items-center gap-3">
                      <Icon
                        className={`size-[18px] transition-colors ${
                          isActive ? 'text-indigo-200 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                        aria-hidden
                      />
                      <span className="tracking-tight">{label}</span>
                      {tag && (
                        <span className="ml-auto rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.2)]">
                          {tag}
                        </span>
                      )}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto space-y-2.5 p-4 pb-5 border-t border-edge/40">
        <BackendPill className="w-full justify-center" />
        <p className="text-center font-mono text-[9.5px] uppercase tracking-[0.2em] text-slate-500">Order intelligence</p>
      </div>
    </aside>
  )
}

