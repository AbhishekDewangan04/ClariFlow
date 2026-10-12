import { useEffect, useRef } from 'react'
import { createLiquidGlass, isLiquidGLSupported } from '../lib/liquidGL.js'

/**
 * React hook to mount Apple-style liquid glass refraction onto an element.
 * Safely handles React lifecycles, route changes, reduced motion, and WebGL/WebGPU cleanup.
 *
 * @param {import('react').RefObject<HTMLElement>|string} targetRefOrSelector
 * @param {'nav'|'search'|'hero'|'card'|'control'} [preset='card']
 * @param {object} [options={}]
 */
export function useLiquidGlass(targetRefOrSelector, preset = 'card', options = {}) {
  const cleanupRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    if (!isLiquidGLSupported()) return

    // Small delay to allow layout and CSS paints to settle before snapshot
    const timer = setTimeout(async () => {
      if (cancelled) return

      const target =
        typeof targetRefOrSelector === 'string'
          ? targetRefOrSelector
          : targetRefOrSelector?.current

      if (!target) return

      const handle = await createLiquidGlass(target, preset, options)
      if (cancelled) {
        handle?.destroy?.()
      } else {
        cleanupRef.current = handle
      }
    }, 60)

    return () => {
      cancelled = true
      clearTimeout(timer)
      if (cleanupRef.current) {
        cleanupRef.current.destroy?.()
        cleanupRef.current = null
      }
    }
  }, [preset])
}
