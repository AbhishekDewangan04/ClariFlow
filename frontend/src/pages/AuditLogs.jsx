import { useState, useEffect, useCallback, useId } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
  Package,
  Key,
  Shield,
  Clock,
  Code,
  X,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { getAuditLogs } from '../api/auth'
import { usePageTitle } from '../hooks/usePageTitle'
import { formatDateTime, formatRelative } from '../lib/format'
import { container, item } from '../lib/motion'

const ACTION_FILTERS = [
  { value: 'ALL', label: 'All Actions' },
  { value: 'order.status_update', label: 'Order Status Changes' },
  { value: 'user.created', label: 'User Created' },
  { value: 'user.role_changed', label: 'Role Changed' },
  { value: 'user.deactivated', label: 'User Deactivated' },
  { value: 'login', label: 'Logins' },
  { value: 'logout', label: 'Logouts' },
]

function getActionBadge(action) {
  switch (action) {
    case 'order.status_update':
      return {
        label: 'Order Status Update',
        color: 'text-indigo-300 border-indigo-400/40 bg-indigo-500/10',
        icon: Package,
      }
    case 'user.created':
      return {
        label: 'User Created',
        color: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10',
        icon: User,
      }
    case 'user.role_changed':
      return {
        label: 'Role Changed',
        color: 'text-purple-300 border-purple-400/40 bg-purple-500/10',
        icon: Shield,
      }
    case 'user.deactivated':
      return {
        label: 'User Deactivated',
        color: 'text-rose-300 border-rose-400/40 bg-rose-500/10',
        icon: AlertTriangle,
      }
    case 'login':
      return {
        label: 'User Login',
        color: 'text-cyan-300 border-cyan-400/40 bg-cyan-500/10',
        icon: Key,
      }
    case 'logout':
      return {
        label: 'User Logout',
        color: 'text-slate-300 border-slate-400/30 bg-white/[0.04]',
        icon: Key,
      }
    default:
      return {
        label: action,
        color: 'text-slate-300 border-slate-400/30 bg-white/[0.04]',
        icon: FileText,
      }
  }
}

function DetailModal({ log, onClose }) {
  if (!log) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-void/80 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-[#0d0f1a] p-6 shadow-2xl backdrop-blur-2xl"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-indigo-400" />
            <h3 className="font-display text-base font-semibold text-white">Audit Entry #{log.id}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-xs">
          <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-white/5">
            <span className="font-mono text-slate-400">Timestamp</span>
            <span className="col-span-2 text-white font-mono">{formatDateTime(log.createdAt)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-white/5">
            <span className="font-mono text-slate-400">Actor</span>
            <span className="col-span-2 text-white">{log.actorEmail || 'System / Kiosk'}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-white/5">
            <span className="font-mono text-slate-400">Action</span>
            <span className="col-span-2 text-indigo-300 font-mono">{log.action}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-white/5">
            <span className="font-mono text-slate-400">Target</span>
            <span className="col-span-2 text-slate-200 font-mono">{log.target || '—'}</span>
          </div>
          <div className="pt-2">
            <span className="font-mono text-slate-400 block mb-1.5">Event Metadata (JSON)</span>
            <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-[11px] text-slate-300 max-h-56">
              {JSON.stringify(log.detail, null, 2) || '{}'}
            </pre>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

export default function AuditLogs() {
  usePageTitle('Security Audit Logs')

  const filterSelectId = useId()
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [actionFilter, setActionFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [inspectLog, setInspectLog] = useState(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getAuditLogs({ page, limit, action: actionFilter })
      setLogs(res.logs || [])
      setTotal(res.total || 0)
    } catch (err) {
      setError(err?.message || 'Failed to load audit logs.')
    } finally {
      setLoading(false)
    }
  }, [page, limit, actionFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <motion.div variants={container(0.06)} initial="hidden" animate="show" className="space-y-6">
      {/* Top Header Card */}
      <Card liquid reveal className="p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-300">
                Security Governance
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Audit Logs
            </h1>
            <p className="text-sm font-medium text-slate-400 max-w-2xl">
              Chronological, append-only record of all team authentications, role modifications, and order status lifecycle updates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={fetchLogs}
              loading={loading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-white/5">
          <div className="flex flex-wrap items-center gap-2.5">
            <Filter className="size-4 text-slate-400" />
            <label htmlFor={filterSelectId} className="sr-only">
              Filter action
            </label>
            <select
              id={filterSelectId}
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value)
                setPage(1)
              }}
              className="rounded-xl border border-white/10 bg-midnight/80 px-3 py-1.5 text-xs font-semibold text-white outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
            >
              {ACTION_FILTERS.map((f) => (
                <option key={f.value} value={f.value} className="bg-[#0b0d19]">
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="font-mono text-xs text-slate-400">
            Total recorded events: <span className="font-semibold text-white">{total}</span>
          </div>
        </div>
      </Card>

      {/* Error State Banner */}
      {error && (
        <Card liquid className="p-4 border-rose-500/30 bg-rose-950/20">
          <div className="flex items-start justify-between gap-3 text-rose-200">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="size-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-rose-200">Failed to load audit records</p>
                <p className="text-xs text-rose-300/80 mt-0.5">{error}</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={fetchLogs}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Table Card */}
      <Card liquid reveal className="overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <span className="size-7 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-400">
              <ShieldAlert className="size-6" />
            </div>
            <h3 className="mt-3 font-display text-base font-semibold text-white">No Audit Records Found</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
              No audit records matched your filter. Events are automatically captured when team members log in, update orders, or manage accounts.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-edge/80 font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-400 bg-white/[0.02]">
                    <th scope="col" className="px-5 py-3 font-semibold">Timestamp</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Actor</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Action</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Target</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Details</th>
                    <th scope="col" className="w-16 px-4 py-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge/40">
                  {logs.map((log) => {
                    const badge = getActionBadge(log.action)
                    const Icon = badge.icon
                    const detailSummary = log.detail
                      ? typeof log.detail === 'object'
                        ? log.detail.from && log.detail.to
                          ? `${log.detail.from} → ${log.detail.to}`
                          : log.detail.role || log.detail.newRole
                          ? `Role: ${log.detail.role || log.detail.newRole}`
                          : JSON.stringify(log.detail)
                        : String(log.detail)
                      : '—'

                    return (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <div className="flex items-center gap-1.5 font-mono text-xs text-white">
                            <Clock className="size-3 text-slate-500" />
                            {formatDateTime(log.createdAt)}
                          </div>
                          <span className="text-[10.5px] text-slate-500 font-sans">
                            {formatRelative(log.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="grid size-6 shrink-0 place-items-center rounded-lg bg-indigo-500/10 text-indigo-300 font-mono text-[10px]">
                              {log.actorEmail ? log.actorEmail[0]?.toUpperCase() : 'S'}
                            </div>
                            <span className="truncate text-xs font-medium text-slate-200 max-w-[14rem]">
                              {log.actorEmail || 'System / Automated'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.color}`}
                          >
                            <Icon className="size-3" />
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-indigo-200">
                          {log.target || '—'}
                        </td>
                        <td className="max-w-xs truncate px-4 py-3.5 font-mono text-[11px] text-slate-400">
                          {detailSummary}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setInspectLog(log)}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-mono text-slate-300 hover:bg-white/[0.08] hover:text-white transition"
                          >
                            <Code className="size-3" />
                            JSON
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-wrap items-center justify-between border-t border-edge/60 px-5 py-3.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="grid size-7 place-items-center rounded-lg border border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed transition"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <span className="font-mono text-xs text-slate-300">
                  Page <span className="font-semibold text-white">{page}</span> of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="grid size-7 place-items-center rounded-lg border border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed transition"
                  aria-label="Next page"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <p className="font-mono text-[11px] text-slate-500">
                  Showing {logs.length} of {total} records
                </p>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Detail JSON modal */}
      <AnimatePresence>
        {inspectLog && (
          <DetailModal log={inspectLog} onClose={() => setInspectLog(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
