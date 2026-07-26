import { Route, Routes } from 'react-router-dom'
import Nav from './components/Nav'
import RequireAuth from './components/RequireAuth'
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
import UserProfile from './pages/UserProfile'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-grow">
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
          <Route path="/users/:userId" element={<UserProfile />} />
        </Routes>
      </main>
      <footer className="bg-navy text-white/60 py-8 mt-10">
        <div className="max-w-6xl mx-auto px-7 flex flex-col sm:flex-row justify-between gap-2 text-sm">
          <span>Inspire — a space to be real. © 2026 · inspirerealexperiences.com</span>
          <span>Made for people, not metrics.</span>
        </div>
      </footer>
    </div>
  )
}
