import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Nav from './components/Nav'
import RequireAuth from './components/RequireAuth'
import ConfirmUsernameGate from './components/ConfirmUsernameGate'
import FounderStoryModal from './components/FounderStoryModal'
import StoryPremiumPitchModal from './components/StoryPremiumPitchModal'
import OnboardingGuideModal from './components/OnboardingGuideModal'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Stories from './pages/Stories'
import StoryCreate from './pages/StoryCreate'
import StoryDetail from './pages/StoryDetail'
import Aria from './pages/Aria'
import Premium from './pages/Premium'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import StoryInbox from './pages/StoryInbox'
import Messages from './pages/Messages'
import UserProfile from './pages/UserProfile'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'

export default function App() {
  const { user, ready } = useAuth()
  const location = useLocation()
  // The full-screen scroll-snap Stories feed owns its own viewport-locked
  // scroll on both breakpoints -- it can't share the outer md:overflow-y-auto
  // pane, sit above a pb-20 mobile offset, or have a footer sitting in the
  // document below it (reachable via overscroll-chaining/keyboard on some
  // devices even with overscroll-contain on the feed itself).
  const isStoriesFeed = location.pathname === '/stories'
  return (
    <div className="min-h-screen flex flex-col md:flex-row md:h-screen">
      {ready && user && !user.username_confirmed && <ConfirmUsernameGate />}
      {ready && user && user.username_confirmed && !user.has_seen_founder_story && <FounderStoryModal />}
      {ready && user && user.username_confirmed && user.has_seen_founder_story && !user.is_founder && !user.is_premium && !user.has_seen_story_premium_pitch && <StoryPremiumPitchModal />}
      {ready && user && user.username_confirmed && user.has_seen_founder_story && (user.is_founder || user.is_premium || user.has_seen_story_premium_pitch) && !user.has_seen_onboarding_guide && <OnboardingGuideModal />}
      <Nav />
      <div className={`flex-1 flex flex-col md:h-screen ${isStoriesFeed ? '' : 'md:overflow-y-auto'}`}>
        <main className={`flex-grow ${isStoriesFeed ? '' : 'pb-20 md:pb-0'}`}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/stories" element={<RequireAuth><Stories /></RequireAuth>} />
            <Route path="/stories/new" element={<RequireAuth><StoryCreate /></RequireAuth>} />
            <Route path="/stories/:storyId" element={<StoryDetail />} />
            <Route path="/aria" element={<RequireAuth><Aria /></RequireAuth>} />
            <Route path="/premium" element={<Premium />} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
            <Route path="/story-inbox" element={<RequireAuth><StoryInbox /></RequireAuth>} />
            <Route path="/messages" element={<RequireAuth><Messages /></RequireAuth>} />
            <Route path="/messages/:userId" element={<RequireAuth><Messages /></RequireAuth>} />
            <Route path="/users/:userId" element={<UserProfile />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
          </Routes>
        </main>
        {!isStoriesFeed && (
          /* Deliberately always-dark, not theme-following -- bg-navy would
             have been wrong here since `navy` is the app's flip-with-theme
             *text* token (light in dark mode), not a fixed dark
             background; that mismatch is exactly what made this bar look
             washed-out and mismatched in dark mode. A literal hex pinned
             to the light theme's own navy value keeps this footer looking
             identical (and correctly dark) in both themes. */
          <footer className="bg-[#131A33] text-white/60 py-8 mt-10 pb-[calc(2rem+env(safe-area-inset-bottom))]">
            <div className="max-w-6xl mx-auto px-7 flex flex-col sm:flex-row justify-between gap-3 text-sm">
              <span>Inspire — a space to be real. © 2026 · inspirerealexperiences.com</span>
              <div className="flex items-center gap-4">
                <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
                <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                <a href="mailto:support@inspirerealexperiences.com" className="hover:text-white transition-colors">Contact</a>
                <span>Made for people, not metrics.</span>
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}
