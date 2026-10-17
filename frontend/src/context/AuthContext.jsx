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
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // true while verifying cookie on mount

  // On mount, try to restore the session from the cookie.
  useEffect(() => {
    getMe()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback((userData) => {
    setUser(userData)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      // Even if the server call fails, clear local state.
    }
    setUser(null)
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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
