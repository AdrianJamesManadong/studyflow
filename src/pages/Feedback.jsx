import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useFeedback } from '../hooks/useFeedback'
import {
  AlertTriangle,
  MessageSquare,
  Heart,
  ShieldCheck,
  X,
  Trash2,
  Loader2,
} from 'lucide-react'

const CATEGORIES = [
  { id: 'general',     label: 'General',     dot: 'bg-indigo-500',  style: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' },
  { id: 'bug',         label: 'Bug',         dot: 'bg-red-500',     style: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' },
  { id: 'error',       label: 'Error',       dot: 'bg-rose-500',    style: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800' },
  { id: 'feature',     label: 'Feature',     dot: 'bg-emerald-500', style: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  { id: 'improvement', label: 'Improvement', dot: 'bg-sky-500',     style: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800' },
  { id: 'question',    label: 'Question',    dot: 'bg-amber-500',   style: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
]

const MAX_LEN = 500

function categoryMeta(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[0]
}

function timeAgo(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  const units = [
    { label: 'y',  secs: 31536000 },
    { label: 'mo', secs: 2592000 },
    { label: 'd',  secs: 86400 },
    { label: 'h',  secs: 3600 },
    { label: 'm',  secs: 60 },
  ]
  for (const u of units) {
    const value = Math.floor(seconds / u.secs)
    if (value >= 1) return `${value}${u.label} ago`
  }
  return 'just now'
}

export default function Feedback() {
  const { user } = useAuth()
  const {
    posts, likedIds, comments, loading, error,
    addPost, deletePost, toggleLike,
    fetchComments, addComment, deleteComment,
  } = useFeedback()

  const [content, setContent]         = useState('')
  const [category, setCategory]       = useState('general')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [posting, setPosting]         = useState(false)
  const [postError, setPostError]     = useState('')

  const [filter, setFilter]                 = useState('all')
  const [expandedId, setExpandedId]         = useState(null)
  const [commentsLoadingId, setCommentsLoadingId] = useState(null)
  const [commentDrafts, setCommentDrafts]   = useState({})
  const [commentPosting, setCommentPosting] = useState(null)
  const [commentErrors, setCommentErrors]   = useState({})
  const [confirmDeletePost, setConfirmDeletePost] = useState(null)
  const [deletingPost, setDeletingPost]     = useState(false)

  const commentInputRef = useRef(null)

  useEffect(() => {
    if (!confirmDeletePost) return
    const onKey = (e) => { if (e.key === 'Escape' && !deletingPost) setConfirmDeletePost(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmDeletePost, deletingPost])

  async function handlePost() {
    if (!content.trim()) return
    setPosting(true)
    setPostError('')
    try {
      await addPost({ content: content.trim(), category, isAnonymous, authorName: user?.name })
      setContent('')
      setCategory('general')
      setIsAnonymous(false)
    } catch (err) {
      setPostError(err.message || 'Failed to post. Please try again.')
    } finally {
      setPosting(false)
    }
  }

  async function handleDeletePost() {
    setDeletingPost(true)
    try {
      await deletePost(confirmDeletePost.id)
      setConfirmDeletePost(null)
    } finally {
      setDeletingPost(false)
    }
  }

  async function toggleExpand(postId) {
    if (expandedId === postId) { setExpandedId(null); return }
    setExpandedId(postId)
    if (!comments[postId]) {
      setCommentsLoadingId(postId)
      try {
        await fetchComments(postId)
      } finally {
        setCommentsLoadingId(null)
      }
    }
    setTimeout(() => commentInputRef.current?.focus(), 0)
  }

  async function handleAddComment(postId) {
    const text = (commentDrafts[postId] || '').trim()
    if (!text) return
    setCommentPosting(postId)
    setCommentErrors(prev => ({ ...prev, [postId]: '' }))
    try {
      await addComment(postId, { content: text, isAnonymous: false, authorName: user?.name })
      setCommentDrafts(prev => ({ ...prev, [postId]: '' }))
    } catch (err) {
      setCommentErrors(prev => ({ ...prev, [postId]: err.message || 'Failed to post comment.' }))
    } finally {
      setCommentPosting(null)
    }
  }

  const filtered = filter === 'all' ? posts : posts.filter(p => p.category === filter)
  const remaining = MAX_LEN - content.length

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse max-w-3xl">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="h-32 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl" />
        {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">

      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Feedback & Reports</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Share ideas, report bugs, and see what other students are saying.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 space-y-3 shadow-sm">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value.slice(0, MAX_LEN))}
          placeholder="What's on your mind? Report a bug, suggest a feature, or just say hi..."
          rows={3}
          aria-label="Write feedback"
          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition resize-none text-sm"
        />
        <div className="flex justify-end -mt-1">
          <span className={`text-[10px] ${remaining <= 20 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
            {remaining} left
          </span>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                aria-pressed={category === c.id}
                className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-colors flex items-center gap-1.5
                  ${category === c.id ? c.style : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                {c.label}
              </button>
            ))}

            <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 ml-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
                className="accent-indigo-600 w-3.5 h-3.5"
              />
              Post anonymously
            </label>
          </div>

          <button
            onClick={handlePost}
            disabled={!content.trim() || posting}
            className="bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors shadow-md shadow-indigo-200 dark:shadow-indigo-950/40"
          >
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>

        {postError && <p className="text-red-600 dark:text-red-400 text-xs">{postError}</p>}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors
            ${filter === 'all' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-950/40' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 shadow-sm'}`}
        >
          All
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors capitalize
              ${filter === c.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-950/40' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 shadow-sm'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center mx-auto mb-3">
            <MessageSquare size={20} className="text-indigo-500 dark:text-indigo-400" />
          </div>
          <p className="text-gray-900 dark:text-white font-medium mb-1">No posts yet</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Be the first to share feedback!</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(post => {
          const meta        = categoryMeta(post.category)
          const liked        = likedIds.has(post.id)
          const isOwn        = post.user_id === user?.id
          const displayName  = post.is_anonymous ? 'Anonymous' : (post.author_name || 'Unknown')
          const isExpanded   = expandedId === post.id
          const commentsLoading = commentsLoadingId === post.id
          const postComments = comments[post.id] ?? []

          return (
            <div key={post.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${post.is_anonymous ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white'}`}>
                    {post.is_anonymous ? '?' : displayName[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white font-medium">{displayName}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{timeAgo(post.created_at)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize flex items-center gap-1 ${meta.style}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                  {isOwn && (
                    <button
                      onClick={() => setConfirmDeletePost(post)}
                      className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      aria-label="Delete post"
                      title="Delete post"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-gray-800 dark:text-gray-200 text-sm mt-3 whitespace-pre-wrap leading-relaxed">{post.content}</p>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => toggleLike(post.id)}
                  aria-pressed={liked}
                  aria-label={liked ? 'Unlike post' : 'Like post'}
                  className={`flex items-center gap-1.5 text-xs transition-colors ${liked ? 'text-pink-600 dark:text-pink-400' : 'text-gray-400 dark:text-gray-500 hover:text-pink-600 dark:hover:text-pink-400'}`}
                >
                  <Heart size={13} fill={liked ? 'currentColor' : 'none'} />
                  {post.like_count > 0 ? post.like_count : 'Like'}
                </button>
                <button
                  onClick={() => toggleExpand(post.id)}
                  aria-expanded={isExpanded}
                  className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <MessageSquare size={13} /> {post.comment_count > 0 ? post.comment_count : 'Comment'}
                </button>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
                  {commentsLoading && (
                    <div className="space-y-2">
                      {[1, 2].map(i => (
                        <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  )}

                  {!commentsLoading && postComments.length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic">No comments yet — be the first to reply.</p>
                  )}

                  {!commentsLoading && postComments.map(c => (
                    <div key={c.id} className="flex items-start gap-2.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0
                        ${c.is_admin ? 'bg-gradient-to-br from-amber-500 to-orange-600' : c.is_anonymous ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gradient-to-br from-indigo-400 to-violet-500'}`}>
                        {c.is_admin ? <ShieldCheck size={12} /> : c.is_anonymous ? '?' : (c.author_name || 'U')[0]?.toUpperCase()}
                      </div>
                      <div className={`flex-1 rounded-xl px-3 py-2 ${c.is_admin ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800' : 'bg-gray-50 dark:bg-gray-900'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs text-gray-900 dark:text-white font-medium">
                              {c.is_admin ? 'StudyFlow Admin' : c.is_anonymous ? 'Anonymous' : (c.author_name || 'Unknown')}
                            </p>
                            {c.is_admin && (
                              <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">Admin</span>
                            )}
                          </div>
                          {c.user_id === user?.id && (
                            <button
                              onClick={() => deleteComment(post.id, c.id)}
                              aria-label="Delete comment"
                              className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            >
                              <X size={11} />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">{c.content}</p>
                      </div>
                    </div>
                  ))}

                  <div>
                    <div className="flex items-center gap-2">
                      <input
                        ref={isExpanded ? commentInputRef : null}
                        value={commentDrafts[post.id] || ''}
                        onChange={e => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleAddComment(post.id)}
                        placeholder="Write a comment..."
                        aria-label="Write a comment"
                        className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={!commentDrafts[post.id]?.trim() || commentPosting === post.id}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-3 py-2 rounded-xl transition-colors flex items-center justify-center min-w-[52px]"
                      >
                        {commentPosting === post.id ? <Loader2 size={13} className="animate-spin" /> : 'Reply'}
                      </button>
                    </div>
                    {commentErrors[post.id] && (
                      <p className="text-red-600 dark:text-red-400 text-[10px] mt-1">{commentErrors[post.id]}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {confirmDeletePost && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && setConfirmDeletePost(null)}
        >
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-center mx-auto mb-3">
                <Trash2 size={20} className="text-red-500 dark:text-red-400" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Delete this post?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">This cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeletePost(null)}
                disabled={deletingPost}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl py-2 text-sm font-medium transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePost}
                disabled={deletingPost}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl py-2 text-sm transition-colors disabled:opacity-40"
              >
                {deletingPost ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}