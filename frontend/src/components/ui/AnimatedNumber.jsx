import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'motion/react'

/** Counts up to `value` (from the previous value, or 0 on first paint). Static under reduced motion. */
export default function AnimatedNumber({ value, format = (n) => String(Math.round(n)), duration = 0.9 }) {
  const reduce = useReducedMotion()
  const target = Number(value)
  const numeric = Number.isFinite(target)
  const from = useRef(0)
  const [shown, setShown] = useState(reduce || !numeric ? target : 0)

  useEffect(() => {
    if (reduce || !numeric) {
      setShown(target)
      from.current = target
      return
    }
    const controls = animate(from.current, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setShown,
      onComplete: () => {
        from.current = target
      },
    })
    return () => controls.stop()
  }, [target, numeric, reduce, duration])

  return <>{numeric ? format(shown) : String(value)}</>
}
