import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api, { setUnauthorizedHandler } from '../services/api'
import { connectSocket, disconnectSocket } from '../lib/socket'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('fh_token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  function applySession(nextToken, nextUser) {
    if (nextToken) localStorage.setItem('fh_token', nextToken)
    setToken(nextToken)
    if (nextUser) setUser(nextUser)
  }

  function clearSession() {
    localStorage.removeItem('fh_token')
    setToken(null)
    setUser(null)
    disconnectSocket()
  }

  useEffect(() => {
    setUnauthorizedHandler(() => clearSession())
    return () => setUnauthorizedHandler(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data } = await api.get('/auth/me')
        if (!cancelled) {
          setUser(data.user)
          connectSocket(localStorage.getItem('fh_token'))
        }
      } catch {
        if (!cancelled) clearSession()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token])

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      setUser,
      login: (nextToken, nextUser) => {
        applySession(nextToken, nextUser)
        connectSocket(nextToken)
      },
      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {
          // already expired
        }
        clearSession()
      },
    }),
    [user, token, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
