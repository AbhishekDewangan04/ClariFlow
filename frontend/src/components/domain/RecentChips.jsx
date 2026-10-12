import { Link } from 'react-router-dom'
import { History } from 'lucide-react'
import { useRecentOrders } from '../../hooks/useRecentOrders'

/** Quick links to orders you've really opened on this device. Renders nothing when there are none. */
export default function RecentChips({ limit = 5 }) {
  const { orders } = useRecentOrders()
  if (orders.length === 0) return null
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs text-slate-400">
        <History className="size-3.5" aria-hidden /> Recent
      </span>
      {orders.slice(0, limit).map((o) => (
        <Link
          key={o.orderNumber}
          to={`/orders/${encodeURIComponent(o.orderNumber)}`}
          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-xs text-indigo-200 transition-colors hover:border-indigo-300/40 hover:bg-indigo-400/10 hover:text-white"
        >
          {o.orderNumber}
        </Link>
      ))}
    </div>
  )
}
