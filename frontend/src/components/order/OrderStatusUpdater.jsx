import { useState, useId } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { updateOrderStatus } from '../../api/auth'
import { recordOrderView } from '../../hooks/useRecentOrders'
import { STATUS_LABELS, getAllowedTransitions } from '../../lib/lifecycle.js'
import Button from '../ui/Button'

export { getAllowedTransitions }

export default function OrderStatusUpdater({ orderNumber, currentStatus, onUpdated, className = '' }) {
  const { user } = useAuth()
  const selectId = useId()
  const role = user?.role
  const normalizedStatus = (currentStatus || '').toUpperCase()
  const allowed = getAllowedTransitions(role, normalizedStatus)

  const [selectedStatus, setSelectedStatus] = useState(allowed[0] || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showConfirmCancel, setShowConfirmCancel] = useState(false)

  // Update selected default if allowed transitions change
  const currentTarget = allowed.includes(selectedStatus) ? selectedStatus : allowed[0] || ''

  async function performUpdate(targetStatus) {
    if (!targetStatus) return
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const res = await updateOrderStatus(orderNumber, targetStatus)
      const updatedData = {
        orderNumber,
        status: res.status,
        updatedAt: res.updatedAt || new Date().toISOString(),
      }
      recordOrderView(updatedData)
      setSuccess(`Status updated to ${STATUS_LABELS[res.status] || res.status}`)
      if (typeof onUpdated === 'function') {
        onUpdated(updatedData)
      }
      setTimeout(() => setSuccess(null), 4000)
    } catch (err) {
      setError(err?.message || 'Failed to update order status.')
    } finally {
      setLoading(false)
      setShowConfirmCancel(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!currentTarget) return
    if (currentTarget === 'CANCELLED') {
      setShowConfirmCancel(true)
      return
    }
    performUpdate(currentTarget)
  }

  if (!user) {
    return (
      <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl ${className}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-slate-400" />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              Order Lifecycle Controls
            </span>
          </div>
          <span className="rounded-full border border-slate-500/30 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[10px] font-medium text-slate-400">
            Read-Only (Public)
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Public order lookup is read-only. Authorized team members can{' '}
          <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition">
            sign in
          </Link>{' '}
          to update lifecycle status.
        </p>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-indigo-400" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-300">
            Order Lifecycle Controls
          </span>
        </div>
        <span className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-0.5 font-mono text-[10px] font-medium text-indigo-300">
          Role: {role}
        </span>
      </div>

      {allowed.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-2.5 text-xs text-slate-400">
          <Lock className="size-3.5 shrink-0 text-slate-500" />
          <span>
            {normalizedStatus === 'DELIVERED'
              ? 'This order is Delivered and locked against further status modifications.'
              : normalizedStatus === 'CANCELLED'
              ? 'This order is Cancelled. Further status progression is disabled.'
              : `Your role (${role}) cannot transition from "${STATUS_LABELS[normalizedStatus] || normalizedStatus}".`}
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <label htmlFor={selectId} className="sr-only">
                Target Status
              </label>
              <select
                id={selectId}
                value={currentTarget}
                onChange={(e) => setSelectedStatus(e.target.value)}
                disabled={loading}
                className="w-full appearance-none rounded-xl border border-white/10 bg-[#090d1a] px-3.5 py-2 text-xs font-semibold text-white outline-none transition hover:border-white/20 hover:bg-[#0e1428] focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/25 disabled:opacity-60 cursor-pointer shadow-sm"
              >
                {allowed.map((st) => (
                  <option key={st} value={st} className="bg-[#0b0f1d] text-white py-1.5">
                    Transition to {STATUS_LABELS[st] || st}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            </div>

            <Button
              type="submit"
              size="sm"
              loading={loading}
              icon={ArrowRight}
              className="sm:w-auto w-full text-xs"
            >
              Update Status
            </Button>
          </div>

          {/* Quick Staff Button if single transition */}
          {role === 'staff' && allowed.length === 1 && allowed[0] === 'SHIPPED' && (
            <p className="text-[11px] text-slate-400">
              Staff permission: Advance order to <span className="font-semibold text-indigo-300">Shipped</span> upon fulfillment.
            </p>
          )}
        </form>
      )}

      {/* Confirmation Modal for CANCELLED */}
      <AnimatePresence>
        {showConfirmCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-void/80 backdrop-blur-md"
              onClick={() => setShowConfirmCancel(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative z-10 w-full max-w-sm rounded-2xl border border-rose-500/30 bg-[#0d0f1a] p-5 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Cancel Order {orderNumber}?</h4>
                  <p className="mt-1 text-xs text-slate-400">
                    This action will mark the order as Cancelled and audit the action under your account.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowConfirmCancel(false)}
                  disabled={loading}
                >
                  Keep Order
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={loading}
                  onClick={() => performUpdate('CANCELLED')}
                  className="bg-rose-600 hover:bg-rose-500"
                >
                  Confirm Cancel
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success notification */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200"
        >
          <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
          <span>{success}</span>
        </motion.div>
      )}

      {/* Error notification */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-start justify-between gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-white"
            aria-label="Dismiss error"
          >
            <X className="size-3.5" />
          </button>
        </motion.div>
      )}
    </div>
  )
}
