// Shared motion presets: immediate responsive transitions without layout shift or jank.
export const ease = [0.22, 1, 0.36, 1]

export const container = (stagger = 0, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
})

export const item = {
  hidden: { opacity: 0.9 },
  show: { opacity: 1, transition: { duration: 0.12, ease } },
}

export const fade = {
  hidden: { opacity: 0.9 },
  show: { opacity: 1, transition: { duration: 0.12, ease } },
}
