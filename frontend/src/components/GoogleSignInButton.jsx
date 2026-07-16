import { useEffect, useRef } from 'react'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function GoogleSignInButton({ onCredential, onError }) {
  const buttonRef = useRef(null)
  const callbacksRef = useRef({ onCredential, onError })
  callbacksRef.current = { onCredential, onError }

  useEffect(() => {
    if (!CLIENT_ID) return

    let cancelled = false

    function render() {
      if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => {
          if (response?.credential) callbacksRef.current.onCredential(response.credential)
          else callbacksRef.current.onError?.(new Error('Google sign-in did not return a credential.'))
        },
      })
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        shape: 'pill',
      })
    }

    if (window.google?.accounts?.id) {
      render()
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval)
          render()
        }
      }, 100)
      return () => {
        cancelled = true
        clearInterval(interval)
      }
    }

    return () => {
      cancelled = true
    }
  }, [])

  if (!CLIENT_ID) return null

  return <div ref={buttonRef} className="flex justify-center" />
}
