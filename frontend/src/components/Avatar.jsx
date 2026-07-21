import { useEffect, useState } from 'react'
import { api } from '../api'
import StoryViewer from './StoryViewer'
import StoryComposer from './StoryComposer'

export default function Avatar({ userId, displayName, sizeClass = 'w-16 h-16 text-2xl', isSelf = false }) {
  const [stories, setStories] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [showViewer, setShowViewer] = useState(false)
  const [showComposer, setShowComposer] = useState(false)

  useEffect(() => {
    if (!userId) return
    api.getUserStory(userId).then((s) => { setStories(s); setLoaded(true) }).catch(() => setLoaded(true))
  }, [userId])

  const hasStory = stories.length > 0

  function onAvatarClick() {
    if (hasStory) setShowViewer(true)
    else if (isSelf) setShowComposer(true)
  }

  function onCreated(story) {
    setStories((s) => [...s, story])
    setShowComposer(false)
    setShowViewer(true)
  }

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={onAvatarClick}
        disabled={!hasStory && !isSelf}
        className={`rounded-2xl ${sizeClass} ${hasStory ? 'p-[3px] bg-gradient-to-tr from-indigo via-lavender to-indigo' : ''} ${(hasStory || isSelf) ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className={`w-full h-full ${hasStory ? 'rounded-[13px] bg-white p-[2px]' : ''}`}>
          <div className="w-full h-full rounded-2xl bg-indigo text-white flex items-center justify-center font-bold">
            {displayName?.charAt(0).toUpperCase()}
          </div>
        </div>
      </button>

      {isSelf && loaded && (
        <button
          type="button"
          onClick={() => setShowComposer(true)}
          title="Add to your Story"
          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo text-white text-sm font-bold flex items-center justify-center border-2 border-white"
        >
          +
        </button>
      )}

      {showViewer && hasStory && (
        <StoryViewer stories={stories} onClose={() => setShowViewer(false)} />
      )}
      {showComposer && (
        <StoryComposer onClose={() => setShowComposer(false)} onCreated={onCreated} />
      )}
    </div>
  )
}
