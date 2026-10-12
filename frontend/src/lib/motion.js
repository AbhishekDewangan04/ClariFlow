// Shared motion presets. Entrances only animate opacity + transform (cheap, GPU-friendly).
export const ease = [0.22, 1, 0.36, 1]

export const container = (stagger = 0.07, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
})

export const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
}

export const fade = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease } },
}
