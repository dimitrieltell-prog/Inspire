import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'
import App from './App.jsx'
import { AuthProvider } from './AuthContext.jsx'
import { ThemeProvider } from './ThemeContext.jsx'
import './index.css'

// Native app only (no-op on the website). The WebView draws full-screen,
// underneath the status bar (overlay: true) -- Nav's own
// pt-[env(safe-area-inset-top)] padding (plus viewport-fit=cover in
// index.html) keeps real content clear of the notch/Dynamic Island, while
// letting Inspire's actual page background show through the status bar
// area instead of iOS's native (and here, black) default. The status bar
// *style* (light vs dark icons) now reacts to the resolved theme instead
// of being hardcoded to Light -- see ThemeContext.jsx.
if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: true })
}

// The browser's own scroll restoration (default "auto") tries to replay a
// tab's previous scroll offset -- including for inner scrollable regions
// like the Stories feed -- on reload, which fights with pages (like
// Stories.jsx) that intentionally reset their own scroll position on load.
// Disabling it hands that decision entirely to the app instead.
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
