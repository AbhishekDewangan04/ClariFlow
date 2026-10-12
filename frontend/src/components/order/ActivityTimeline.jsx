import { motion } from 'motion/react'
import { Card, CardHeader } from '../ui/Card'
import { ease } from '../../lib/motion'
import { formatDateTime } from '../../lib/format'

function ActivityItem({ color = 'indigo', title, time, detail, last = false }) {
  const dotColors = {
    emerald: 'bg-emerald-400 shadow-[0_0_10px_#10b981]',
    cyan: 'bg-cyan-400 shadow-[0_0_10px_#06b6d4]',
    indigo: 'bg-indigo-400 shadow-[0_0_10px_#6366f1]',
  }

  return (
    <li className="relative flex gap-3.5 pb-5 last:pb-0">
      {!last && (
        <span
          className="absolute left-[5px] top-3.5 h-[calc(100%-0.5rem)] w-px bg-white/10"
          aria-hidden
        />
      )}
      <span className={`relative mt-1.5 size-2.5 shrink-0 rounded-full ${dotColors[color] || dotColors.indigo}`} />
      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-[13px] font-semibold text-white">{title}</p>
        <p className="text-[11px] font-mono text-slate-400">{time}</p>
        {detail && <p className="mt-0.5 text-xs text-slate-300">{detail}</p>}
      </div>
    </li>
  )
}

export default function ActivityTimeline({ order }) {
  const isDelivered = String(order.status || '').toUpperCase() === 'DELIVERED'
  const isShipped = isDelivered || String(order.status || '').toUpperCase() === 'SHIPPED' || String(order.status || '').toUpperCase() === 'IN_TRANSIT'

  const createdTime = order.createdAt ? formatDateTime(order.createdAt) : 'Recently'
  const updatedTime = order.updatedAt ? formatDateTime(order.updatedAt) : createdTime

  return (
    <Card reveal className="h-full">
      <CardHeader title="Activity" />
      <div className="p-5">
        <ol className="space-y-1">
          {isDelivered && (
            <ActivityItem
              color="emerald"
              title="Delivered"
              time={updatedTime}
              detail="Package delivered to customer"
            />
          )}
          {isShipped && (
            <ActivityItem
              color="cyan"
              title="Out for delivery"
              time={updatedTime}
              detail="With local delivery courier"
            />
          )}
          <ActivityItem
            color="indigo"
            title="Order placed & confirmed"
            time={createdTime}
            detail="Order recorded in system"
            last
          />
        </ol>
      </div>
    </Card>
  )
}

