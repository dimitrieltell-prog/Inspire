import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import FeedStoryCard from '../components/FeedStoryCard'
import CommentsPanel from '../components/CommentsPanel'
import FeedDots from '../components/FeedDots'
import OnboardingChecklist from '../components/OnboardingChecklist'
import StoriesTray from '../components/StoriesTray'

// The Stories tray + a scroll-snap feed of content-sized cards (not
// full-viewport Reels-style slides) -- cards sit close together with a gap,
// and a gentle proximity snap settles on whichever card is nearest center
// when scrolling stops, matching the approved demo mockup. The outer wrapper
// owns the viewport-locked height (h-[calc(...)] md:h-screen, mirroring the
// pattern established in Aria.jsx: 56px/64px are
// frontend/src/components/navMetrics.js's MOBILE_TOPBAR_H/MOBILE_TABBAR_H,
// hardcoded as literals -- not imported -- because Tailwind v4's JIT scanner
// needs a complete, statically-greppable class string; interpolating an
// imported constant into an arbitrary-value class produces no CSS. Keep in
// sync with navMetrics.js and Aria.jsx by hand). StoriesTray sits above the
// feed as a natural-height flex-shrink-0 sibling -- not sized via a second
// magic-number constant -- while the scroll container below it is a
// flex-1 min-h-0 pane that just takes whatever height is left.
export default function Stories() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tag = searchParams.get('tag')
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [openCommentsFor, setOpenCommentsFor] = useState(null)

  const containerRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setCurrentIndex(0)
    setOpenCommentsFor(null)
    api.listStories(tag)
      .then(setStories)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [tag])

  const slideCount = (showOnboarding ? 1 : 0) + stories.length

  useEffect(() => {
    const root = containerRef.current
    if (!root || slideCount === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length === 0) return
        const top = visible.reduce((a, b) => (b.intersectionRatio > a.intersectionRatio ? b : a))
        setCurrentIndex(Number(top.target.dataset.slideIndex))
      },
      { root, threshold: 0.6 },
    )
    root.querySelectorAll('[data-slide-index]').forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [slideCount])

  function handleCountChange(storyId, n) {
    setStories((arr) => arr.map((s) => (s.id === storyId ? { ...s, comment_count: n } : s)))
  }

  function handleOnboardingVisibility(visible) {
    setShowOnboarding(visible)
    setOnboardingChecked(true)
  }

  const openStory = stories.find((s) => s.id === openCommentsFor) || null
  let slideIndex = 0

  return (
    <>
      <div className="flex flex-col h-[calc(100dvh-56px-64px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-screen">
        <StoriesTray />
        <div
          ref={containerRef}
          className="relative w-full flex-1 min-h-0 snap-y snap-proximity overflow-y-auto overscroll-contain bg-gradient-to-b from-white to-bg"
        >
          {loading && (
            <div className="h-full w-full flex items-center justify-center">
              <p className="text-slate">Loading stories…</p>
            </div>
          )}
          {error && (
            <div className="h-full w-full flex items-center justify-center px-6">
              <p className="text-rose-ink text-center">{error}</p>
            </div>
          )}
          {!loading && !error && onboardingChecked && stories.length === 0 && !showOnboarding && (
            <div className="h-full w-full flex items-center justify-center px-6">
              <p className="text-slate text-center">{tag ? `No posts tagged #${tag} yet.` : 'No stories yet — be the first to share one.'}</p>
            </div>
          )}
          {!loading && !error && (
            <>
              {/* Always mounted so its own fetch can run and report visibility
                  via onVisibilityChange -- gating the mount on showOnboarding
                  itself would create a chicken-and-egg problem where it never
                  gets a chance to determine whether it should show. When it
                  shouldn't show, the section collapses to `hidden` (no slide
                  footprint, not counted for the IntersectionObserver). */}
              <section
                data-slide-index={showOnboarding ? slideIndex++ : undefined}
                className={showOnboarding ? 'w-full flex-shrink-0 snap-center flex items-start justify-center px-4 py-6' : 'hidden'}
              >
                <div className="w-full max-w-[480px]">
                  <OnboardingChecklist onVisibilityChange={handleOnboardingVisibility} />
                </div>
              </section>
              {stories.map((s) => (
                <div key={s.id} data-slide-index={slideIndex++} className="w-full flex-shrink-0 snap-center flex items-start justify-center px-4 py-6">
                  <div className="w-full max-w-[480px]">
                    <FeedStoryCard story={s} onOpenComments={() => setOpenCommentsFor(s.id)} />
                  </div>
                </div>
              ))}
            </>
          )}
          <FeedDots count={slideCount} activeIndex={currentIndex} />
          {tag && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-navy/70 backdrop-blur text-white text-xs rounded-full px-4 py-2 flex items-center gap-2">
              <span>#{tag}</span>
              <button onClick={() => setSearchParams({})} className="font-semibold hover:underline">Clear</button>
            </div>
          )}
        </div>
      </div>
      {openStory && (
        <CommentsPanel
          storyId={openStory.id}
          initialCommentCount={openStory.comment_count}
          onCountChange={(n) => handleCountChange(openStory.id, n)}
          onClose={() => setOpenCommentsFor(null)}
        />
      )}
    </>
  )
}
