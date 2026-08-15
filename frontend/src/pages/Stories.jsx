import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import FeedStoryCard from '../components/FeedStoryCard'
import CommentsPanel from '../components/CommentsPanel'
import FeedDots from '../components/FeedDots'
import OnboardingChecklist from '../components/OnboardingChecklist'
import StoriesTray from '../components/StoriesTray'
import SuggestedAccounts from '../components/SuggestedAccounts'

// Waits two animation frames -- past the browser's own scroll-snap "settle"
// pass -- then forces the feed back to the top. Shared by the two places
// that need it: the normal load-finished effect, and a bfcache restore.
function resetScrollNextFrame(containerRef) {
  let raf2 = 0
  const raf1 = requestAnimationFrame(() => {
    raf2 = requestAnimationFrame(() => {
      containerRef.current?.scrollTo({ top: 0, behavior: 'instant' })
    })
  })
  return () => {
    cancelAnimationFrame(raf1)
    cancelAnimationFrame(raf2)
  }
}

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

  // The browser's own scroll-snap engine runs its initial "settle" pass
  // (aligning to whichever slide it considers nearest) asynchronously,
  // after the slides first paint -- a scrollTo(0) issued synchronously in
  // this effect loses that race and gets silently overridden a moment
  // later. Waiting two animation frames pushes our correction after the
  // browser's own settle pass instead of before it, so ours wins and
  // sticks.
  useEffect(() => {
    if (loading) return
    return resetScrollNextFrame(containerRef)
  }, [loading, tag])

  // Coming back to this tab via the browser/OS back-forward cache (e.g.
  // backgrounding Safari on a phone and reopening it) restores the page
  // exactly as it was -- including whatever scroll offset it was frozen
  // at -- without re-running any mount effects, so the fix above never
  // fires for that path. `pageshow`'s `persisted` flag is true specifically
  // for a bfcache restore. Unlike a fresh mount, there's no competing
  // browser snap-settle pass to out-wait here, and waiting for one is
  // actively wrong: `pageshow` can fire while the tab is still
  // backgrounded (visibilityState "hidden"), and browsers suspend
  // requestAnimationFrame entirely for hidden tabs -- a rAF-based
  // correction would simply never run. Set the scroll position directly
  // and synchronously instead.
  useEffect(() => {
    function onPageShow(e) {
      if (!e.persisted) return
      containerRef.current?.scrollTo({ top: 0, behavior: 'instant' })
      // Belt-and-suspenders: if the restore happened while still
      // backgrounded, redo it once the tab is actually visible again, in
      // case becoming visible triggers the browser's own layout/snap
      // recalculation and undoes the direct set above. rAF is safe here
      // since by definition the tab is visible by the time this fires.
      if (document.visibilityState === 'hidden') {
        const onVisible = () => {
          if (document.visibilityState !== 'visible') return
          document.removeEventListener('visibilitychange', onVisible)
          resetScrollNextFrame(containerRef)
        }
        document.addEventListener('visibilitychange', onVisible)
      }
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

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

  function handleDeleted(storyId) {
    setStories((arr) => arr.filter((s) => s.id !== storyId))
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
        {/* Tray's own internal padding (md:px-[max(2rem,calc(25%-120px))])
            is tuned to center its avatar row against the feed column alone
            -- the empty w-[360px] spacer keeps that math correct by
            matching the rail's width, instead of letting Tray stretch
            across it and throw the centering off. */}
        <div className="flex flex-row flex-shrink-0">
          <div className="flex-1 min-w-0">
            <StoriesTray />
          </div>
          <div className="hidden lg:block flex-shrink-0 w-[360px]" />
        </div>
        <div
          ref={containerRef}
          className="relative w-full flex-1 min-h-0 snap-y snap-proximity overflow-y-auto overscroll-contain bg-bg"
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
            /* One shared scroll pane (containerRef, above) for the feed
               AND the suggested-accounts rail, instead of two independent
               scrollers -- previously the rail stayed fixed in place while
               only the feed scrolled, so a trailing footer had nowhere to
               go without overlapping the still-visible rail. Scrolling
               together means the rail simply scrolls out of view like
               everything else, and Terms/Privacy/Contact live under the
               suggested list itself (mirrors Instagram's placement)
               instead of needing a separate footer element on desktop. */
            <div className="flex flex-row">
              <div className="flex flex-col flex-1 min-w-0">
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
                      <FeedStoryCard story={s} onOpenComments={() => setOpenCommentsFor(s.id)} onDeleted={handleDeleted} />
                    </div>
                  </div>
                ))}
                {/* Below lg the rail (with its own Terms/Privacy/Contact,
                    see the aside below) is hidden entirely, so this is the
                    only place those links are reachable on mobile/tablet. */}
                <footer className="lg:hidden bg-[#131A33] text-white/60 py-5 px-7">
                  <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-center sm:text-left">
                    <span>Inspire — a space to be real. © 2026 · inspirerealexperiences.com</span>
                    <div className="flex items-center gap-4">
                      <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
                      <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                      <a href="mailto:support@inspirerealexperiences.com" className="hover:text-white transition-colors">Contact</a>
                      <span>Made for people, not metrics.</span>
                    </div>
                  </div>
                </footer>
              </div>
              <aside className="hidden lg:flex flex-shrink-0 w-[360px] flex-col px-8 pt-8 pb-8 bg-bg">
                <SuggestedAccounts />
                <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-light">
                  <Link to="/terms" className="hover:text-indigo transition-colors">Terms</Link>
                  <Link to="/privacy" className="hover:text-indigo transition-colors">Privacy</Link>
                  <a href="mailto:support@inspirerealexperiences.com" className="hover:text-indigo transition-colors">Contact</a>
                  <span className="w-full">Inspire — a space to be real. © 2026</span>
                </div>
              </aside>
            </div>
          )}
          <FeedDots count={slideCount} activeIndex={currentIndex} />
          {tag && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-[#131A33]/70 backdrop-blur text-white text-xs rounded-full px-4 py-2 flex items-center gap-2">
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
