import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

const CATEGORIES = ['Mental Health', 'Relationships', 'Family', 'School', 'Growth', 'Life Challenges', 'Achievements', 'Advice']
const DURATIONS = [
  { hours: 24, label: '24 hours' },
  { hours: 48, label: '48 hours' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '7 days' },
]

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

async function uploadToCloudinary(file) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Media uploads are not configured yet.')
  }
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
    method: 'POST',
    body: form,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || 'Upload failed. Please try a different file.')
  return data.secure_url
}

export default function StoryCreate() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [audience, setAudience] = useState('everyone')
  const [durationHours, setDurationHours] = useState(24)
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [mediaType, setMediaType] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-7 py-24 text-center">
        <p className="text-slate mb-4">Sign in to share your story.</p>
        <button onClick={() => navigate('/login')} className="px-6 py-3 rounded-full font-semibold bg-indigo text-white">Sign in</button>
      </div>
    )
  }

  function onFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      setError('That file is too large — please choose one under 25MB.')
      e.target.value = ''
      return
    }
    setError('')
    const type = file.type.startsWith('video') ? 'video' : 'photo'
    setMediaFile(file)
    setMediaType(type)
    setMediaPreview(URL.createObjectURL(file))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      let media_url = null
      if (mediaFile) media_url = await uploadToCloudinary(mediaFile)

      await api.createStory({
        title,
        body,
        category,
        is_anonymous: isAnonymous,
        media_url,
        media_type: mediaFile ? mediaType : null,
        tags: [],
        audience,
        duration_hours: user.is_premium ? durationHours : 24,
      })
      navigate('/stories')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-7 py-16">
      <h1 className="text-2xl font-bold mb-2">Share your story</h1>
      <p className="text-sm text-slate mb-8">Text, photo, or video — post it however it actually happened.</p>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <input required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)}
          className="border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo" />

        <textarea required rows={6} placeholder="What happened? Be as honest as you want to be." value={body} onChange={(e) => setBody(e.target.value)}
          className="border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo resize-none" />

        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo bg-white">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <div>
          <label className="text-sm font-medium mb-2 block">Add a photo or video (optional)</label>
          <input type="file" accept="image/*,video/*" onChange={onFileChange}
            className="text-sm file:mr-3 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-lavender file:text-indigo file:font-semibold file:cursor-pointer" />
          {mediaPreview && (
            mediaType === 'video'
              ? <video src={mediaPreview} controls className="mt-3 rounded-xl max-h-64" />
              : <img src={mediaPreview} alt="Preview" className="mt-3 rounded-xl max-h-64 object-cover" />
          )}
        </div>

        <label className="flex items-center justify-between border border-line rounded-xl px-4 py-3">
          <span className="text-sm font-medium">Post anonymously</span>
          <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="w-5 h-5 accent-indigo" />
        </label>

        <div>
          <label className="text-sm font-medium mb-2 block">Who can see this</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAudience('everyone')}
              className={`flex-1 text-sm font-semibold rounded-xl px-4 py-2.5 border transition-colors ${
                audience === 'everyone' ? 'bg-indigo text-white border-indigo' : 'border-line hover:border-indigo'
              }`}
            >
              Everyone
            </button>
            <button
              type="button"
              onClick={() => setAudience('close_circle')}
              className={`flex-1 text-sm font-semibold rounded-xl px-4 py-2.5 border transition-colors ${
                audience === 'close_circle' ? 'bg-indigo text-white border-indigo' : 'border-line hover:border-indigo'
              }`}
            >
              🔒 Close circle only
            </button>
          </div>
          {audience === 'close_circle' && (
            <p className="text-xs text-slate-light mt-2">
              Only people in your close circle can see this. Manage who's in it from Settings.
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">How long it stays up</label>
          {user.is_premium ? (
            <select
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
              className="border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo bg-white w-full"
            >
              {DURATIONS.map((d) => <option key={d.hours} value={d.hours}>{d.label}</option>)}
            </select>
          ) : (
            <p className="text-xs text-slate-light border border-line rounded-xl px-4 py-3">
              24 hours, then it's gone — like every story on Inspire. <span className="text-indigo font-semibold">Premium</span> lets you keep stories up for up to 7 days.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-rose-ink">{error}</p>}

        <button disabled={submitting} className="bg-indigo text-white rounded-full py-3 font-semibold hover:bg-indigo-deep transition-colors disabled:opacity-60">
          {submitting ? 'Sharing…' : 'Share your story'}
        </button>
      </form>
    </div>
  )
}
