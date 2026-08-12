import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import StoryCard from '../components/StoryCard'
import OnboardingChecklist from '../components/OnboardingChecklist'

export default function Stories() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tag = searchParams.get('tag')
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api.listStories(tag)
      .then(setStories)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [tag])

  return (
    <div className="max-w-6xl mx-auto px-7 py-16">
      <div className="text-center max-w-xl mx-auto mb-10">
        <span className="text-xs font-bold uppercase tracking-wide text-indigo">A quieter kind of feed</span>
        <h1 className="text-3xl font-bold mt-3 mb-3">Real experiences, organized with care.</h1>
        <p className="text-slate">A feed built for meaning, not momentum. Looking for a topic? Search a hashtag.</p>
        <Link to="/stories/new" className="inline-block mt-5 px-6 py-3 rounded-full font-semibold bg-indigo text-white hover:bg-indigo-deep transition-colors">
          Share your story
        </Link>
      </div>

      <OnboardingChecklist />

      {tag && (
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className="text-sm font-semibold text-navy">Posts tagged #{tag}</span>
          <button onClick={() => setSearchParams({})} className="text-sm text-indigo font-semibold hover:underline">Clear</button>
        </div>
      )}

      {loading && <p className="text-center text-slate">Loading stories…</p>}
      {error && <p className="text-center text-rose-ink">{error}</p>}
      {!loading && !error && stories.length === 0 && (
        <p className="text-center text-slate">{tag ? `No posts tagged #${tag} yet.` : 'No stories yet — be the first to share one.'}</p>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {stories.map((s) => <StoryCard key={s.id} story={s} />)}
      </div>
    </div>
  )
}
