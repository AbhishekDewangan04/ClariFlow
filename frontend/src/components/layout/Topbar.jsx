import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, LogIn, Search } from 'lucide-react'
import Logo from './Logo'
import BackendPill from '../domain/BackendPill'
import { useLiquidGlass } from '../../hooks/useLiquidGlass'
import { useAuth } from '../../context/AuthContext.jsx'

const ROLE_LABELS = { admin: 'Admin', manager: 'Manager', staff: 'Staff' }

export default function Topbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const inputRef = useRef(null)
  const navRef = useRef(null)
  const searchRef = useRef(null)
  const [value, setValue] = useState('')

  useLiquidGlass(navRef, 'nav')
  useLiquidGlass(searchRef, 'search')

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
    <header ref={navRef} className="sticky top-0 z-20 h-[70px] border-b border-edge bg-void/70 backdrop-blur-2xl">
      <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-4 px-6 sm:px-8">
        <Link to="/" className="lg:hidden" aria-label="ClariFlow home">
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

          {user ? (
            <button
              type="button"
              onClick={async () => { await logout(); navigate('/login') }}
              title={`${user.name} (${ROLE_LABELS[user.role] || user.role}) — click to sign out`}
              aria-label="Sign out"
              className="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 text-sm font-semibold text-white shadow-[0_0_16px_rgba(99,102,241,0.4)] ring-1 ring-white/20 hover:opacity-80 transition"
            >
              {user.name?.[0]?.toUpperCase() ?? 'U'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-indigo-400/40 bg-indigo-500/15 px-3 text-xs font-semibold text-indigo-200 shadow-[0_0_14px_rgba(99,102,241,0.2)] hover:bg-indigo-500/25 hover:text-white transition"
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

