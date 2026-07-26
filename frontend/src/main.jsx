import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import App from './App.jsx'
import { AuthProvider } from './AuthContext.jsx'
import './index.css'

// Native app only (no-op on the website): stop the status bar from
// floating over the WebView, so the nav bar isn't covered on phone/tablet.
if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: false })
  StatusBar.setStyle({ style: Style.Dark })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
