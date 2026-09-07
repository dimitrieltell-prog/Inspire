import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import ReportModal from './ReportModal'
import FirstCircleIcon from './FirstCircleIcon'

// The comments "guts" (fetch, composer, list, per-comment report) shared
// between StoryDetail.jsx's page layout and CommentsPanel.jsx's slide-up/
// side-panel sheet. Renders no heading or close chrome of its own -- each
// caller owns that so it's identical in both places.
export default function Comments({ storyId, initialCommentCount, onCountChange }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [commentBody, setCommentBody] = useState('')
  const [commentError, setCommentError] = useState('')
  const [posting, setPosting] = useState(false)
  const [report, setReport] = useState(null) // { targetType: 'comment', targetId } | null

  useEffect(() => {
    setLoading(true)
    api.listComments(storyId).then(setComments).catch(() => {}).finally(() => setLoading(false))
  }, [storyId])

  async function submitComment(e) {
    e.preventDefault()
    if (!user) { setCommentError('Sign in to leave a comment.'); return }
    setPosting(true)
    setCommentError('')
    try {
      const comment = await api.createComment(storyId, commentBody)
      setComments((c) => [...c, comment])
      onCountChange?.(comments.length + 1)
      setCommentBody('')
    } catch (e) {
      setCommentError(e.message)
    } finally {
      setPosting(false)
    }
  }

  return (
    <div>
      {user ? (
        <form onSubmit={submitComment} className="flex flex-col gap-3 mb-6">
          <textarea
            required
            maxLength={1000}
            placeholder="Share a supportive comment…"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            className="border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo resize-none"
            rows={3}
          />
          {commentError && <p className="text-sm text-rose-ink">{commentError}</p>}
          <button
            disabled={posting}
            className="self-start bg-indigo text-white rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-indigo-deep transition-colors disabled:opacity-60"
          >
            {posting ? 'Posting…' : 'Post comment'}
          </button>
        </form>
      ) : (
        <p className="text-sm text-slate mb-6">
          <Link to="/login" className="text-indigo font-semibold">Sign in</Link> to leave a comment.
        </p>
      )}

      {!loading && comments.length === 0 && <p className="text-sm text-slate-light">No comments yet — be the first.</p>}

      <div className="flex flex-col gap-4">
        {comments.map((c) => (
          <div key={c.id} className="border-b border-line pb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="flex items-center gap-1.5 min-w-0">
                {c.author_id ? (
                  <Link to={`/users/${c.author_id}`} className="text-xs font-semibold text-slate hover:text-indigo transition-colors">{c.author_name}</Link>
                ) : (
                  <span className="text-xs font-semibold text-slate">{c.author_name}</span>
                )}
                {c.author_first_circle_number && <FirstCircleIcon size={12} />}
              </span>
              <p className="text-sm text-slate leading-relaxed mt-1 whitespace-pre-wrap">{c.body}</p>
            </div>
            {user && c.author_id !== user.id && (
              <button
                onClick={() => setReport({ targetType: 'comment', targetId: c.id })}
                className="text-xs text-slate-light hover:text-rose-ink transition-colors flex-shrink-0"
              >
                Report
              </button>
            )}
          </div>
        ))}
      </div>

      {report && (
        <ReportModal targetType={report.targetType} targetId={report.targetId} onClose={() => setReport(null)} />
      )}
    </div>
  )
}
