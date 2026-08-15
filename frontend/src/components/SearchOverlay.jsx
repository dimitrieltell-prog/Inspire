import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import VerifiedBadge from './VerifiedBadge'

export default function SearchOverlay({ onClose }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (query.trim().length < 2) { setResults(null); return }
    setLoading(true)
    const t = setTimeout(() => {
      api.search(query).then(setResults).catch(() => setResults({ users: [], stories: [] })).finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  function go(path) {
    onClose()
    navigate(path)
  }

  const hasResults = results && (results.users.length > 0 || results.stories.length > 0)

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-20 px-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl w-full max-w-lg max-h-[75vh] flex flex-col overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-4 border-b border-line">
          <span className="text-slate-light">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people and posts on Inspire…"
            className="flex-grow text-sm focus:outline-none"
          />
          <button onClick={onClose} className="text-slate-light hover:text-navy text-lg leading-none flex-shrink-0">✕</button>
        </div>

        <div className="overflow-y-auto">
          {query.trim().length < 2 ? (
            <p className="text-sm text-slate-light p-6 text-center">Start typing to search.</p>
          ) : loading && !results ? (
            <p className="text-sm text-slate-light p-6 text-center">Searching…</p>
          ) : !hasResults ? (
            <p className="text-sm text-slate-light p-6 text-center">No results for "{query}".</p>
          ) : (
            <>
              {results.users.length > 0 && (
                <div className="p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-light px-2 mb-1">People</p>
                  {results.users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => go(`/users/${u.id}`)}
                      className="w-full flex items-center gap-2.5 text-left px-2 py-2 rounded-lg hover:bg-bg transition-colors"
                    >
                      <span className="w-8 h-8 rounded-lg bg-lavender text-indigo flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {u.display_name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm min-w-0 truncate">
                        {u.display_name}
                        {u.username && <span className="text-slate-light ml-1.5">@{u.username}</span>}
                      </span>
                      {u.is_premium && <VerifiedBadge className="w-3.5 h-3.5 flex-shrink-0 ml-auto" />}
                    </button>
                  ))}
                </div>
              )}
              {results.stories.length > 0 && (
                <div className="p-3 border-t border-line">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-light px-2 mb-1">Posts</p>
                  {results.stories.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => go(`/stories/${s.id}`)}
                      className="w-full text-left px-2 py-2.5 rounded-lg hover:bg-bg transition-colors"
                    >
                      {/* Search still has to NAME each result, so it uses the
                          server's display_title -- the post's first line, or
                          "a photo"/"a video" when there's no text. Never
                          falls back to s.title: posts don't show titles any
                          more, and naming a result by a hidden title would
                          look like it matched nothing. */}
                      <p className="text-sm font-semibold truncate">{s.display_title || s.body}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
