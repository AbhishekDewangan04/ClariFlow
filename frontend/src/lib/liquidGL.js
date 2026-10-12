/**
 * ClariFlow LiquidGL Integration Manager
 * Connects genuine WebGPU/WebGL liquidGL refraction with automatic CSS fallback.
 * Preserves ClariFlow's dark navy, violet, and cyan aesthetic.
 */

export const CLARIFLOW_LIQUID_PRESETS = {
  nav: {
    refraction: 0.012,
    bevelDepth: 0.05,
    bevelWidth: 0.1,
    frost: 1.5,
    aberration: 0.006,
    specular: true,
    shadow: true,
    tint: 'rgba(7, 11, 22, 0.52)',
    interaction: 'fluid',
    interactionStrength: 0.25,
    interactionRadius: 0.25,
    interactionViscosity: 0.65,
    tilt: false, // Nav remains stable on desktop
  },
  search: {
    refraction: 0.015,
    bevelDepth: 0.06,
    bevelWidth: 0.12,
    frost: 1.0,
    aberration: 0.008,
    specular: true,
    shadow: false,
    tint: 'rgba(15, 23, 42, 0.45)',
    interaction: 'fluid',
    interactionStrength: 0.3,
    tilt: false,
  },
  hero: {
    refraction: 0.018,
    bevelDepth: 0.08,
    bevelWidth: 0.14,
    frost: 1.5,
    aberration: 0.01,
    specular: true,
    shadow: true,
    tint: 'rgba(7, 11, 22, 0.4)',
    interaction: 'fluid',
    interactionStrength: 0.35,
    interactionRadius: 0.35,
    interactionViscosity: 0.6,
    tilt: false,
  },
  card: {
    refraction: 0.014,
    bevelDepth: 0.06,
    bevelWidth: 0.12,
    frost: 1.2,
    aberration: 0.007,
    specular: true,
    shadow: true,
    tint: 'rgba(10, 15, 30, 0.45)',
    interaction: 'fluid',
    interactionStrength: 0.3,
    tilt: false,
  },
  control: {
    refraction: 0.016,
    bevelDepth: 0.07,
    bevelWidth: 0.14,
    frost: 1.5,
    aberration: 0.008,
    specular: true,
    shadow: true,
    tint: 'rgba(7, 11, 22, 0.6)',
    interaction: 'fluid',
    interactionStrength: 0.35,
    tilt: false,
  },
}

/** Check if liquidGL can and should run in this environment */
export function isLiquidGLSupported() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return false
  if (navigator.connection?.saveData) return false

  // Detect WebGPU or WebGL context support
  try {
    if ('gpu' in navigator) return true
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    const ok = Boolean(gl)
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return ok
  } catch {
    return false
  }
}

/** Registry of active lens instances to prevent duplicate initializations */
const activeLenses = new Map()

/**
 * Initialize liquidGL on target element(s) with ClariFlow styling presets.
 * Returns a cleanup function that calls lens.destroy().
 */
export async function createLiquidGlass(target, presetName = 'card', customOptions = {}) {
  if (!isLiquidGLSupported()) return null
  if (!target) return null

  // Ensure element exists in DOM
  const el = typeof target === 'string' ? document.querySelector(target) : target
  if (!el) return null

  // Avoid duplicate registration on the same element
  if (activeLenses.has(el)) {
    return activeLenses.get(el)
  }

  try {
    const { default: liquidGL } = await import('liquid-gl')
    if (typeof liquidGL !== 'function') return null

    const preset = CLARIFLOW_LIQUID_PRESETS[presetName] ?? CLARIFLOW_LIQUID_PRESETS.card
    const config = {
      target: el,
      engine: 'auto',
      resolution: window.devicePixelRatio > 1.5 ? 1.5 : 2.0,
      ...preset,
      ...customOptions,
    }

    const lens = liquidGL(config)
    if (lens) {
      activeLenses.set(el, lens)
      return {
        lens,
        destroy: () => {
          try {
            lens.destroy?.()
          } catch (e) {
            console.warn('liquidGL destroy warning:', e)
          }
          activeLenses.delete(el)
        },
      }
    }
  } catch (err) {
    console.warn('liquidGL initialization fell back to CSS glass:', err)
  }

  return null
}
