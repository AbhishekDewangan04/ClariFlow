import { useCallback, useEffect, useRef, useState } from 'react'

export function useCopy(resetMs = 1800) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = useCallback(
    async (text) => {
      try {
        await navigator.clipboard.writeText(String(text))
        setCopied(true)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setCopied(false), resetMs)
      } catch {
        setCopied(false)
      }
    },
    [resetMs],
  )
  return { copied, copy }
}
