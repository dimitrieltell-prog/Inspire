import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

// Reaction/save/repost state + actions for a single story, extracted out of
// StoryDetail.jsx so FeedStoryCard.jsx (the new full-screen feed card) can
// share the same logic instead of growing a third duplicated copy. Owns its
// own local copies of the mutable counters (seeded once from `story` on
// mount) rather than writing back into the caller's story object, since
// different callers hold that object differently (StoryDetail's local
// `story` state vs. an item inside Stories.jsx's `stories` array).
// comment_count is deliberately NOT managed here -- it's driven by
// Comments.jsx's onCountChange callback into whichever state the caller
// already uses to track it.
export function useStoryInteractions(story) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [supportCount, setSupportCount] = useState(story.support_count)
  const [picked, setPicked] = useState(story.my_reaction || null)
  const [reactOpen, setReactOpen] = useState(false)
  const [error, setError] = useState('')
  const [reactorsOpen, setReactorsOpen] = useState(false)
  const [saved, setSaved] = useState(story.is_saved)
  const [reposted, setReposted] = useState(story.is_reposted)
  const [repostCount, setRepostCount] = useState(story.repost_count)

  function promptSignIn() {
    navigate('/login', { state: { from: location } })
  }

  function openReactions() {
    if (!user) { promptSignIn(); return }
    if (picked) { unreact(); return }
    setReactOpen((o) => !o)
  }

  async function react(reaction) {
    try {
      await api.reactToStory(story.id, reaction)
      if (!picked) setSupportCount((c) => c + 1)
      setPicked(reaction)
      setReactOpen(false)
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }

  async function unreact() {
    try {
      await api.unreactToStory(story.id)
      setSupportCount((c) => c - 1)
      setPicked(null)
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }

  async function toggleSave() {
    if (!user) { promptSignIn(); return }
    const next = !saved
    setSaved(next)
    try {
      next ? await api.saveStory(story.id) : await api.unsaveStory(story.id)
    } catch (e) {
      setSaved(!next)
      setError(e.message)
    }
  }

  async function toggleRepost() {
    if (!user) { promptSignIn(); return }
    const next = !reposted
    setReposted(next)
    setRepostCount((c) => c + (next ? 1 : -1))
    try {
      next ? await api.repostStory(story.id) : await api.unrepostStory(story.id)
    } catch (e) {
      setReposted(!next)
      setRepostCount((c) => c + (next ? -1 : 1))
      setError(e.message)
    }
  }

  return {
    supportCount, picked, reactOpen, setReactOpen, error,
    reactorsOpen, setReactorsOpen,
    saved, reposted, repostCount,
    openReactions, react, unreact, toggleSave, toggleRepost,
  }
}
