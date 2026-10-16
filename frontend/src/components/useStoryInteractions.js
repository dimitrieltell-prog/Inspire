import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

// The one reaction a heart records. The backend still validates against its
// REACTIONS list, so this must stay a member of it.
export const LIKE_REACTION = 'Love this!'

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
  const [error, setError] = useState('')
  const [reactorsOpen, setReactorsOpen] = useState(false)
  const [saved, setSaved] = useState(story.is_saved)
  const [reposted, setReposted] = useState(story.is_reposted)
  const [repostCount, setRepostCount] = useState(story.repost_count)
  // Brief "Copied" confirmation after the clipboard fallback.
  const [shareCopied, setShareCopied] = useState(false)
  const copyTimer = useRef(null)
  useEffect(() => () => clearTimeout(copyTimer.current), [])

  function promptSignIn() {
    navigate('/login', { state: { from: location } })
  }

  // Tapping the heart likes the post outright -- it used to open a picker
  // of named reactions ("Stay strong", "I'm here for you"...) and make you
  // choose one. The API still stores a named reaction, so existing ones are
  // untouched and the reactors list keeps working; new likes all record the
  // same value.
  async function toggleLike() {
    if (!user) { promptSignIn(); return }
    if (picked) { unreact(); return }
    try {
      await api.reactToStory(story.id, LIKE_REACTION)
      setSupportCount((c) => c + 1)
      setPicked(LIKE_REACTION)
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

  // The phone's own share sheet where there is one -- that's what puts
  // Messages, WhatsApp and the rest in the list without Inspire integrating
  // with any of them. Desktop browsers mostly don't implement it, so there
  // the link goes to the clipboard instead.
  //
  // Sharing deliberately needs no account: it's a link to a page the
  // backend already gates on its own, so a stranger handed a link to a
  // followers-only post still sees nothing.
  function copyViaSelection(text) {
    // execCommand is deprecated, and still the only copy that works when
    // the Clipboard API is refused -- which it is in embedded webviews, on
    // older browsers, and anywhere the permission is denied. Without this
    // those people get an error and no way to share at all.
    const field = document.createElement('textarea')
    field.value = text
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.top = '0'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    let copied = false
    try {
      copied = document.execCommand('copy')
    } catch (e) {
      copied = false
    }
    document.body.removeChild(field)
    return copied
  }

  function confirmCopied() {
    setShareCopied(true)
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setShareCopied(false), 2000)
  }

  async function share() {
    const url = `${window.location.origin}/stories/${story.id}`

    if (navigator.share) {
      try {
        await navigator.share({ title: story.display_title || 'Inspire', url })
        return
      } catch (e) {
        // Dismissing the sheet rejects with AbortError. That's a choice,
        // not a failure -- falling through to the clipboard would copy a
        // link for someone who just decided not to share it.
        if (e && e.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      confirmCopied()
      return
    } catch (e) {
      // Permission denied or no Clipboard API at all -- try the old way.
    }

    if (copyViaSelection(url)) {
      confirmCopied()
      return
    }
    setError('Could not copy the link.')
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
    supportCount, picked, error,
    reactorsOpen, setReactorsOpen,
    saved, reposted, repostCount,
    shareCopied,
    toggleLike, unreact, toggleSave, toggleRepost, share,
  }
}
