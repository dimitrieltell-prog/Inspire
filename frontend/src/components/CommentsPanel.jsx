import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Comments from './Comments'
import { useIsDesktop } from './useIsDesktop'

// Slide-up sheet on mobile / side panel on desktop, opened from the
// full-screen feed without navigating away or losing scroll position.
// Reuses useIsDesktop() (the same 768px threshold that governs the
// sidebar-vs-tabbar nav shell) rather than the sm: breakpoint the app's
// other modals use, since this tracks which nav paradigm is mounted, not
// generic dialog sizing -- see the Phase 2 plan for the full reasoning.
export default function CommentsPanel({ storyId, initialCommentCount, onCountChange, onClose }) {
  const isDesktop = useIsDesktop()
  const [count, setCount] = useState(initialCommentCount)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  function handleCountChange(n) {
    setCount(n)
    onCountChange?.(n)
  }

  const sheetPosition = isDesktop
    ? `fixed inset-y-0 right-0 z-[45] bg-white w-[400px] max-w-[90vw] h-screen flex flex-col shadow-2xl transition-transform duration-200 ${visible ? 'translate-x-0' : 'translate-x-full'}`
    : `fixed inset-x-0 bottom-0 z-[45] bg-white rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl transition-transform duration-200 ${visible ? 'translate-y-0' : 'translate-y-full'}`

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-[45] bg-navy/40 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
      <div className={sheetPosition}>
        {!isDesktop && (
          <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
            <span className="w-9 h-1 rounded-full bg-line" />
          </div>
        )}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line flex-shrink-0">
          <h2 className="text-sm font-bold">{count} {count === 1 ? 'comment' : 'comments'}</h2>
          <button onClick={handleClose} aria-label="Close" className="text-slate-light hover:text-navy text-lg leading-none">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <Comments storyId={storyId} initialCommentCount={initialCommentCount} onCountChange={handleCountChange} />
        </div>
      </div>
    </>,
    document.body,
  )
}
