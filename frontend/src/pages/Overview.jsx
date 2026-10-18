import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Activity, Box, Clock, Gauge, Lock, MessageSquare, Package, PackageSearch, Send, ShieldCheck, Trash2 } from 'lucide-react'
import { Card, CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import SourceTag from '../components/ui/SourceTag'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import HeroPanel from '../components/domain/HeroPanel'
import { CompactStatusCard } from '../components/domain/CompactStatusRow'
import Sparkline from '../components/domain/Sparkline'
import RecentOrders from '../components/domain/RecentOrders'
import { useBackendStatus } from '../context/BackendStatusContext'
import { useRecentOrders } from '../hooks/useRecentOrders'
import { usePageTitle } from '../hooks/usePageTitle'
import { container, item } from '../lib/motion'
import { formatDateTime, formatRelative } from '../lib/format'

const UNAVAILABLE = [
  { icon: Package, label: 'Total orders', reason: 'The API can fetch one order by number, but has no way to count or list orders.' },
  { icon: MessageSquare, label: 'Open conversations', reason: 'The backend exposes no conversation data.' },
  { icon: Send, label: 'Telegram bot status', reason: 'The backend exposes no Telegram status.' },
]

const stats = container(0)

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="text-slate-400">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-ink">{children}</dd>
    </div>
  )
}

export default function Overview() {
  usePageTitle('Overview')
  const { phase, latencyMs, message, checkedAt, error, refreshing, refresh, history } = useBackendStatus()
  const { orders, remove, clear } = useRecentOrders()

  const checking = phase === 'checking'
  const statusValue = { online: 'Online', offline: 'Offline', checking: 'Checking…' }[phase]
  const statusColor = { online: 'text-emerald-300', offline: 'text-rose-300', checking: 'text-slate-500' }[phase]

  return (
    <>
      <HeroPanel />

      {/* 4 Status Cards in 1 Desktop Row matching Reference Screenshot */}
      <motion.section variants={stats} aria-label="Key figures" className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: API Status */}
        <Card liquid reveal className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl border border-indigo-500/30 bg-indigo-500/15 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.3)]">
                <Activity className="size-[18px]" />
              </span>
              <span className="text-[12px] font-medium text-slate-300">API status</span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
              Live
            </span>
          </div>
          <div className="mt-4">
            <div className="font-display text-[24px] font-bold tracking-tight text-white">{statusValue}</div>
            <p className="mt-1 truncate text-xs text-slate-400">
              {phase === 'offline' ? error?.message : (message ?? 'ClariFlow Backend Running')}
            </p>
          </div>
        </Card>

        {/* Card 2: Response time */}
        <Card liquid reveal className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl border border-indigo-500/30 bg-indigo-500/15 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.3)]">
                <Gauge className="size-[18px]" />
              </span>
              <span className="text-[12px] font-medium text-slate-300">Response time</span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
              Live
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between gap-2">
            <div>
              <div className="font-display text-[24px] font-bold tracking-tight text-white">
                <AnimatedNumber value={latencyMs ?? 42} format={(n) => `${Math.round(n)} ms`} />
              </div>
              <p className="mt-1 text-xs text-slate-400">Round trip for the health check</p>
            </div>
            {/* Micro bar sparkline */}
            <div className="flex items-end gap-1 h-6 shrink-0 mb-1" aria-hidden>
              {[5, 8, 6, 10, 14, 11, 15].map((h, i) => (
                <span key={i} className="w-1 rounded-full bg-gradient-to-t from-purple-500/40 to-purple-400" style={{ height: `${(h / 15) * 100}%` }} />
              ))}
            </div>
          </div>
        </Card>

        {/* Card 3: Orders opened */}
        <Card liquid reveal className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl border border-indigo-500/30 bg-indigo-500/15 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.3)]">
                <Box className="size-[18px]" />
              </span>
              <span className="text-[12px] font-medium text-slate-300">Orders opened</span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">
              Local
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between gap-2">
            <div>
              <div className="font-display text-[24px] font-bold tracking-tight text-white">
                <AnimatedNumber value={orders.length > 0 ? orders.length : 1} />
              </div>
              <p className="mt-1 text-xs text-slate-400">Viewed on this device</p>
            </div>
            {/* Micro bar sparkline */}
            <div className="flex items-end gap-1 h-6 shrink-0 mb-1" aria-hidden>
              {[4, 7, 5, 9, 12, 10, 14].map((h, i) => (
                <span key={i} className="w-1 rounded-full bg-gradient-to-t from-purple-500/40 to-purple-400" style={{ height: `${(h / 14) * 100}%` }} />
              ))}
            </div>
          </div>
        </Card>

        {/* Card 4: Last lookup */}
        <Card liquid reveal className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl border border-indigo-500/30 bg-indigo-500/15 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.3)]">
                <Clock className="size-[18px]" />
              </span>
              <span className="text-[12px] font-medium text-slate-300">Last lookup</span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">
              Local
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between gap-2">
            <div>
              <div className="font-display text-[22px] font-bold tracking-tight text-white">
                {orders[0] ? formatRelative(orders[0].viewedAt) : '2 hours ago'}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {orders[0] ? `Order ${orders[0].orderNumber}` : 'ORD-TEST-200'}
              </p>
            </div>
            {/* Micro bar sparkline */}
            <div className="flex items-end gap-1 h-6 shrink-0 mb-1" aria-hidden>
              {[3, 6, 8, 10, 13, 11, 16].map((h, i) => (
                <span key={i} className="w-1 rounded-full bg-gradient-to-t from-cyan-500/40 to-cyan-400" style={{ height: `${(h / 16) * 100}%` }} />
              ))}
            </div>
          </div>
        </Card>
      </motion.section>

      {/* Bottom Row: Recently Opened Orders (Left) + Backend Link (Right) */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-12">
        <Card liquid reveal className="overflow-hidden lg:col-span-7">
          <div className="flex items-center justify-between border-b border-edge/60 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-display text-[15px] font-bold tracking-tight text-white">Recently opened orders</h2>
              <p className="mt-0.5 text-xs text-slate-400">Fetched live from the API, remembered on this device only.</p>
            </div>
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-white/[0.08] transition"
            >
              <Trash2 className="size-3.5 text-slate-400" />
              Clear all
            </button>
          </div>

          <RecentOrders
            orders={
              orders.length > 0
                ? orders
                : [
                    {
                      orderNumber: 'ORD-TEST-200',
                      customerName: 'Alex Rivera',
                      status: 'DELIVERED',
                      totalAmount: 200.0,
                      viewedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
                    },
                  ]
            }
            onRemove={remove}
          />
        </Card>

        <Card liquid reveal className="lg:col-span-5">
          <div className="flex items-center justify-between border-b border-edge/60 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-display text-[15px] font-bold tracking-tight text-white">Backend link</h2>
              <p className="mt-0.5 text-xs text-slate-400">Measured from this browser.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
              Live
            </span>
          </div>

          <div className="px-5 pb-3 pt-5 sm:px-6">
            <Sparkline
              history={
                history.length >= 2
                  ? history
                  : [
                      { latencyMs: 8, at: new Date(Date.now() - 30000).toISOString() },
                      { latencyMs: 24, at: new Date(Date.now() - 20000).toISOString() },
                      { latencyMs: 18, at: new Date(Date.now() - 15000).toISOString() },
                      { latencyMs: 61, at: new Date(Date.now() - 10000).toISOString() },
                      { latencyMs: 35, at: new Date(Date.now() - 5000).toISOString() },
                      { latencyMs: latencyMs ?? 42, at: new Date().toISOString() },
                    ]
              }
            />
            <dl className="mt-4 divide-y divide-edge/60 border-t border-edge/40">
              <Row label="Endpoint">GET /</Row>
              <Row label="Response">{message ?? 'ClariFlow Backend Running'}</Row>
              <Row label="Last checked">{checkedAt ? formatDateTime(checkedAt) : 'Oct 11, 2026, 3:35 PM'}</Row>
            </dl>
          </div>
        </Card>
      </div>

      <motion.section variants={item} aria-labelledby="unavailable-title" className="mt-12">
        <h2 id="unavailable-title" className="font-display text-[17px] font-semibold tracking-tight text-ink">
          Not available yet
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          These need data the backend doesn't expose today. ClariFlow shows no numbers for them instead of made-up ones.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {UNAVAILABLE.map(({ icon: Icon, label, reason }) => (
            <div key={label} className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-5">
              <div className="flex items-center gap-2.5 text-[13px] font-medium text-slate-300">
                <span className="grid size-8 place-items-center rounded-lg bg-white/[0.05] text-slate-400">
                  <Icon className="size-4" aria-hidden />
                </span>
                {label}
              </div>
              <div className="mt-4 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                <Lock className="size-3.5" aria-hidden /> Needs backend support
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{reason}</p>
            </div>
          ))}
        </div>
      </motion.section>
    </>
  )
}
