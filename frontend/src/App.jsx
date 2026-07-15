import { Route, Routes } from 'react-router-dom'
import Nav from './components/Nav'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Stories from './pages/Stories'
import StoryCreate from './pages/StoryCreate'
import Aria from './pages/Aria'
import Premium from './pages/Premium'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/stories" element={<Stories />} />
          <Route path="/stories/new" element={<StoryCreate />} />
          <Route path="/aria" element={<Aria />} />
          <Route path="/premium" element={<Premium />} />
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
