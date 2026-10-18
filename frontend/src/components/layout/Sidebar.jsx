import { NavLink, useNavigate } from 'react-router-dom'
import { LogIn, LogOut } from 'lucide-react'
import { motion } from 'motion/react'
import Logo from './Logo'
import { ADMIN_NAV, NAV } from './nav'
import BackendPill from '../domain/BackendPill'
import { useAuth } from '../../context/AuthContext.jsx'

function NavItem({ to, label, icon: Icon, end, tag }) {
  return (
    <li>
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
  )
}

export default function Sidebar() {
  const { user, logout, loading } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const ROLE_LABELS = { admin: 'Admin', manager: 'Manager', staff: 'Staff' }

  return (
    <aside className="flex h-full w-[220px] flex-col border-r border-edge bg-void/70 backdrop-blur-2xl">
      <div className="flex h-[70px] items-center px-5">
        <NavLink to="/overview" aria-label="ClariFlow workspace">
          <Logo />
        </NavLink>
      </div>

      <nav aria-label="Main" className="mt-2 flex-1 overflow-y-auto px-3">
        <p className="px-3 pb-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400/80">Workspace</p>
        <ul className="space-y-1.5">
          {NAV.map((item) => <NavItem key={item.to} {...item} />)}
        </ul>

        {/* Admin-only section */}
        {user?.role === 'admin' && (
          <div className="mt-5">
            <p className="px-3 pb-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400/80">Admin</p>
            <ul className="space-y-1.5">
              {ADMIN_NAV.map((item) => <NavItem key={item.to} {...item} />)}
            </ul>
          </div>
        )}
      </nav>

      <div className="mt-auto space-y-2.5 p-4 pb-5 border-t border-edge/40">
        <BackendPill className="w-full justify-center" />

        {/* User info + logout or Sign In */}
        {loading && !user ? (
          <div className="h-11 rounded-xl bg-white/[0.04] animate-pulse" />
        ) : user ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
            <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-tr from-indigo-600/60 to-purple-500/40 text-xs font-bold text-white">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{user.name}</p>
              <p className="text-[10px] text-slate-500">{ROLE_LABELS[user.role] || user.role}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              className="grid size-7 place-items-center rounded-lg text-slate-500 hover:bg-white/[0.07] hover:text-white transition"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        ) : (
          <NavLink
            to="/login"
            className="flex items-center justify-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition"
          >
            <LogIn className="size-3.5" />
            <span>Staff Sign In</span>
          </NavLink>
        )}

        <p className="text-center font-mono text-[9.5px] uppercase tracking-[0.2em] text-slate-500">Order intelligence</p>
      </div>
    </aside>
  )
}
