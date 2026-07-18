import { createContext, useContext, useEffect, useState } from 'react'
import { api } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('inspire_user')
    if (stored) setUser(JSON.parse(stored))
    setReady(true)
    // Refresh from the server so badges, name, and premium status stay current
    // (e.g. founder status granted after the cached login).
    if (localStorage.getItem('inspire_token')) {
      api.me()
        .then((fresh) => {
          localStorage.setItem('inspire_user', JSON.stringify(fresh))
          setUser(fresh)
        })
        .catch(() => {}) // keep cached data on transient errors
    }
  }, [])

  function saveSession({ access_token, user }) {
    localStorage.setItem('inspire_token', access_token)
    localStorage.setItem('inspire_user', JSON.stringify(user))
    setUser(user)
  }

  async function register(email, password, display_name) {
    const data = await api.register({ email, password, display_name })
    saveSession(data)
    return data
  }

  async function login(email, password) {
    const data = await api.login(email, password)
    saveSession(data)
    return data
  }

  async function loginWithGoogle(credential) {
    const data = await api.googleLogin(credential)
    saveSession(data)
    return data
  }

  function logout() {
    localStorage.removeItem('inspire_token')
    localStorage.removeItem('inspire_user')
    setUser(null)
  }

  async function refreshUser() {
    const updated = await api.me()
    localStorage.setItem('inspire_user', JSON.stringify(updated))
    setUser(updated)
    return updated
  }

  async function updateProfile(fields) {
    const updated = await api.updateProfile(fields)
    localStorage.setItem('inspire_user', JSON.stringify(updated))
    setUser(updated)
    return updated
  }

  return (
    <AuthContext.Provider value={{ user, ready, register, login, loginWithGoogle, logout, refreshUser, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
