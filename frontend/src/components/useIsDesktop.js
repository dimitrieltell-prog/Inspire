import { useEffect, useState } from 'react'

const QUERY = '(min-width: 768px)'

// Drives the single-mount-point switch between DesktopSidebar and
// MobileTopBar/MobileTabBar -- Nav.jsx renders exactly one branch, never
// both (CSS-hidden), so components like NotificationsBell that live inside
// them never end up mounted twice and double-polling.
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(QUERY).matches)

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    // Listen on both matchMedia's own change event and window resize --
    // belt and suspenders, since some environments (older browsers, some
    // automated/embedded webviews) don't reliably fire one or the other.
    const recompute = () => setIsDesktop(window.matchMedia(QUERY).matches)
    mql.addEventListener('change', recompute)
    window.addEventListener('resize', recompute)
    return () => {
      mql.removeEventListener('change', recompute)
      window.removeEventListener('resize', recompute)
    }
  }, [])

  return isDesktop
}
