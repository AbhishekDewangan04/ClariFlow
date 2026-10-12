import { Box, CheckCircle2, Cog, Truck, AlertTriangle, Activity, Gauge, Clock, ShieldCheck, Check } from 'lucide-react'
import { Card } from '../ui/Card'
import AnimatedNumber from '../ui/AnimatedNumber'

function MicroBars({ color = 'indigo' }) {
  const bars = [4, 7, 5, 8, 11, 9, 14]
  const colorMap = {
    indigo: 'from-indigo-500/40 to-indigo-400',
    emerald: 'from-emerald-500/40 to-emerald-400',
    cyan: 'from-cyan-500/40 to-cyan-400',
    purple: 'from-purple-500/40 to-purple-400',
    rose: 'from-rose-500/40 to-rose-400',
  }
  const bg = colorMap[color] || colorMap.indigo

  return (
    <div className="flex items-end gap-1 h-6 shrink-0" aria-hidden>
      {bars.map((h, i) => (
        <span
          key={i}
          className={`w-1 rounded-full bg-gradient-to-t ${bg}`}
          style={{ height: `${(h / 14) * 100}%` }}
        />
      ))}
    </div>
  )
}

export function CompactStatusCard({
  icon: Icon,
  color = 'indigo',
  label,
  value,
  subtext,
  showBars = true,
  className = '',
}) {
  const colorConfigs = {
    indigo: {
      iconBg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300 shadow-[0_0_14px_rgba(99,102,241,0.35)]',
      subtextClass: 'text-indigo-300/90',
    },
    emerald: {
      iconBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.35)]',
      subtextClass: 'text-emerald-300/90',
    },
    cyan: {
      iconBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 shadow-[0_0_14px_rgba(6,182,212,0.35)]',
      subtextClass: 'text-cyan-300/90',
    },
    purple: {
      iconBg: 'bg-purple-500/15 border-purple-500/30 text-purple-300 shadow-[0_0_14px_rgba(168,85,247,0.35)]',
      subtextClass: 'text-purple-300/90',
    },
    rose: {
      iconBg: 'bg-rose-500/15 border-rose-500/30 text-rose-300 shadow-[0_0_14px_rgba(244,63,94,0.35)]',
      subtextClass: 'text-rose-300/90',
    },
  }

  const cfg = colorConfigs[color] || colorConfigs.indigo

  return (
    <Card liquid reveal className={`p-4 sm:p-4.5 flex flex-col justify-between ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-xl border ${cfg.iconBg}`}
        >
          <Icon className="size-[18px]" aria-hidden />
        </span>
        {showBars && <MicroBars color={color} />}
      </div>

      <div className="mt-3">
        <p className="text-[12px] font-medium text-slate-400 tracking-tight">{label}</p>
        <div className="mt-1 font-display text-[22px] sm:text-[24px] font-semibold leading-tight tracking-tight text-white">
          {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
        </div>
        {subtext && (
          <p className={`mt-1 text-[11px] font-medium tracking-tight truncate ${cfg.subtextClass}`}>
            {subtext}
          </p>
        )}
      </div>
    </Card>
  )
}

/**
 * 5 Compact status cards in one desktop row, reflecting real backend/client data.
 */
export default function CompactStatusRow({ orders = [] }) {
  const total = orders.length
  const delivered = orders.filter((o) =>
    ['DELIVERED', 'COMPLETED'].includes(String(o.status || '').toUpperCase())
  ).length
  const inTransit = orders.filter((o) =>
    ['IN_TRANSIT', 'SHIPPED', 'DISPATCHED'].includes(String(o.status || '').toUpperCase())
  ).length
  const processing = orders.filter((o) =>
    ['PROCESSING', 'PLACED', 'PENDING'].includes(String(o.status || '').toUpperCase())
  ).length
  const exception = orders.filter((o) =>
    ['CANCELLED', 'FAILED', 'EXCEPTION', 'RETURNED'].includes(String(o.status || '').toUpperCase())
  ).length

  const delPct = total > 0 ? Math.round((delivered / total) * 100) : 0
  const transitPct = total > 0 ? Math.round((inTransit / total) * 100) : 0
  const procPct = total > 0 ? Math.round((processing / total) * 100) : 0
  const excPct = total > 0 ? Math.round((exception / total) * 100) : 0

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
      <CompactStatusCard
        icon={Box}
        color="indigo"
        label="Session lookups"
        value={total}
        subtext={total > 0 ? `${total} in session` : '0 in session'}
      />
      <CompactStatusCard
        icon={CheckCircle2}
        color="emerald"
        label="Delivered"
        value={delivered}
        subtext={total > 0 ? `${delPct}% completion` : '0% completion'}
      />
      <CompactStatusCard
        icon={Truck}
        color="cyan"
        label="In transit"
        value={inTransit}
        subtext={total > 0 ? `${transitPct}% of orders` : '0% of orders'}
      />
      <CompactStatusCard
        icon={Cog}
        color="purple"
        label="Processing"
        value={processing}
        subtext={total > 0 ? `${procPct}% of orders` : '0% of orders'}
      />
      <CompactStatusCard
        icon={AlertTriangle}
        color="rose"
        label="Exception"
        value={exception}
        subtext={total > 0 ? `${excPct}% of orders` : '0% of orders'}
      />
    </div>
  )
}
