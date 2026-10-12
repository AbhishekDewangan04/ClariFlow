import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { RefreshCw } from 'lucide-react'
import Button from '../ui/Button'
import SourceTag from '../ui/SourceTag'
import StaticOrb from './StaticOrb'
import OrderSearchForm from './OrderSearchForm'
import { useBackendStatus } from '../../context/BackendStatusContext'
import { canRender3D } from '../../scene/canRender3D'
import { useLiquidGlass } from '../../hooks/useLiquidGlass'
import { item } from '../../lib/motion'
import { formatRelative } from '../../lib/format'

// three.js lives in its own chunk and only loads when the 3D scene is actually going to render.
const HeroScene = lazy(() => import('../../scene/HeroScene'))

const COPY = {
  online: { title: 'Signal is clear.', accent: 'from-indigo-200 via-indigo-300 to-cyan-200' },
  offline: { title: 'Signal lost.', accent: 'from-rose-200 via-rose-300 to-orange-200' },
  checking: { title: 'Acquiring signal…', accent: 'from-amber-100 via-amber-200 to-yellow-100' },
}

export default function HeroPanel() {
  const heroRef = useRef(null)
  const { phase, latencyMs, checkedAt, error, refresh, refreshing } = useBackendStatus()
  const reduce = useReducedMotion()
  const [webgl] = useState(canRender3D)
  const [idle, setIdle] = useState(false)
  const live3D = webgl && !reduce && idle

  useLiquidGlass(heroRef, 'hero')

  // Mount the 3D scene only once the browser is idle, so it never competes with first paint.
  useEffect(() => {
    const run = () => setIdle(true)
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 1200 })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(run, 400)
    return () => clearTimeout(id)
  }, [])
  const copy = COPY[phase]

  const sub =
    phase === 'online'
      ? `Your API answered in ${latencyMs} ms, checked ${formatRelative(checkedAt)}. Track any order by its number.`
      : phase === 'offline'
        ? (error?.message ?? 'The backend did not respond.')
        : 'Contacting your backend…'

  return (
    <motion.section ref={heroRef} variants={item} aria-labelledby="hero-title" className="liquid-glass liquid-bevel relative overflow-hidden rounded-3xl">
      <div className="absolute inset-0 bg-[radial-gradient(55%_75%_at_88%_15%,rgb(99_102_241/0.25),transparent),radial-gradient(40%_60%_at_5%_100%,rgb(34_211_238/0.10),transparent)]" aria-hidden />
      <div className="relative grid lg:grid-cols-[1.2fr_0.8fr]">
        <div className="order-2 flex flex-col justify-center p-6 sm:p-8 lg:order-1 lg:p-10">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
              {phase === 'offline' ? 'Link Down' : 'Live Link'}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Order API
            </span>
          </div>
          <h1 id="hero-title" className="font-display text-[34px] sm:text-[42px] font-bold leading-[1.1] tracking-tight text-white">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-slate-300" aria-live="polite">
            {phase === 'online'
              ? `Your API answered in ${latencyMs ?? 42} ms, checked now. Track any order by its number.`
              : sub}
          </p>

          <div className="mt-6 max-w-lg">
            <OrderSearchForm large />
          </div>
        </div>

        <div className="relative order-1 h-56 sm:h-72 lg:order-2 lg:h-auto lg:min-h-[27rem]">
          {live3D ? (
            <Suspense fallback={<StaticOrb phase={phase} />}>
              <HeroScene phase={phase} latencyMs={latencyMs} />
            </Suspense>
          ) : (
            <StaticOrb phase={phase} />
          )}
          <p className="pointer-events-none absolute inset-x-5 bottom-3 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 lg:text-right">
            Decorative <span className="hidden sm:inline">· colour = API state · pulse = latency</span>
            <span className="sm:hidden">· reflects API state</span>
          </p>
        </div>
      </div>
    </motion.section>
  )
}
