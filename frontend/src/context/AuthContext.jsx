import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getMe, logout as apiLogout } from '../api/auth.js'

/**
 * @typedef {{ id: number, email: string, name: string, role: 'admin'|'manager'|'staff' }} User
 *
 * @typedef {{ user: User|null, loading: boolean, login: (user: User) => void, logout: () => Promise<void>, can: (action: string) => boolean }} AuthCtx
 */

const AuthContext = createContext(/** @type {AuthCtx} */ (null))

/**
 * Role-based capability map.
 * Actions: 'read_orders' | 'update_status' | 'cancel_order' | 'manage_users'
 */
const CAPS = {
  admin:   ['read_orders', 'update_status', 'cancel_order', 'manage_users'],
  manager: ['read_orders', 'update_status', 'cancel_order'],
  staff:   ['read_orders', 'update_status'],
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('cf_user')
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true) // true while verifying cookie on mount

  // On mount, try to restore the session from the cookie.
  useEffect(() => {
    let isMounted = true
    getMe()
      .then((data) => {
        if (isMounted) {
          const u = data?.user || null
          setUser(u)
          try {
            if (u) localStorage.setItem('cf_user', JSON.stringify(u))
            else localStorage.removeItem('cf_user')
          } catch {}
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null)
          try {
            localStorage.removeItem('cf_user')
          } catch {}
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback((userData) => {
    setUser(userData)
    try {
      if (userData) localStorage.setItem('cf_user', JSON.stringify(userData))
    } catch {}
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      // Even if the server call fails, clear local state.
    }
    setUser(null)
    try {
      localStorage.removeItem('cf_user')
    } catch {}
  }, [])

  /**
   * Returns true if the current user has the given capability.
   * @param {string} action
   */
  const can = useCallback(
    (action) => {
      if (!user) return false
      return (CAPS[user.role] || []).includes(action)
    },
    [user]
  )

  const updateUser = useCallback((updatedData) => {
    setUser((prev) => {
      if (!prev) return null
      const next = { ...prev, ...updatedData }
      try {
        localStorage.setItem('cf_user', JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
