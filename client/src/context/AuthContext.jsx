import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { connectSocket, disconnectSocket } from '../lib/socket'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('fh_token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) {
        setUser(null)
        setLoading(false)
        disconnectSocket()
        return
      }
      try {
        const { data } = await api.get('/auth/me')
        if (!cancelled) {
          setUser(data.user)
          connectSocket(token)
        }
      } catch {
        localStorage.removeItem('fh_token')
        if (!cancelled) {
          setToken(null)
          setUser(null)
        }
        disconnectSocket()
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
        localStorage.setItem('fh_token', nextToken)
        setToken(nextToken)
        setUser(nextUser)
      },
      logout: () => {
        localStorage.removeItem('fh_token')
        setToken(null)
        setUser(null)
        disconnectSocket()
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
