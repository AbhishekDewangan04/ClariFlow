import { useEffect } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'

/** Fixed atmospheric backdrop: drifting indigo/cyan light + grid, with gentle pointer parallax. */
export default function AuroraBackground() {
  const reduce = useReducedMotion()
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 40, damping: 22 })
  const sy = useSpring(py, { stiffness: 40, damping: 22 })
  const ax = useTransform(sx, (v) => v * -34)
  const ay = useTransform(sy, (v) => v * -26)
  const bx = useTransform(sx, (v) => v * 42)
  const by = useTransform(sy, (v) => v * 30)

  useEffect(() => {
    if (reduce) return
    const onMove = (e) => {
      px.set(e.clientX / window.innerWidth - 0.5)
      py.set(e.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [reduce, px, py])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-void">
      {/* Ambient background glows */}
      <motion.div style={{ x: ax, y: ay }} className="absolute -left-40 -top-40 size-[54rem]">
        <div className="size-full animate-drift-a rounded-full bg-[radial-gradient(closest-side,rgb(99_102_241/0.25),rgb(79_70_229/0.08)_55%,transparent)]" />
      </motion.div>
      <motion.div style={{ x: bx, y: by }} className="absolute -right-40 top-0 size-[48rem]">
        <div className="size-full animate-drift-b rounded-full bg-[radial-gradient(closest-side,rgb(6_182_212/0.18),rgb(34_211_238/0.05)_55%,transparent)]" />
      </motion.div>
      <div className="absolute right-1/4 top-1/3 size-96 rounded-full bg-[radial-gradient(closest-side,rgb(168_85_247/0.12),transparent)] blur-3xl" />
      
      {/* Subtle vertical light streaks simulating reference cyberpunk bokeh */}
      <div className="absolute inset-y-0 right-12 w-64 bg-gradient-to-b from-cyan-500/[0.04] via-indigo-500/[0.03] to-transparent blur-2xl" />
      <div className="absolute inset-y-0 left-1/3 w-72 bg-gradient-to-b from-indigo-500/[0.03] via-transparent to-cyan-500/[0.02] blur-3xl" />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-grid opacity-80" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
    </div>
  )
}

