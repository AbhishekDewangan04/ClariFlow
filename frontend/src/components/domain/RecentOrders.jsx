import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, X } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { formatCurrency, formatRelative } from '../../lib/format'

function RemoveButton({ order, onRemove }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onRemove(order.orderNumber)
      }}
      aria-label={`Remove ${order.orderNumber} from recent lookups`}
      className="grid size-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-white/[0.08] hover:text-slate-100"
    >
      <X className="size-4" aria-hidden />
    </button>
  )
}

/** Orders the user opened on this device. Values are snapshots from the moment each was viewed. */
export default function RecentOrders({ orders, onRemove }) {
  const navigate = useNavigate()
  const open = (o) => navigate(`/orders/${encodeURIComponent(o.orderNumber)}`)

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Recently opened orders</caption>
          <thead>
            <tr className="border-b border-edge font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-500">
              <th scope="col" className="px-6 py-3 font-medium">Order</th>
              <th scope="col" className="px-3 py-3 font-medium">Customer</th>
              <th scope="col" className="px-3 py-3 font-medium">Status</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">Total</th>
              <th scope="col" className="px-3 py-3 font-medium">Viewed</th>
              <th scope="col" className="w-12 px-3 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {orders.map((o) => (
              <tr key={o.orderNumber} onClick={() => open(o)} className="group cursor-pointer transition-colors hover:bg-white/[0.04]">
                <td className="px-6 py-3.5">
                  <Link
                    to={`/orders/${encodeURIComponent(o.orderNumber)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-block font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-white/[0.04] text-indigo-200 border border-indigo-400/20 transition-colors group-hover:text-cyan-200 group-hover:border-indigo-400/40"
                  >
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="max-w-[12rem] truncate px-3 py-3.5 text-slate-300">{o.customerName ?? '—'}</td>
                <td className="px-3 py-3.5"><StatusBadge status={o.status} size="sm" /></td>
                <td className="px-3 py-3.5 text-right tabular-nums text-ink">{formatCurrency(o.totalAmount)}</td>
                <td className="whitespace-nowrap px-3 py-3.5 text-slate-400">{formatRelative(o.viewedAt)}</td>
                <td className="px-3 py-2.5 text-right"><RemoveButton order={o} onRemove={onRemove} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-edge md:hidden">
        {orders.map((o) => (
          <li key={o.orderNumber} className="flex items-center gap-1 pr-2">
            <Link to={`/orders/${encodeURIComponent(o.orderNumber)}`} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-mono text-[13px] font-medium text-indigo-200">{o.orderNumber}</span>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-ink">{formatCurrency(o.totalAmount)}</span>
                </div>
                <div className="mt-0.5 truncate text-[13px] text-slate-400">{o.customerName ?? '—'}</div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <StatusBadge status={o.status} size="sm" />
                  <span className="text-xs text-slate-500">{formatRelative(o.viewedAt)}</span>
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-slate-600" aria-hidden />
            </Link>
            <RemoveButton order={o} onRemove={onRemove} />
          </li>
        ))}
      </ul>
    </>
  )
}
