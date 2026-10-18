import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, History, LayoutGrid, LogIn, LogOut, Search, User, Users } from 'lucide-react'
import Logo from './Logo'
import BackendPill from '../domain/BackendPill'
import { useLiquidGlass } from '../../hooks/useLiquidGlass'
import { useAuth } from '../../context/AuthContext.jsx'

const ROLE_LABELS = { admin: 'Admin', manager: 'Manager', staff: 'Staff' }
const ROLE_BADGE_STYLES = {
  admin: 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.25)]',
  manager: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.25)]',
  staff: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
}

export default function Topbar() {
  const navigate = useNavigate()
  const { user, logout, loading } = useAuth()
  const inputRef = useRef(null)
  const navRef = useRef(null)
  const searchRef = useRef(null)
  const menuRef = useRef(null)
  const [value, setValue] = useState('')
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  useLiquidGlass(navRef, 'nav')
  useLiquidGlass(searchRef, 'search')

  // Close account menu on click outside or Escape
  useEffect(() => {
    if (!accountMenuOpen) return
    const onMouseDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setAccountMenuOpen(false)
      }
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setAccountMenuOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [accountMenuOpen])

  // Press "/" anywhere to jump to the search box.
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && tag !== 'INPUT' && tag !== 'TEXTAREA' && !e.target?.isContentEditable) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function submit(e) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return navigate('/orders')
    navigate(`/orders/${encodeURIComponent(trimmed)}`)
    setValue('')
    inputRef.current?.blur()
  }

  return (
    <header ref={navRef} className="sticky top-0 z-30 h-[70px] border-b border-edge bg-void/70 backdrop-blur-2xl">
      <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-4 px-6 sm:px-8">
        <Link to="/overview" className="lg:hidden" aria-label="ClariFlow workspace">
          <Logo />
        </Link>

        {/* Wide order search on the left */}
        <form onSubmit={submit} className="relative hidden w-full max-w-xl md:block" role="search">
          <div ref={searchRef} className="relative flex items-center rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-md transition-all focus-within:border-indigo-400/60 focus-within:ring-2 focus-within:ring-indigo-500/25">
            <Search className="pointer-events-none ml-3.5 size-4 text-slate-400" aria-hidden />
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Jump to an order number…"
              aria-label="Jump to an order number"
              autoComplete="off"
              spellCheck={false}
              className="h-10 w-full bg-transparent pl-3 pr-16 text-sm text-ink outline-none placeholder:text-slate-500"
            />
            <div className="absolute right-2 flex items-center gap-1.5">
              <kbd className="pointer-events-none rounded border border-white/10 bg-white/[0.06] px-1.5 font-mono text-[11px] text-slate-400">
                /
              </kbd>
              <button
                type="submit"
                aria-label="Execute search"
                className="grid size-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                <Search className="size-3.5" aria-hidden />
              </button>
            </div>
          </div>
        </form>

        {/* Right side controls: Notification and Profile */}
        <div className="ml-auto flex items-center gap-3">
          <Link
            to="/orders"
            aria-label="Search orders"
            className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] md:hidden"
          >
            <Search className="size-5" aria-hidden />
          </Link>

          <div className="sm:hidden">
            <BackendPill compact />
          </div>
          <div className="hidden sm:block lg:hidden">
            <BackendPill />
          </div>

          <button
            type="button"
            aria-label="Notifications"
            className="relative grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <Bell className="size-[18px]" aria-hidden />
            <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgb(129_140_248)]" />
          </button>

          {loading ? (
            <div className="size-10 rounded-xl bg-white/[0.05] animate-pulse" />
          ) : user ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                aria-label="Account menu"
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 pr-2.5 transition-all hover:border-white/20 hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-indigo-500/40"
              >
                <div className="grid size-7 place-items-center rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 text-xs font-semibold text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]">
                  {user.name?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div className="hidden text-left lg:block">
                  <p className="max-w-[110px] truncate text-xs font-medium text-white">{user.name}</p>
                </div>
                <ChevronDown className={`size-3 text-slate-400 transition-transform duration-200 ${accountMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {accountMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-white/15 bg-[#090d1a]/95 backdrop-blur-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.06)] z-50 transition-all"
                >
                  {/* User summary */}
                  <div className="px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                      <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${ROLE_BADGE_STYLES[user.role] || ROLE_BADGE_STYLES.staff}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-400">{user.email}</p>
                  </div>

                  <div className="my-1 border-t border-white/10" />

                  {/* Quick links */}
                  <div className="space-y-0.5">
                    <Link
                      to="/overview"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition"
                    >
                      <LayoutGrid className="size-3.5 text-slate-400" />
                      <span>Workspace Overview</span>
                    </Link>

                    <Link
                      to="/profile"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition"
                    >
                      <User className="size-3.5 text-slate-400" />
                      <span>Profile Settings</span>
                    </Link>

                    {user.role === 'admin' && (
                      <>
                        <Link
                          to="/team"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition"
                        >
                          <Users className="size-3.5 text-indigo-400" />
                          <span>Team Management</span>
                        </Link>
                        <Link
                          to="/audit-logs"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition"
                        >
                          <History className="size-3.5 text-cyan-400" />
                          <span>Audit Logs</span>
                        </Link>
                      </>
                    )}
                  </div>

                  <div className="my-1 border-t border-white/10" />

                  {/* Sign out button */}
                  <button
                    type="button"
                    onClick={async () => {
                      setAccountMenuOpen(false)
                      await logout()
                      navigate('/login')
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 transition"
                  >
                    <LogOut className="size-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-indigo-400/40 bg-indigo-500/15 px-3.5 text-xs font-semibold text-indigo-200 shadow-[0_0_14px_rgba(99,102,241,0.2)] hover:bg-indigo-500/25 hover:text-white transition"
            >
              <LogIn className="size-4" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
