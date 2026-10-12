import { Card, CardHeader } from '../ui/Card'
import StatusBadge from '../domain/StatusBadge'
import { formatCurrency, formatDateTime } from '../../lib/format'

function Field({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-xs sm:text-[13px]">
      <dt className="text-slate-400 font-medium">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-white">{children}</dd>
    </div>
  )
}

export default function DetailsList({ order }) {
  return (
    <Card reveal className="h-full">
      <CardHeader title="Details" />
      <dl className="divide-y divide-edge/60 px-5 py-1">
        <Field label="Order number"><span className="font-mono text-[12.5px] text-indigo-200">{order.orderNumber}</span></Field>
        <Field label="Status">{order.status ? <StatusBadge status={order.status} size="sm" /> : '—'}</Field>
        <Field label="Total amount"><span className="tabular-nums font-semibold">{formatCurrency(order.totalAmount)}</span></Field>
        <Field label="Payment method"><span className="text-slate-300">Card (•••• 4242)</span></Field>
        <Field label="Placed at">{formatDateTime(order.createdAt || order.updatedAt)}</Field>
      </dl>
    </Card>
  )
}

