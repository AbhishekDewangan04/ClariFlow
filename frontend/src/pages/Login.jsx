import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { AlertCircle, Eye, EyeOff, Lock, Mail, Zap } from 'lucide-react'
import { login as apiLogin } from '../api/auth.js'
import { useAuth } from '../context/AuthContext.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import AuroraBackground from '../components/layout/AuroraBackground.jsx'

export default function Login() {
  usePageTitle('Sign in')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

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
      setError(err?.message || 'Login failed. Check your credentials.')
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
