import { Card } from '../ui/Card'
import Skeleton from '../ui/Skeleton'

/** Mirrors the loaded layout so nothing jumps when data arrives. A scan line signals "locating". */
export default function OrderSkeleton({ orderNumber }) {
  return (
    <div role="status" aria-busy="true" aria-label={`Loading order ${orderNumber}`}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">Locating order…</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="relative overflow-hidden p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-5 h-8 w-32" />
            {i === 0 && <span className="absolute inset-x-0 top-0 h-10 animate-scan bg-gradient-to-b from-transparent via-indigo-400/20 to-transparent" aria-hidden />}
          </Card>
        ))}
      </div>
      <Card className="mt-6 p-6">
        <Skeleton className="h-16 w-full" />
      </Card>
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="space-y-4 p-6 lg:col-span-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </Card>
        <Card className="space-y-4 p-6 lg:col-span-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-2/3" />
        </Card>
      </div>
    </div>
  )
}
