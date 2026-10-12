import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getHealth } from '../api/health'
import { env } from '../config/env'

const BackendStatusContext = createContext(null)

/** One shared poller for GET / so the sidebar, top bar and Overview always agree. */
export function BackendStatusProvider({ children }) {
  const [state, setState] = useState({
    phase: 'checking', // 'checking' | 'online' | 'offline'
    latencyMs: null,
    message: null,
    checkedAt: null,
    error: null,
    refreshing: true,
    history: [], // real measured checks from this session: { at, latencyMs }
  })
  const controllerRef = useRef(null)

  const check = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setState((s) => ({ ...s, refreshing: true }))
    try {
      const h = await getHealth({ signal: controller.signal })
      if (controller.signal.aborted) return
      setState((s) => ({
        phase: 'online',
        latencyMs: h.latencyMs,
        message: h.message,
        checkedAt: h.checkedAt,
        error: null,
        refreshing: false,
        history: [...s.history, { at: h.checkedAt, latencyMs: h.latencyMs }].slice(-24),
      }))
    } catch (error) {
      if (controller.signal.aborted) return
      setState((s) => ({ ...s, phase: 'offline', latencyMs: null, error, checkedAt: new Date().toISOString(), refreshing: false }))
    }
  }, [])

  useEffect(() => {
    check()
    const tick = () => document.visibilityState === 'visible' && check()
    const id = setInterval(tick, env.healthPollMs)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('online', check)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('online', check)
      controllerRef.current?.abort()
    }
  }, [check])

  const value = useMemo(() => ({ ...state, refresh: check }), [state, check])
  return <BackendStatusContext.Provider value={value}>{children}</BackendStatusContext.Provider>
}

export function useBackendStatus() {
  const ctx = useContext(BackendStatusContext)
  if (!ctx) throw new Error('useBackendStatus must be used inside <BackendStatusProvider>')
  return ctx
}
