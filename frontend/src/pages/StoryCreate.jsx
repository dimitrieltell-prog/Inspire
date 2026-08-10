import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

const CATEGORIES = ['Mental Health', 'Relationships', 'Family', 'School', 'Growth', 'Life Challenges', 'Achievements', 'Advice']

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

function timeAgo(ts) {
  const diff = Date.now() / 1000 - ts
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function StoryCreate() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('new')

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [mediaType, setMediaType] = useState(null)
  const [existingMediaUrl, setExistingMediaUrl] = useState(null)
  const [draftId, setDraftId] = useState(null)

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')

  const [drafts, setDrafts] = useState(null)

  useEffect(() => {
    if (tab === 'drafts') {
      api.listStoryDrafts().then(setDrafts).catch(() => setDrafts([]))
    }
  }, [tab])

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-7 py-24 text-center">
        <p className="text-slate mb-4">Sign in to share your story.</p>
        <button onClick={() => navigate('/login')} className="px-6 py-3 rounded-full font-semibold bg-indigo text-white">Sign in</button>
      </div>
    )
  }

  const hasContent = title || body || mediaFile || existingMediaUrl || isAnonymous

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
    setExistingMediaUrl(null)
  }

  function removeMedia() {
    setMediaFile(null)
    setMediaPreview(null)
    setMediaType(null)
    setExistingMediaUrl(null)
  }

  function clearForm() {
    if (hasContent && !window.confirm("Clear everything you've added and start over?")) return
    setTitle('')
    setBody('')
    setCategory(CATEGORIES[0])
    setIsAnonymous(false)
    removeMedia()
    setDraftId(null)
    setError('')
  }

  function openDraft(d) {
    setTitle(d.title || '')
    setBody(d.body || '')
    setCategory(d.category || CATEGORIES[0])
    setIsAnonymous(d.is_anonymous || false)
    setMediaFile(null)
    setMediaType(d.media_type || null)
    setMediaPreview(d.media_url || null)
    setExistingMediaUrl(d.media_url || null)
    setDraftId(d.id)
    setError('')
    setTab('new')
  }

  async function deleteDraft(id) {
    if (!window.confirm('Delete this draft? This can\'t be undone.')) return
    try {
      await api.deleteStoryDraft(id)
      setDrafts((ds) => ds.filter((d) => d.id !== id))
      if (draftId === id) setDraftId(null)
    } catch (err) {
      setError(err.message)
    }
  }

  async function resolveMediaUrl() {
    if (mediaFile) return { media_url: await uploadToCloudinary(mediaFile), media_type: mediaType }
    if (existingMediaUrl) return { media_url: existingMediaUrl, media_type: mediaType }
    return { media_url: null, media_type: null }
  }

  async function saveDraft() {
    setSavingDraft(true)
    setError('')
    try {
      const { media_url, media_type } = await resolveMediaUrl()
      const payload = { title, body, category, is_anonymous: isAnonymous, media_url, media_type }
      if (draftId) {
        await api.updateStoryDraft(draftId, payload)
      } else {
        const created = await api.createStoryDraft(payload)
        setDraftId(created.id)
      }
      setExistingMediaUrl(media_url)
      setMediaFile(null)
      setSavedMessage('Draft saved.')
      setTimeout(() => setSavedMessage(''), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingDraft(false)
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const { media_url, media_type } = await resolveMediaUrl()

      await api.createStory({
        title,
        body,
        category,
        is_anonymous: isAnonymous,
        media_url,
        media_type,
        tags: [],
      })
      if (draftId) {
        api.deleteStoryDraft(draftId).catch(() => {})
      }
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
      <p className="text-sm text-slate mb-6">Text, photo, or video — post it however it actually happened.</p>

      <div className="flex gap-2 mb-6 border-b border-line">
        <button
          onClick={() => setTab('new')}
          className={`px-1 pb-3 -mb-px text-sm font-semibold border-b-2 transition-colors ${tab === 'new' ? 'border-indigo text-navy' : 'border-transparent text-slate-light hover:text-navy'}`}
        >
          New post
        </button>
        <button
          onClick={() => setTab('drafts')}
          className={`ml-5 px-1 pb-3 -mb-px text-sm font-semibold border-b-2 transition-colors ${tab === 'drafts' ? 'border-indigo text-navy' : 'border-transparent text-slate-light hover:text-navy'}`}
        >
          Drafts{drafts && drafts.length > 0 ? ` (${drafts.length})` : ''}
        </button>
      </div>

      {tab === 'drafts' ? (
        !drafts ? (
          <p className="text-sm text-slate-light">Loading…</p>
        ) : drafts.length === 0 ? (
          <p className="text-sm text-slate-light">No drafts yet — anything you save without posting will show up here.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {drafts.map((d) => (
              <div key={d.id} className="border border-line rounded-xl p-4 flex items-start justify-between gap-3">
                <button onClick={() => openDraft(d)} className="text-left min-w-0 flex-1">
                  <p className="font-semibold truncate">{d.title || 'Untitled draft'}</p>
                  <p className="text-sm text-slate-light truncate mt-0.5">{d.body || 'No text yet.'}</p>
                  <p className="text-xs text-slate-light mt-1">{timeAgo(d.updated_at)}</p>
                </button>
                <button
                  onClick={() => deleteDraft(d.id)}
                  aria-label="Delete draft"
                  className="text-slate-light hover:text-rose-ink transition-colors flex-shrink-0 text-lg leading-none px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <input required maxLength={120} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)}
            className="border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo" />

          <textarea required maxLength={5000} rows={6} placeholder="What happened? Be as honest as you want to be." value={body} onChange={(e) => setBody(e.target.value)}
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
              <div className="relative mt-3 inline-block">
                {mediaType === 'video'
                  ? <video src={mediaPreview} controls className="rounded-xl max-h-64" />
                  : <img src={mediaPreview} alt="Preview" className="rounded-xl max-h-64 object-cover" />}
                <button
                  type="button"
                  onClick={removeMedia}
                  aria-label="Remove media"
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-navy text-white text-sm flex items-center justify-center shadow"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <label className="flex items-center justify-between border border-line rounded-xl px-4 py-3">
            <span className="text-sm font-medium">Post anonymously</span>
            <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="w-5 h-5 accent-indigo" />
          </label>

          {error && <p className="text-sm text-rose-ink">{error}</p>}
          {savedMessage && <p className="text-sm text-sage-ink">{savedMessage}</p>}

          <div className="flex items-center gap-3">
            <button type="button" onClick={clearForm} className="text-sm font-semibold text-slate-light hover:text-rose-ink transition-colors">
              Clear / start over
            </button>
            <button type="button" onClick={saveDraft} disabled={savingDraft || !hasContent}
              className="ml-auto px-5 py-2.5 rounded-full text-sm font-semibold border border-line bg-white hover:border-indigo transition-colors disabled:opacity-50">
              {savingDraft ? 'Saving…' : 'Save draft'}
            </button>
            <button disabled={submitting} className="bg-indigo text-white rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-indigo-deep transition-colors disabled:opacity-60">
              {submitting ? 'Sharing…' : 'Share your story'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
