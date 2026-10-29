import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../utils/api'

interface AuthContextType {
  token: string | null
  user: any
  login: (username: string, password: string) => Promise<any>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'))
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    if (token) {
      api.get('/users/me/').then(res => setUser(res.data)).catch(() => logout())
    }
  }, [token])

  const login = async (username: string, password: string) => {
    const res = await api.post('/token/', { username, password })
    localStorage.setItem('access_token', res.data.access)
    localStorage.setItem('refresh_token', res.data.refresh)
    setToken(res.data.access)
    // fetch user
    try {
      const me = await api.get('/users/me/')
      setUser(me.data)
      return me.data
    } catch {
      return res.data
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
