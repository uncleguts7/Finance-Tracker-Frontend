import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import { api, setUnauthorizedHandler } from '@/lib/api'
import {
  clearToken,
  getToken,
  setToken,
  setUser as persistUser,
  type User,
} from '@/lib/auth'
import { queryClient } from '@/lib/queryClient'

export interface AuthContextValue {
  user: User | null
  loading: boolean // true during initial hydration
  login: (email: string, password: string) => Promise<void>
  register: (
    name: string,
    email: string,
    password: string,
    password_confirmation: string,
  ) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setAuthenticatedUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Wire the API client's 401 response interceptor to React state + router.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthenticatedUser(null)
      navigate('/login', { replace: true })
    })
    return () => setUnauthorizedHandler(null)
  }, [navigate])

  // Hydration on mount: if a token is present, always validate it via GET /user.
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }

    let cancelled = false
    api
      .getUser()
      .then((freshUser) => {
        if (cancelled) return
        setAuthenticatedUser(freshUser)
        persistUser(freshUser)
      })
      .catch(() => {
        // 401 already cleared the token in the interceptor; other errors leave it
        // for a retry on the next reload. Either way this session is unauthenticated.
        if (!cancelled) setAuthenticatedUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api.login({ email, password })
      setToken(data.token)
      persistUser({ id: data.id, name: data.name, email: data.email })
      setAuthenticatedUser({ id: data.id, name: data.name, email: data.email })
      navigate('/')
    },
    [navigate],
  )

  const register = useCallback(
    async (name: string, email: string, password: string, password_confirmation: string) => {
      const data = await api.register({ name, email, password, password_confirmation })
      setToken(data.token)
      persistUser({ id: data.id, name: data.name, email: data.email })
      setAuthenticatedUser({ id: data.id, name: data.name, email: data.email })
      navigate('/')
    },
    [navigate],
  )

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // Token may already be invalid; local state must still be cleared.
    }
    clearToken()
    setAuthenticatedUser(null)
    queryClient.clear()
    navigate('/login', { replace: true })
  }, [navigate])

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}