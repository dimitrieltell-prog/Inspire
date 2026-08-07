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
        .catch((err) => {
          // 401 means the token itself is invalid/expired -- not a transient
          // blip, so keeping the stale cached user around just leaves every
          // real API call silently 401ing (e.g. the founder accounts list
          // stuck on "Loading..." forever). Log out so the UI honestly shows
          // signed-out instead of a session that only looks alive.
          if (err.status === 401) {
            localStorage.removeItem('inspire_token')
            localStorage.removeItem('inspire_user')
            setUser(null)
          }
          // Any other error (network blip, 500, etc.) -- keep cached data.
        })
    }
  }, [])

  function saveSession({ access_token, user }) {
    localStorage.setItem('inspire_token', access_token)
    localStorage.setItem('inspire_user', JSON.stringify(user))
    setUser(user)
  }

  async function register(email, password, display_name, username, dateOfBirth, acceptedTerms) {
    const data = await api.register({
      email,
      password,
      display_name,
      username: username || undefined,
      date_of_birth: dateOfBirth,
      accepted_terms: acceptedTerms,
    })
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
    // Brand-new Google account: the backend won't create it until we've
    // collected a birthdate (COPPA) and Terms acceptance. The caller checks
    // for `needs_details` and shows that step before calling finishGoogleSignup.
    if (data.needs_details) return data
    saveSession(data)
    return data
  }

  async function finishGoogleSignup(credential, username, dateOfBirth, acceptedTerms) {
    const data = await api.finishGoogleSignup(credential, username, dateOfBirth, acceptedTerms)
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
    <AuthContext.Provider value={{ user, ready, register, login, loginWithGoogle, finishGoogleSignup, logout, refreshUser, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
