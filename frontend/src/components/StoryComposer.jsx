import { useState } from 'react'
import { api } from '../api'
import { useAuth } from '../AuthContext'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const MAX_FILE_SIZE = 25 * 1024 * 1024

const DURATIONS = [
  { hours: 24, label: '24 hours' },
  { hours: 48, label: '48 hours' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '7 days' },
]

async function uploadToCloudinary(file) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Media uploads are not configured yet.')
  }
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: 'POST', body: form })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || 'Upload failed. Please try a different file.')
  return data.secure_url
}

export default function StoryComposer({ onClose, onCreated }) {
  const { user } = useAuth()
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState('everyone')
  const [durationHours, setDurationHours] = useState(24)
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [mediaType, setMediaType] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
    if (!body.trim() && !mediaFile) {
      setError('Add a caption or a photo/video.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      let media_url = null
      if (mediaFile) media_url = await uploadToCloudinary(mediaFile)
      const story = await api.createEphemeralStory({
        body: body.trim() || null,
        media_url,
        media_type: mediaFile ? mediaType : null,
        audience,
        duration_hours: user.is_premium ? durationHours : 24,
      })
      onCreated(story)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:w-[420px] max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Add to your Story</h2>
          <button onClick={onClose} className="text-slate-light hover:text-navy text-lg leading-none">✕</button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <textarea
            rows={3}
            maxLength={user.is_premium ? 1000 : 500}
            placeholder="Say something (optional if you add media)…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo resize-none"
          />

          <div>
            <input type="file" accept="image/*,video/*" onChange={onFileChange}
              className="text-sm file:mr-3 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-lavender file:text-indigo file:font-semibold file:cursor-pointer" />
            {mediaPreview && (
              mediaType === 'video'
                ? <video src={mediaPreview} controls className="mt-3 rounded-xl max-h-48 w-full object-cover" />
                : <img src={mediaPreview} alt="Preview" className="mt-3 rounded-xl max-h-48 w-full object-cover" />
            )}
          </div>

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
              🔒 Close circle
            </button>
          </div>

          {user.is_premium ? (
            <select
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
              className="border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo bg-white w-full"
            >
              {DURATIONS.map((d) => <option key={d.hours} value={d.hours}>{d.label}</option>)}
            </select>
          ) : (
            <p className="text-xs text-slate-light">
              Visible for 24 hours. <span className="text-indigo font-semibold">Premium</span> lets you keep it up longer.
            </p>
          )}

          {error && <p className="text-sm text-rose-ink">{error}</p>}

          <button disabled={submitting} className="bg-indigo text-white rounded-full py-3 font-semibold hover:bg-indigo-deep transition-colors disabled:opacity-60">
            {submitting ? 'Sharing…' : 'Share to Story'}
          </button>
        </form>
      </div>
    </div>
  )
}
