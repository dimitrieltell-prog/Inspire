import { createContext, useContext, useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { useAuth } from './AuthContext'

const ThemeContext = createContext(null)

// Resolves the effective light/dark theme from two sources, in priority
// order: the logged-in user's saved `theme_preference` (source of truth,
// synced across devices), or, for logged-out visitors (marketing page,
// public profiles, the login/register pages themselves) who have no
// account to read from yet, a localStorage fallback. Both default to
// "light" -- a visitor's OS/browser dark-mode setting is never
// auto-applied on its own; the only way "system" behavior ever kicks in
// is if someone has actually chosen "System" in Settings while logged in,
// which is then mirrored to localStorage like any other explicit choice
// so it also applies before they log back in. Mirrors every resolved
// preference into the same localStorage key that index.html's inline
// bootstrap script reads synchronously on the next load, so returning
// visitors don't see a flash of the wrong theme while React boots.
export function ThemeProvider({ children }) {
  const { user, ready, updateProfile } = useAuth()
  const [localPreference, setLocalPreference] = useState(
    () => localStorage.getItem('inspire_theme_preference') || 'light',
  )
  const [systemIsDark, setSystemIsDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e) => setSystemIsDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Logged-in: the account's own field is the source of truth. Logged-out:
  // fall back to whatever was last set locally.
  const preference = ready && user ? user.theme_preference || 'light' : localPreference
  const effectiveTheme = preference === 'system' ? (systemIsDark ? 'dark' : 'light') : preference

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme)
    // Mirror the resolved *preference itself* (light/dark/system), not the
    // effective theme -- so a "System" choice keeps tracking the device's
    // live setting on the next load too, rather than freezing whatever it
    // happened to resolve to at save time.
    localStorage.setItem('inspire_theme_preference', preference)
  }, [preference, effectiveTheme])

  // Native app only -- keep the status bar's icon color readable against
  // whichever background the app is currently rendering, instead of the
  // previous hardcoded Style.Light.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    StatusBar.setStyle({ style: effectiveTheme === 'dark' ? Style.Dark : Style.Light })
  }, [effectiveTheme])

  async function setPreference(value) {
    if (user) {
      await updateProfile({ theme_preference: value })
    } else {
      setLocalPreference(value)
    }
  }

  return (
    <ThemeContext.Provider value={{ preference, effectiveTheme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
