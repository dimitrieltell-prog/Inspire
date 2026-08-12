import { Link, Route, Routes } from 'react-router-dom'
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
  return (
    <div className="min-h-screen flex flex-col md:flex-row md:h-screen">
      {ready && user && !user.username_confirmed && <ConfirmUsernameGate />}
      {ready && user && user.username_confirmed && !user.has_seen_founder_story && <FounderStoryModal />}
      {ready && user && user.username_confirmed && user.has_seen_founder_story && !user.is_founder && !user.is_premium && !user.has_seen_story_premium_pitch && <StoryPremiumPitchModal />}
      {ready && user && user.username_confirmed && user.has_seen_founder_story && (user.is_founder || user.is_premium || user.has_seen_story_premium_pitch) && !user.has_seen_onboarding_guide && <OnboardingGuideModal />}
      <Nav />
      <div className="flex-1 flex flex-col md:h-screen md:overflow-y-auto">
        <main className="flex-grow pb-20 md:pb-0">
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
        <footer className="bg-navy text-white/60 py-8 mt-10 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <div className="max-w-6xl mx-auto px-7 flex flex-col sm:flex-row justify-between gap-3 text-sm">
            <span>Inspire — a space to be real. © 2026 · inspirerealexperiences.com</span>
            <div className="flex items-center gap-4">
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <span>Made for people, not metrics.</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
