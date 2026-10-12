import { Card } from '../ui/Card'
import Skeleton from '../ui/Skeleton'
import SourceTag from '../ui/SourceTag'

export default function StatCard({ label, value, hint, icon: Icon, source = 'live', loading = false, valueClass = '' }) {
  return (
    <Card liquid interactive reveal className="relative overflow-hidden p-5">
      <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/50 to-transparent" aria-hidden />
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5 text-[13px] font-medium text-slate-300">
          {Icon && (
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500/25 to-cyan-400/10 text-indigo-200 ring-1 ring-inset ring-white/10">
              <Icon className="size-4" aria-hidden />
            </span>
          )}
          <span className="truncate">{label}</span>
        </div>
        <SourceTag kind={source} />
      </div>
      <div className="mt-5">
        {loading ? (
          <Skeleton className="h-9 w-28" />
        ) : (
          <div className={`font-display text-[30px] font-semibold leading-none tracking-tight tabular-nums text-ink ${valueClass}`}>{value}</div>
        )}
        {hint && <p className="mt-2.5 truncate text-[13px] text-slate-400">{hint}</p>}
      </div>
    </Card>
  )
}
