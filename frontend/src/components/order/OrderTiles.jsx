import { motion } from 'motion/react'
import { Card } from '../ui/Card'
import AnimatedNumber from '../ui/AnimatedNumber'
import { container } from '../../lib/motion'
import { formatCurrency, formatDateTime, formatRelative, initials } from '../../lib/format'

const Label = ({ children }) => (
  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold">{children}</dt>
)

export default function OrderTiles({ order }) {
  const when = order.updatedAt ?? order.createdAt
  return (
    <motion.dl variants={container(0.06)} className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
      {/* Customer card */}
      <Card liquid reveal className="p-4 sm:p-5 flex flex-col justify-between">
        <Label>Customer</Label>
        <dd className="mt-3 flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-xs font-semibold text-white shadow-[0_0_12px_rgba(99,102,241,0.5)] ring-1 ring-white/20">
            {initials(order.customerName)}
          </span>
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold text-white">{order.customerName ?? '—'}</span>
            <span className="block truncate text-xs text-slate-400">
              {order.customerName ? `${order.customerName.toLowerCase().replace(/\s+/g, '.')}@example.com` : '—'}
            </span>
          </div>
        </dd>
      </Card>

      {/* Total amount card */}
      <Card liquid reveal className="p-4 sm:p-5 flex flex-col justify-between">
        <Label>Total amount</Label>
        <dd className="mt-3">
          <div className="font-display text-[22px] sm:text-[26px] font-semibold leading-none tracking-tight tabular-nums text-white">
            {order.totalAmount != null && Number.isFinite(Number(order.totalAmount)) ? (
              <AnimatedNumber value={Number(order.totalAmount)} format={formatCurrency} />
            ) : (
              '—'
            )}
          </div>
          <span className="mt-1.5 block text-xs font-medium text-slate-400">1 item</span>
        </dd>
      </Card>

      {/* Last updated card */}
      <Card liquid reveal className="p-4 sm:p-5 flex flex-col justify-between">
        <Label>Last updated</Label>
        <dd className="mt-3">
          <div className="font-display text-sm sm:text-base font-semibold text-white">
            {formatDateTime(when)}
          </div>
          <span className="mt-1 block text-xs font-medium text-slate-400">{formatRelative(when)}</span>
        </dd>
      </Card>
    </motion.dl>
  )
}

