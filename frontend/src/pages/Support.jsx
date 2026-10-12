import { useState } from 'react'
import { motion } from 'motion/react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageCircle,
  MessageSquare,
  Paperclip,
  Send,
  SlidersHorizontal,
  Smile,
  User,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { CompactStatusCard } from '../components/domain/CompactStatusRow'
import { usePageTitle } from '../hooks/usePageTitle'
import { container } from '../lib/motion'

const SUPPORT_TABS = ['All', 'Open', 'Resolved', 'Unassigned']

export default function Support() {
  usePageTitle('Support')
  const [activeTab, setActiveTab] = useState('All')

  return (
    <motion.div variants={container(0.06)} initial="hidden" animate="show" className="space-y-6">
      {/* Header with Preview Box on Right */}
      <Card liquid reveal className="p-6 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-baseline gap-3.5">
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">Support</h1>
              <p className="text-sm font-medium text-slate-400">
                Conversations and Telegram status will be available here once backend support is enabled.
              </p>
            </div>
          </div>

          {/* Yellow Preview Banner Box matching Image 2 */}
          <div className="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/[0.08] p-3 sm:px-4 sm:py-3 shadow-[0_0_20px_rgba(245,158,11,0.12)] max-w-md">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-amber-400/40 bg-amber-400/15 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
              <AlertTriangle className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-amber-200">This page is a preview.</span>
                <span className="rounded-full border border-amber-400/50 bg-amber-400/20 px-1.5 py-0.2 font-mono text-[8.5px] font-bold uppercase tracking-wider text-amber-300">
                  Preview
                </span>
              </div>
              <p className="mt-0.5 text-[11px] leading-tight text-amber-200/70">
                The backend currently does not provide conversation data or Telegram integration.
              </p>
            </div>
          </div>
        </div>

        {/* 5 Support Metric Cards in One Row */}
        <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          <CompactStatusCard
            icon={MessageSquare}
            color="purple"
            label="Total conversations"
            value={0}
            subtext="No data yet"
          />
          <CompactStatusCard
            icon={CheckCircle2}
            color="emerald"
            label="Open"
            value={0}
            subtext="Waiting for backend"
          />
          <CompactStatusCard
            icon={MessageCircle}
            color="cyan"
            label="Resolved"
            value={0}
            subtext="Waiting for backend"
          />
          <CompactStatusCard
            icon={Clock}
            color="purple"
            label="Avg. response time"
            value="—"
            subtext="No data yet"
          />
          <CompactStatusCard
            icon={User}
            color="rose"
            label="Active users"
            value={0}
            subtext="No data yet"
          />
        </div>
      </Card>

      {/* Main Support Split Area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Conversations List (~40%) */}
        <div className="lg:col-span-5 space-y-4">
          <Card liquid reveal className="overflow-hidden p-4 sm:p-5 flex flex-col min-h-[32rem]">
            {/* Search conversations */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <MessageSquare className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <input
                  disabled
                  placeholder="Search conversations (coming soon)…"
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3 text-xs text-slate-300 outline-none placeholder:text-slate-500 cursor-not-allowed"
                />
              </div>
              <button
                type="button"
                aria-label="Filter options"
                className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] transition"
              >
                <SlidersHorizontal className="size-4" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="mt-3 flex items-center gap-1.5 border-b border-edge/60 pb-3">
              {SUPPORT_TABS.map((tab) => {
                const isActive = activeTab === tab
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {tab}
                  </button>
                )
              })}
            </div>

            {/* Empty State Body matching Image 2 */}
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="relative mb-5 flex size-16 items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-500/10 text-cyan-300 shadow-[0_0_24px_rgba(6,182,212,0.35)]">
                <MessageSquare className="size-8" />
                <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-lg border border-indigo-400/50 bg-indigo-600/40 text-indigo-200">
                  <MessageCircle className="size-3.5" />
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-white">No conversations available</h3>
              <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-slate-400">
                Conversation history will appear here once the backend provides support data from Telegram.
              </p>
            </div>
          </Card>
        </div>

        {/* Right Column: Selected Conversation View (~60%) */}
        <div className="lg:col-span-7 space-y-4">
          <Card liquid reveal className="overflow-hidden p-5 sm:p-6 flex flex-col min-h-[32rem]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-edge/60 pb-4">
              <div>
                <h2 className="font-display text-base font-bold tracking-tight text-white">Select a conversation</h2>
                <p className="mt-0.5 text-xs text-slate-400">Choose a conversation from the list to view the messages.</p>
              </div>
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs font-semibold text-slate-400 opacity-60 cursor-not-allowed"
              >
                <span>✓</span>
                Mark as resolved
              </button>
            </div>

            {/* Deep Message Inset Card matching Image 2 */}
            <div className="mt-4 flex-1 rounded-2xl border border-white/10 bg-gradient-to-b from-indigo-950/20 via-void/50 to-void/70 p-8 flex flex-col items-center justify-center text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
              <div className="mb-5 grid size-20 place-items-center rounded-full bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 text-white shadow-[0_0_32px_rgba(34,211,238,0.45)] ring-2 ring-white/20">
                <Send className="size-8 -rotate-12 translate-x-0.5" />
              </div>
              <h3 className="font-display text-base font-bold text-white">No conversation selected</h3>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-400">
                Conversation messages, customer details and order context will be shown here once the backend integration is enabled.
              </p>
            </div>

            {/* Disabled Chat Bar at Bottom */}
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 pl-3">
              <input
                disabled
                placeholder="Type a message… (coming soon)"
                className="flex-1 bg-transparent text-xs text-slate-400 outline-none placeholder:text-slate-500 cursor-not-allowed"
              />
              <button
                type="button"
                disabled
                className="grid size-8 place-items-center rounded-lg text-slate-500 hover:text-slate-300"
              >
                <Paperclip className="size-4" />
              </button>
              <button
                type="button"
                disabled
                className="grid size-8 place-items-center rounded-lg text-slate-500 hover:text-slate-300"
              >
                <Smile className="size-4" />
              </button>
              <button
                type="button"
                disabled
                className="grid size-8 place-items-center rounded-lg bg-indigo-500/30 text-indigo-200 shadow-[0_0_10px_rgba(99,102,241,0.3)] cursor-not-allowed"
              >
                <Send className="size-4" />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
