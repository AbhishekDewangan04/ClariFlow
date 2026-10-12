import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, PackageSearch, RefreshCw, Search } from 'lucide-react'
import { getOrder } from '../api/orders'
import { useAsync } from '../hooks/useAsync'
import { recordOrderView } from '../hooks/useRecentOrders'
import { usePageTitle } from '../hooks/usePageTitle'
import { Card } from '../components/ui/Card'
import Button from '../components/ui/Button'
import CopyButton from '../components/ui/CopyButton'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import SourceTag from '../components/ui/SourceTag'
import StatusBadge from '../components/domain/StatusBadge'
import OrderSkeleton from '../components/order/OrderSkeleton'
import OrderTiles from '../components/order/OrderTiles'
import StatusTrack from '../components/order/StatusTrack'
import DetailsList from '../components/order/DetailsList'
import ActivityTimeline from '../components/order/ActivityTimeline'
import { container, item } from '../lib/motion'
import { formatRelative } from '../lib/format'

function BackLink() {
  return (
    <Link to="/orders" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white">
      <ArrowLeft className="size-4" aria-hidden /> Orders
    </Link>
  )
}

export default function OrderDetail() {
  const { orderNumber } = useParams()
  usePageTitle(`Order ${orderNumber}`)

  const { status, data, error, retry, isRefreshing } = useAsync(
    async (signal) => {
      try {
        const order = await getOrder(orderNumber, { signal })
        return { order, notFound: false, fetchedAt: new Date().toISOString() }
      } catch (err) {
        if (err?.kind === 'not_found' || err?.status === 404) {
          return { order: null, notFound: true, fetchedAt: new Date().toISOString() }
        }
        throw err
      }
    },
    [orderNumber],
  )
  const order = data?.order

  useEffect(() => {
    if (order) recordOrderView(order)
  }, [order])

  if (data?.notFound) {
    return (
      <>
        <BackLink />
        <Card liquid reveal className="p-8">
          <EmptyState
            icon={PackageSearch}
            title={`No order found for “${orderNumber}”`}
            description="No order matching this ID was found in the database. Double-check the number or try one of the seeded demo orders."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button as={Link} to="/orders" size="sm" icon={Search}>
                  Back to Orders
                </Button>
                {['ORD-TEST-200', 'ORD-8821', 'ORD-4092'].map((num) => (
                  <Button key={num} as={Link} to={`/orders/${num}`} variant="secondary" size="sm" className="font-mono text-xs">
                    {num}
                  </Button>
                ))}
              </div>
            }
          />
        </Card>
      </>
    )
  }

  if (status === 'error') {
    return (
      <>
        <BackLink />
        <Card reveal>
          <ErrorState
            error={error}
            onRetry={retry}
            retrying={isRefreshing}
          />
        </Card>
      </>
    )
  }

  if (!order) {
    return (
      <>
        <BackLink />
        <OrderSkeleton orderNumber={orderNumber} />
      </>
    )
  }

  return (
    <motion.div variants={container(0.08)} initial="hidden" animate="show">
      <BackLink />

      <motion.header variants={item} className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-indigo-300">Order</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="break-all font-mono text-2xl font-semibold tracking-tight text-ink sm:text-[32px]">{order.orderNumber}</h1>
            <StatusBadge status={order.status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton value={order.orderNumber} label="Copy number" />
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={retry} loading={isRefreshing}>
            Refresh
          </Button>
        </div>
      </motion.header>

      <OrderTiles order={order} />
      <div className="mt-6">
        <StatusTrack status={order.status} order={order} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <DetailsList order={order} />
        <ActivityTimeline order={order} />
      </div>

      <motion.p variants={item} className="mt-6 flex flex-wrap items-center gap-2 text-[13px] text-slate-400" aria-live="polite">
        <SourceTag kind="live" />
        Fetched from the API {formatRelative(data.fetchedAt)}
      </motion.p>
    </motion.div>
  )
}
