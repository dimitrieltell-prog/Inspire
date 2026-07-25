import { useState } from 'react'
import { Link } from 'react-router-dom'
import SearchOverlay from '../components/SearchOverlay'

export default function Landing() {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <div>
      <section className="text-center pt-8 md:pt-16 pb-16 px-7 max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-1.5 bg-white border border-line px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide text-slate mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo" /> A quieter kind of social
        </span>
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">Connect through real experiences.</h1>
        <p className="text-lg text-slate max-w-xl mx-auto mb-9">
          Inspire is a space to be honest about what you're going through — without pressure or judgment.
          Share your story, read others', and find perspective when you need it.
        </p>
        <div className="flex gap-3.5 justify-center flex-wrap">
          <Link to="/stories" className="px-7 py-3.5 rounded-full font-semibold bg-indigo text-white hover:bg-indigo-deep transition-colors">
            Read Stories
          </Link>
          <Link to="/stories/new" className="px-7 py-3.5 rounded-full font-semibold border border-line bg-white hover:border-indigo transition-colors">
            Share Yours
          </Link>
        </div>
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full max-w-md mx-auto mt-5 flex items-center gap-2.5 bg-white border border-line rounded-full px-5 py-3 text-sm text-slate-light hover:border-indigo transition-colors"
        >
          <span>🔍</span> Search people and stories
        </button>
        <p className="text-xs text-slate-light mt-4">Text, photo, or video — share it however it actually happened.</p>
      </section>
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}

      <section className="max-w-6xl mx-auto px-7 pb-24">
        <div className="grid md:grid-cols-3 gap-5">
          <Feature badge="bg-lavender" title="Real conversations" text="No performing, no highlight reels. Just honest stories from people who mean them." />
          <Feature badge="bg-rose" title="Openly or anonymously" text="Share with your name, or keep it private. You choose how much you reveal." />
          <Feature badge="bg-sage" title="Support, not likes" text="Instead of chasing likes, people send you strength and let you know you're heard." />
        </div>
      </section>
    </div>
  )
}

function Feature({ badge, title, text }) {
  return (
    <div className="bg-white border border-line rounded-xl2 p-8 hover:-translate-y-1 hover:shadow-[0_24px_48px_-28px_rgba(19,26,51,0.18)] transition-all">
      <div className={`w-[46px] h-[46px] rounded-[13px] ${badge} mb-5`} />
      <h3 className="text-lg font-bold mb-2.5">{title}</h3>
      <p className="text-sm text-slate leading-relaxed">{text}</p>
    </div>
  )
}
