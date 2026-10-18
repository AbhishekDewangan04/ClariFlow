import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { AlertCircle, Eye, EyeOff, Lock, Mail, Zap } from 'lucide-react'
import { login as apiLogin } from '../api/auth.js'
import { useAuth } from '../context/AuthContext.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import AuroraBackground from '../components/layout/AuroraBackground.jsx'

export default function Login() {
  usePageTitle('Sign in')
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const rawFrom = location.state?.from
  const from = rawFrom?.pathname ? `${rawFrom.pathname}${rawFrom.search || ''}` : '/overview'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Email and password are required.')
      return
    }

    setLoading(true)
    try {
      const data = await apiLogin(email.trim(), password)
      login(data.user)
      navigate(from, { replace: true })
    } catch (err) {
      if (err?.kind === 'network' || err?.message?.toLowerCase().includes('connect')) {
        setError('Network error: Unable to reach ClariFlow backend. Please verify your connection.')
      } else if (err?.kind === 'rate_limited' || err?.status === 429) {
        setError(err.message || 'Too many login attempts. Please wait 15 minutes before trying again.')
      } else if (err?.kind === 'server' || err?.status >= 500) {
        setError('Server error: The service encountered a problem. Please try again shortly.')
      } else if (err?.kind === 'unauthorized' || err?.status === 401) {
        setError('Invalid email or password. Please check your credentials and try again.')
      } else {
        setError(err?.message || 'Login failed. Please verify your credentials and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden flex items-center justify-center p-4">
      <AuroraBackground />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Glass card */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-2xl">
          {/* Header */}
          <div className="border-b border-white/10 px-8 py-7">
            {/* Logo mark */}
            <div className="mb-5 flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                <Zap className="size-[18px] text-white" />
              </span>
              <span className="font-display text-lg font-bold tracking-tight text-white">
                ClariFlow
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">
              Sign in to your workspace
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              Enter your team credentials to continue.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 px-8 py-7" noValidate>
            {user && (
              <div className="flex flex-col gap-2 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Currently signed in as:</span>
                  <span className="rounded-md border border-indigo-400/40 bg-indigo-500/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-indigo-300">
                    {user.role}
                  </span>
                </div>
                <div className="font-semibold text-white truncate text-sm">
                  {user.name} <span className="text-slate-400 font-normal">({user.email})</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => navigate(from, { replace: true })}
                    className="flex-1 rounded-xl border border-white/10 bg-white/10 py-1.5 text-center text-xs font-medium text-white hover:bg-white/20 transition"
                  >
                    Go to workspace →
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout()
                    }}
                    className="flex-1 rounded-xl border border-rose-500/30 bg-rose-500/15 py-1.5 text-center text-xs font-medium text-rose-300 hover:bg-rose-500/25 transition"
                  >
                    Sign out to switch
                  </button>
                </div>
              </div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-sm"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-400" />
                <span className="text-rose-300">{error}</span>
              </motion.div>
            )}

            {/* Email field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-11 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 grid size-7 place-items-center rounded-lg text-slate-500 hover:text-slate-300 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="relative mt-2 h-11 w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-sm font-semibold text-white shadow-[0_0_24px_rgba(99,102,241,0.4)] transition hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="border-t border-white/10 px-8 py-4 text-center">
            <p className="text-xs text-slate-500">
              Team members are added by an Admin.{' '}
              <span className="text-slate-400">Contact your workspace administrator.</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
