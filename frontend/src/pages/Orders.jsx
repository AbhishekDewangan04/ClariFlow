import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  PackageOpen,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import CopyButton from '../components/ui/CopyButton'
import StatusBadge from '../components/domain/StatusBadge'
import CompactStatusRow from '../components/domain/CompactStatusRow'
import OrderTiles from '../components/order/OrderTiles'
import StatusTrack from '../components/order/StatusTrack'
import DetailsList from '../components/order/DetailsList'
import ActivityTimeline from '../components/order/ActivityTimeline'
import OrderStatusUpdater from '../components/order/OrderStatusUpdater'
import { useRecentOrders, recordOrderView } from '../hooks/useRecentOrders'
import { usePageTitle } from '../hooks/usePageTitle'
import { getOrder } from '../api/orders'
import { formatCurrency, formatRelative } from '../lib/format'
import { container } from '../lib/motion'

const FILTER_TABS = ['All', 'Processing', 'In transit', 'Delivered', 'Exception']

export default function Orders() {
  usePageTitle('Orders')
  const { orders } = useRecentOrders()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('All')
  const [selectedOrderNumber, setSelectedOrderNumber] = useState(null)
  const [loadingOrder, setLoadingOrder] = useState(false)
  const [lookupNotFound, setLookupNotFound] = useState(null)
  const [lookupError, setLookupError] = useState(null)

  // Auto-select first order if none selected
  useEffect(() => {
    if (!selectedOrderNumber && orders.length > 0) {
      setSelectedOrderNumber(orders[0].orderNumber)
    }
  }, [orders, selectedOrderNumber])

  // Look up order from real API
  async function fetchAndSelect(orderNum, { silent = false } = {}) {
    if (!orderNum) return
    const trimmed = orderNum.trim()
    if (!trimmed) return
    setLoadingOrder(true)
    setLookupError(null)
    setLookupNotFound(null)
    try {
      const fetched = await getOrder(trimmed)
      recordOrderView(fetched)
      setSelectedOrderNumber(fetched.orderNumber)
    } catch (err) {
      if (err?.kind === 'not_found' || err?.status === 404) {
        setLookupNotFound(trimmed)
        return
      }
      if (!silent) {
        setLookupError(err?.message || 'Order lookup failed')
      }
    } finally {
      setLoadingOrder(false)
    }
  }

  // Auto-load seeded demo order ORD-TEST-200 on mount if no order in session
  useEffect(() => {
    if (orders.length === 0) {
      fetchAndSelect('ORD-TEST-200', { silent: true })
    }
  }, [])

  function handleSearchSubmit(e) {
    e.preventDefault()
    const trimmed = searchQuery.trim()
    if (!trimmed) return
    fetchAndSelect(trimmed)
  }

  // Filter real orders by tab and query
  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase().trim()
    const matchesQuery =
      !q ||
      o.orderNumber?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.status?.toLowerCase().includes(q)

    if (!matchesQuery) return false

    if (activeTab === 'All') return true
    const st = String(o.status || '').toUpperCase()
    if (activeTab === 'Delivered') return st === 'DELIVERED' || st === 'COMPLETED'
    if (activeTab === 'In transit') return st === 'IN_TRANSIT' || st === 'SHIPPED'
    if (activeTab === 'Processing') return st === 'PROCESSING' || st === 'PLACED'
    if (activeTab === 'Exception') return st === 'CANCELLED' || st === 'FAILED' || st === 'EXCEPTION'
    return true
  })

  const selectedOrder = orders.find((o) => o.orderNumber === selectedOrderNumber) || orders[0] || null

  return (
    <motion.div variants={container(0.06)} initial="hidden" animate="show" className="space-y-6">
      {/* Top Header Card */}
      <Card liquid reveal className="p-6 sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div className="flex flex-wrap items-baseline gap-3.5">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">Order Lookup</h1>
            <p className="text-sm font-medium text-slate-400">
              On-demand order queries directly from PostgreSQL by order number.
            </p>
          </div>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-slate-500">
            Live PostgreSQL API
          </span>
        </div>

        {/* Demo order quick links */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Demo orders:</span>
          {[
            { id: 'ORD-TEST-200', label: 'Delivered' },
            { id: 'ORD-8821', label: 'In transit' },
            { id: 'ORD-4092', label: 'Processing' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => fetchAndSelect(id)}
              disabled={loadingOrder}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1 font-mono text-xs font-medium text-indigo-200 hover:bg-indigo-500/20 transition"
            >
              <span>{id}</span>
              <span className="text-[10px] text-slate-400 font-sans">({label})</span>
            </button>
          ))}
        </div>

        {/* 5 Compact Status Cards Row */}
        <div className="mt-6">
          <CompactStatusRow orders={orders} />
        </div>
      </Card>

      {/* Search & Filter Toolbar */}
      <Card liquid reveal className="p-3 sm:p-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search form with Find button inside */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xl">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order number (e.g. ORD-TEST-200, ORD-8821)…"
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-20 text-sm text-ink outline-none placeholder:text-slate-500 transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="submit"
              disabled={loadingOrder}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/30"
            >
              <Search className="size-3" />
              {loadingOrder ? 'Finding…' : 'Find'}
            </button>
          </form>

          {/* Filter Pills and Date Range */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1">
              {FILTER_TABS.map((tab) => {
                const isActive = activeTab === tab
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white shadow-[0_0_14px_rgba(99,102,241,0.5)]'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {tab}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.06] transition"
            >
              <Calendar className="size-3.5 text-slate-400" aria-hidden />
              Last 30 days
              <ChevronDown className="size-3.5 text-slate-400 ml-0.5" />
            </button>
          </div>
        </div>
      </Card>

      {/* Lookup Not Found Empty State Banner */}
      {lookupNotFound && (
        <Card liquid className="p-4 border-indigo-500/25 bg-indigo-950/20">
          <div className="flex items-start justify-between gap-3 text-slate-200">
            <div className="flex items-start gap-3">
              <PackageOpen className="size-5 shrink-0 text-indigo-400 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">No order found for “{lookupNotFound}”</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  No order matched this order number in PostgreSQL. Try one of the seeded test records:
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {['ORD-TEST-200', 'ORD-8821', 'ORD-4092'].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => fetchAndSelect(num)}
                      className="inline-flex items-center gap-1 rounded-md border border-indigo-400/30 bg-indigo-500/15 px-2.5 py-1 text-xs font-mono font-medium text-indigo-200 hover:bg-indigo-500/25 transition"
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLookupNotFound(null)}
              className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
              aria-label="Dismiss message"
            >
              <X className="size-4" />
            </button>
          </div>
        </Card>
      )}

      {/* Lookup Error Banner (actual network/database failures) */}
      {lookupError && (
        <Card liquid className="p-4 border-rose-500/30 bg-rose-950/20">
          <div className="flex items-start justify-between gap-3 text-rose-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-rose-200">Database lookup error</p>
                <p className="text-xs text-rose-300/80 mt-0.5">{lookupError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLookupError(null)}
              className="rounded-lg p-1 text-rose-400 hover:text-rose-200 hover:bg-rose-900/30 transition"
              aria-label="Dismiss error"
            >
              <X className="size-4" />
            </button>
          </div>
        </Card>
      )}

      {/* Main Split Layout: Left Table + Right Detail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Orders Table (~58%) */}
        <div className="lg:col-span-7 space-y-4">
          <Card liquid reveal className="overflow-hidden">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                  <PackageOpen className="size-6" />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-white">
                  {orders.length === 0 ? 'No orders loaded in session' : 'No matching orders'}
                </h3>
                <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                  {orders.length === 0
                    ? 'ClariFlow queries live PostgreSQL records on-demand via the backend API. Search for an order or try one of the seeded test records:'
                    : `No orders match "${searchQuery || activeTab}". Try adjusting your filters or search term.`}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {['ORD-TEST-200', 'ORD-8821', 'ORD-4092'].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => fetchAndSelect(num)}
                      disabled={loadingOrder}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-400/30 bg-indigo-500/15 px-3 py-1.5 text-xs font-mono font-medium text-indigo-200 hover:bg-indigo-500/25 transition shadow-[0_0_12px_rgba(99,102,241,0.25)]"
                    >
                      <Search className="size-3 text-indigo-300" />
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-edge/80 font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-400 bg-white/[0.02]">
                        <th scope="col" className="px-5 py-3 font-semibold">Order</th>
                        <th scope="col" className="px-3 py-3 font-semibold">Customer</th>
                        <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                        <th scope="col" className="px-3 py-3 text-right font-semibold">Total</th>
                        <th scope="col" className="px-3 py-3 font-semibold">Updated</th>
                        <th scope="col" className="w-10 px-3 py-3"><span className="sr-only">Select</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-edge/40">
                      {filteredOrders.map((o) => {
                        const isSelected = selectedOrder?.orderNumber === o.orderNumber
                        return (
                          <tr
                            key={o.orderNumber}
                            onClick={() => setSelectedOrderNumber(o.orderNumber)}
                            className={`group cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-gradient-to-r from-indigo-500/25 via-indigo-500/10 to-transparent border-l-2 border-indigo-400'
                                : 'hover:bg-white/[0.03]'
                            }`}
                          >
                            <td className="px-5 py-3.5">
                              <span
                                className={`inline-block font-mono text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
                                  isSelected
                                    ? 'bg-indigo-500/30 text-indigo-100 border border-indigo-400/60 shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                                    : 'bg-white/[0.04] text-indigo-200 border border-white/10 group-hover:border-indigo-400/40'
                                }`}
                              >
                                {o.orderNumber}
                              </span>
                            </td>
                            <td className="max-w-[10rem] truncate px-3 py-3.5 text-xs font-medium text-slate-200">
                              {o.customerName ?? '—'}
                            </td>
                            <td className="px-3 py-3.5">
                              <StatusBadge status={o.status} size="sm" />
                            </td>
                            <td className="px-3 py-3.5 text-right font-medium tabular-nums text-white text-xs">
                              {formatCurrency(o.totalAmount)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3.5 text-xs text-slate-400">
                              {formatRelative(o.viewedAt || o.updatedAt || o.createdAt)}
                            </td>
                            <td className="px-3 py-3.5 text-right text-slate-500 group-hover:text-slate-300">
                              <ChevronRight className={`size-4 transition-transform ${isSelected ? 'translate-x-1 text-cyan-300' : ''}`} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                <div className="flex flex-wrap items-center justify-between border-t border-edge/60 px-5 py-3.5 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled
                      aria-label="Previous page"
                      className="grid size-7 place-items-center rounded-lg border border-white/10 bg-white/[0.02] text-slate-500 opacity-60 cursor-not-allowed"
                    >
                      <ChevronLeft className="size-3.5" />
                    </button>
                    <span className="grid size-7 place-items-center rounded-lg bg-indigo-600 text-xs font-semibold text-white shadow-[0_0_8px_rgba(99,102,241,0.5)]">
                      1
                    </span>
                    <button
                      type="button"
                      disabled
                      aria-label="Next page"
                      className="grid size-7 place-items-center rounded-lg border border-white/10 bg-white/[0.02] text-slate-500 opacity-60 cursor-not-allowed"
                    >
                      <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                  <p className="font-mono text-[11px] text-slate-500">
                    Showing {filteredOrders.length} looked-up {filteredOrders.length === 1 ? 'order' : 'orders'} in this session
                  </p>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Right Column: Selected Order Details Panel (~42%) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedOrder ? (
            <motion.div variants={container(0.05)} className="space-y-4">
              {/* Order Header Card */}
              <Card liquid reveal className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-300 font-semibold block mb-1">
                      Order
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-white">
                        {selectedOrder.orderNumber}
                      </h2>
                      <StatusBadge status={selectedOrder.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CopyButton value={selectedOrder.orderNumber} label="Copy number" />
                    <button
                      type="button"
                      onClick={() => fetchAndSelect(selectedOrder.orderNumber)}
                      disabled={loadingOrder}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] transition"
                    >
                      <RefreshCw className={`size-3.5 ${loadingOrder ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* 3 Summary Cards */}
                <div className="mt-5">
                  <OrderTiles order={selectedOrder} />
                </div>
              </Card>

              {/* Order Status Action Controls */}
              <OrderStatusUpdater
                orderNumber={selectedOrder.orderNumber}
                currentStatus={selectedOrder.status}
                onUpdated={() => fetchAndSelect(selectedOrder.orderNumber, { silent: true })}
              />

              {/* Shipment Timeline Card */}
              <StatusTrack status={selectedOrder.status} order={selectedOrder} />

              {/* Two-Column Details and Activity */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailsList order={selectedOrder} />
                <ActivityTimeline order={selectedOrder} />
              </div>
            </motion.div>
          ) : (
            <Card liquid reveal className="p-8 text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-400">
                <Search className="size-6" />
              </div>
              <h3 className="mt-3 font-display text-base font-semibold text-white">No Order Selected</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-xs mx-auto">
                Search for an order number or choose a record from the table to view live shipment tracking and item details.
              </p>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  )
}

