import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Activity,
  ArrowRight,
  Box,
  CheckCircle2,
  Clock,
  Database,
  Gauge,
  History,
  Lock,
  MessageSquare,
  PackageCheck,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'
import Logo from '../components/layout/Logo'
import AuroraBackground from '../components/layout/AuroraBackground'
import StatusBadge from '../components/domain/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'

export default function Landing() {
  usePageTitle('Order Intelligence & Lifecycle Platform')
  const { user } = useAuth()

  const destination = user ? '/overview' : '/login'

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-void text-ink font-sans selection:bg-indigo-500/30 selection:text-white">
      {/* Background ambient lighting */}
      <AuroraBackground />

      {/* Top Navigation */}
      <header className="relative z-20 border-b border-white/10 bg-void/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-[70px] max-w-7xl items-center justify-between px-6 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <Logo />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition">Capabilities</a>
            <a href="#how-it-works" className="hover:text-white transition">How It Works</a>
            <a href="#security" className="hover:text-white transition">Security & Access</a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/overview"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 px-4 text-xs font-semibold text-white shadow-[0_0_18px_rgba(99,102,241,0.5)] hover:opacity-90 transition"
              >
                <span>Open Workspace</span>
                <ArrowRight className="size-3.5" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-4 text-xs font-semibold text-indigo-200 shadow-[0_0_14px_rgba(99,102,241,0.25)] hover:bg-indigo-500/25 hover:text-white transition"
              >
                <span>Staff Sign In</span>
                <ArrowRight className="size-3.5" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 lg:pt-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Value Proposition */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 shadow-[0_0_14px_rgba(99,102,241,0.25)]">
                <Sparkles className="size-3.5 text-indigo-400" />
                <span>Enterprise Order Intelligence & Tracking</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
                Real-time order lifecycle visibility,{' '}
                <span className="bg-gradient-to-r from-indigo-300 via-indigo-200 to-cyan-300 bg-clip-text text-transparent">
                  powered by PostgreSQL.
                </span>
              </h1>

              <p className="max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed">
                Empower fulfillment operations with sub-second order lookups, strict role-governed status transitions, integrated Telegram customer inquiries, and immutable audit logs.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to={destination}
                  className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 px-6 text-sm font-semibold text-white shadow-[0_0_24px_rgba(99,102,241,0.5)] hover:opacity-95 transition"
                >
                  <span>{user ? 'Go to Workspace' : 'Sign in to Workspace'}</span>
                  <ArrowRight className="size-4" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-slate-300 hover:bg-white/[0.08] hover:text-white transition"
                >
                  Explore Capabilities
                </a>
              </div>

              <div className="flex items-center gap-6 pt-4 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  <span>Admin-Provisioned Zero-Trust</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-indigo-400" />
                  <span>Live PostgreSQL 16 Backend</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Live Preview Card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-xl bg-indigo-500/20 text-indigo-300">
                      <Box className="size-4" />
                    </span>
                    <div>
                      <span className="font-mono text-xs font-semibold text-indigo-200">ORD-TEST-200</span>
                      <p className="text-[11px] text-slate-400">Alex Rivera</p>
                    </div>
                  </div>
                  <StatusBadge status="DELIVERED" size="sm" />
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Amount</span>
                    <span className="font-mono font-semibold text-white">₹200.00</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Channel</span>
                    <span className="text-slate-200">Telegram Bot & Staff Console</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Role Verification</span>
                    <span className="font-mono text-emerald-400 text-[11px]">Enforced (Staff/Mgr/Admin)</span>
                  </div>

                  {/* Progress steps */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
                      <span className="text-indigo-300">Processing</span>
                      <span className="text-indigo-300">In Transit</span>
                      <span className="text-emerald-300 font-semibold">Delivered</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-full bg-gradient-to-r from-indigo-500 to-emerald-400" />
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-xs text-indigo-200">
                  <p className="font-medium">Direct PostgreSQL Session State</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Order state, role permissions, and token revocation are verified live on every request.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live System Telemetry Strip */}
      <section className="relative z-10 border-y border-white/10 bg-white/[0.02] py-8">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <Database className="size-4 text-indigo-400" />
                <span>PostgreSQL 16</span>
              </div>
              <p className="text-lg font-bold text-white">Connected</p>
              <p className="text-[11px] text-slate-500">Atomic order transitions</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <Gauge className="size-4 text-emerald-400" />
                <span>Lookup Latency</span>
              </div>
              <p className="text-lg font-bold text-white">&lt; 15 ms</p>
              <p className="text-[11px] text-slate-500">Indexed order lookups</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <Shield className="size-4 text-cyan-400" />
                <span>Role Governance</span>
              </div>
              <p className="text-lg font-bold text-white">3-Tier Matrix</p>
              <p className="text-[11px] text-slate-500">Staff, Manager, Admin</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <Send className="size-4 text-blue-400" />
                <span>Telegram Bot</span>
              </div>
              <p className="text-lg font-bold text-white">Live Tracking</p>
              <p className="text-[11px] text-slate-500">Multi-session polling</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Built for precision fulfillment operations
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              ClariFlow connects warehouse staff, operations managers, and customers in one real-time lifecycle architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl space-y-3">
              <div className="grid size-10 place-items-center rounded-xl bg-indigo-500/15 text-indigo-400">
                <Box className="size-5" />
              </div>
              <h3 className="font-display text-base font-semibold text-white">Sub-Second Order Lookup</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Query orders on-demand by identifier with real-time customer, amount, timestamp, and shipment milestone details.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl space-y-3">
              <div className="grid size-10 place-items-center rounded-xl bg-cyan-500/15 text-cyan-400">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="font-display text-base font-semibold text-white">Role-Enforced Workflows</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enforces status transition boundaries. Staff advance processing to shipped, Managers authorize cancellations, and Admins retain full override.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl space-y-3">
              <div className="grid size-10 place-items-center rounded-xl bg-blue-500/15 text-blue-400">
                <Send className="size-5" />
              </div>
              <h3 className="font-display text-base font-semibold text-white">Telegram Customer Bot</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Customers query their packages via Telegram using /order commands or natural language with conflict diagnostics.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl space-y-3">
              <div className="grid size-10 place-items-center rounded-xl bg-purple-500/15 text-purple-400">
                <History className="size-5" />
              </div>
              <h3 className="font-display text-base font-semibold text-white">Immutable Audit Trail</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Records every status change, authentication attempt, and user management action with actor identities and timestamps.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 border-t border-white/10 bg-white/[0.01] px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
              How ClariFlow works
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              From warehouse dispatch to customer notification, data stays synchronized.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
              <span className="font-mono text-xs font-bold text-indigo-400">01 / INGESTION</span>
              <h3 className="font-display text-lg font-semibold text-white">Order Creation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Orders are ingested into PostgreSQL with decimal-accurate totals, customer metadata, and initial processing status.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
              <span className="font-mono text-xs font-bold text-cyan-400">02 / GOVERNANCE</span>
              <h3 className="font-display text-lg font-semibold text-white">Role-Aware Updates</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Staff and managers update fulfillment milestones. Status transition guards verify role permissions before mutating records.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
              <span className="font-mono text-xs font-bold text-emerald-400">03 / VISIBILITY</span>
              <h3 className="font-display text-lg font-semibold text-white">Multi-Channel Tracking</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Customers track progress directly in Telegram, while operations teams monitor telemetry and health in real time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Access Section */}
      <section id="security" className="relative z-10 border-t border-white/10 px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:p-10 backdrop-blur-2xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
                <Lock className="size-4" />
                <span>Admin-Provisioned Accounts</span>
              </div>
              <h3 className="font-display text-2xl font-bold text-white">
                Zero-Trust Workspace Security
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Public self-registration is intentionally disabled. Workspace accounts are exclusively provisioned and assigned roles by your ClariFlow System Administrator.
              </p>
            </div>

            <Link
              to={destination}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 text-xs font-semibold text-white shadow-[0_0_18px_rgba(99,102,241,0.4)] hover:opacity-90 transition"
            >
              <span>{user ? 'Open Workspace' : 'Sign In with Credentials'}</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-void/80 py-8 px-6 text-center text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-slate-600">|</span>
            <span>Enterprise Order Intelligence</span>
          </div>
          <p>© 2026 ClariFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
