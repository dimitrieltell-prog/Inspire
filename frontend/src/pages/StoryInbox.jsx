import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import StoryViewer from '../components/StoryViewer'

export default function StoryInbox() {
  const { user, ready } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [openIndex, setOpenIndex] = useState(null)

  useEffect(() => {
    if (!ready) return
    if (!user) { navigate('/login'); return }
    api.getStoryInbox().then(setItems).catch((e) => setError(e.message))
  }, [ready, user, navigate])

  if (!ready || !user) return null

  return (
    <div className="max-w-2xl mx-auto px-7 py-16">
      <span className="text-xs font-bold uppercase tracking-wide text-indigo">Stories sent to you</span>
      <h1 className="text-3xl font-bold mt-3 mb-8">Story inbox</h1>

      {error && <p className="text-sm text-rose-ink">{error}</p>}

      {!items ? (
        <p className="text-sm text-slate-light">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-light">No one has sent you a story yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <button
              key={item.story.id}
              onClick={() => setOpenIndex(i)}
              className="bg-surface border border-line rounded-xl2 p-4 flex items-center justify-between text-left hover:border-indigo transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">{item.sender_name} sent you a story</p>
                <p className="text-xs text-slate-light mt-0.5 truncate">{item.story.body || 'Photo/video'}</p>
              </div>
              <span className="text-slate-light flex-shrink-0 ml-3">›</span>
            </button>
          ))}
        </div>
      )}

      {items && openIndex !== null && (
        <StoryViewer
          stories={items.map((i) => i.story)}
          startIndex={openIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </div>
  )
}
