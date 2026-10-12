import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Runs `fn(signal)` whenever `deps` change; `retry()` re-runs it.
 * On a retry for the same deps, the previous data is kept (status is 'loading' meanwhile),
 * so callers can show a refresh indicator instead of a blank skeleton.
 */
export function useAsync(fn, deps = []) {
  const fnRef = useRef(fn)
  useEffect(() => {
    fnRef.current = fn
  })

  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [attempt, setAttempt] = useState(0)
  const key = JSON.stringify(deps)
  const lastKey = useRef(key)

  useEffect(() => {
    const controller = new AbortController()
    const sameTarget = lastKey.current === key
    lastKey.current = key

    setState((prev) => ({ status: 'loading', data: sameTarget ? prev.data : null, error: null }))

    fnRef.current(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: 'success', data, error: null })
      },
      (error) => {
        if (!controller.signal.aborted) setState({ status: 'error', data: null, error })
      },
    )
    return () => controller.abort()
  }, [key, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, isRefreshing: state.status === 'loading' && state.data !== null, retry }
}
