import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useFeedback } from '../hooks/useFeedback'
import {
  AlertTriangle,
  MessageSquare,
  ThumbsUp,
  ShieldCheck,
  MoreHorizontal,
  Trash2,
  Loader2,
  Send,
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

function Avatar({ name, isAnonymous, size = 'md' }) {
  const dims = size === 'sm' ? 'w-6 h-6 text-[10px]' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'
  return (
    <div className={`rounded-full flex items-center justify-center font-bold flex-shrink-0 ${dims}
      ${isAnonymous ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white'}`}>
      {isAnonymous ? '?' : (name || 'U')[0]?.toUpperCase()}
    </div>
  )
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
  const [openMenuId, setOpenMenuId]         = useState(null)

  const commentInputRef = useRef(null)

  useEffect(() => {
    if (!confirmDeletePost) return
    const onKey = (e) => { if (e.key === 'Escape' && !deletingPost) setConfirmDeletePost(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmDeletePost, deletingPost])

  // Close the "···" post menu on any outside click
  useEffect(() => {
    if (!openMenuId) return
    const onDocClick = () => setOpenMenuId(null)
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [openMenuId])

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
      <div className="space-y-4 animate-pulse max-w-2xl mx-auto">
        <div className="h-28 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg" />
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">

      <div className="px-1">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Feedback & Reports</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
          Share ideas, report bugs, and see what other students are saying.
        </p>
      </div>

      {/* Composer */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 shadow-sm">
        <div className="flex items-start gap-2.5">
          <Avatar name={user?.name} isAnonymous={false} />
          <textarea
            value={content}
            onChange={e => setContent(e.target.value.slice(0, MAX_LEN))}
            placeholder={`What's on your mind${user?.name ? `, ${user.name.split(' ')[0]}` : ''}?`}
            rows={2}
            aria-label="Write feedback"
            className="flex-1 bg-gray-100 dark:bg-gray-900 border-none rounded-2xl px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-950/40 transition resize-none text-sm"
          />
        </div>
        <div className="flex justify-end">
          <span className={`text-[10px] ${remaining <= 20 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
            {remaining} left
          </span>
        </div>

        <div className="h-px bg-gray-100 dark:bg-gray-700" />

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                aria-pressed={category === c.id}
                className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-colors flex items-center gap-1.5
                  ${category === c.id ? c.style : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                {c.label}
              </button>
            ))}

            <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 ml-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
                className="accent-blue-600 w-3.5 h-3.5"
              />
              Post anonymously
            </label>
          </div>

          <button
            onClick={handlePost}
            disabled={!content.trim() || posting}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-1.5 rounded-full transition-colors"
          >
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>

        {postError && <p className="text-red-600 dark:text-red-400 text-xs">{postError}</p>}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap px-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors
            ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        >
          All
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors capitalize
              ${filter === c.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800 flex items-center justify-center mx-auto mb-3">
            <MessageSquare size={20} className="text-blue-500 dark:text-blue-400" />
          </div>
          <p className="text-gray-900 dark:text-white font-medium mb-1">No posts yet</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Be the first to share feedback!</p>
        </div>
      )}

      {/* Feed */}
      <div className="space-y-3">
        {filtered.map(post => {
          const meta          = categoryMeta(post.category)
          const liked         = likedIds.has(post.id)
          const isOwn         = post.user_id === user?.id
          const displayName   = post.is_anonymous ? 'Anonymous' : (post.author_name || 'Unknown')
          const isExpanded    = expandedId === post.id
          const commentsLoading = commentsLoadingId === post.id
          const postComments  = comments[post.id] ?? []
          const menuOpen      = openMenuId === post.id

          return (
            <div key={post.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
              <div className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={displayName} isAnonymous={post.is_anonymous} />
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white font-semibold leading-tight">{displayName}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                        {timeAgo(post.created_at)}
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <span className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </p>
                    </div>
                  </div>

                  {isOwn && (
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(menuOpen ? null : post.id) }}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        aria-label="Post options"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {menuOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-8 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]"
                        >
                          <button
                            onClick={() => { setOpenMenuId(null); setConfirmDeletePost(post) }}
                            className="w-full text-left px-3.5 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 size={14} /> Delete post
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-gray-800 dark:text-gray-200 text-sm mt-3 whitespace-pre-wrap leading-relaxed">{post.content}</p>
              </div>

              {(post.like_count > 0 || post.comment_count > 0) && (
                <div className="flex items-center justify-between px-4 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {post.like_count > 0 ? (
                    <span className="flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <ThumbsUp size={9} className="text-white" fill="currentColor" />
                      </span>
                      {post.like_count}
                    </span>
                  ) : <span />}
                  {post.comment_count > 0 && (
                    <span>{post.comment_count} comment{post.comment_count !== 1 ? 's' : ''}</span>
                  )}
                </div>
              )}

              <div className="mx-4 h-px bg-gray-100 dark:bg-gray-700" />

              <div className="flex items-center px-2 py-1">
                <button
                  onClick={() => toggleLike(post.id)}
                  aria-pressed={liked}
                  aria-label={liked ? 'Unlike post' : 'Like post'}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors
                    ${liked ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} hover:bg-gray-50 dark:hover:bg-gray-700`}
                >
                  <ThumbsUp size={16} fill={liked ? 'currentColor' : 'none'} />
                  Like
                </button>
                <button
                  onClick={() => toggleExpand(post.id)}
                  aria-expanded={isExpanded}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <MessageSquare size={16} /> Comment
                </button>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 space-y-3">
                  {commentsLoading && (
                    <div className="space-y-2">
                      {[1, 2].map(i => (
                        <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />
                      ))}
                    </div>
                  )}

                  {!commentsLoading && postComments.length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic">No comments yet — be the first to reply.</p>
                  )}

                  {!commentsLoading && postComments.map(c => (
                    <div key={c.id} className="flex items-start gap-2">
                      <Avatar name={c.author_name} isAnonymous={c.is_anonymous} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className={`inline-block rounded-2xl px-3 py-2 max-w-full ${c.is_admin ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800' : 'bg-gray-100 dark:bg-gray-900'}`}>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs text-gray-900 dark:text-white font-semibold">
                              {c.is_admin ? 'StudyFlow Admin' : c.is_anonymous ? 'Anonymous' : (c.author_name || 'Unknown')}
                            </p>
                            {c.is_admin && <ShieldCheck size={11} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">{c.content}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 ml-1">
                          {c.created_at && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">{timeAgo(c.created_at)}</span>
                          )}
                          {c.user_id === user?.id && (
                            <button
                              onClick={() => deleteComment(post.id, c.id)}
                              aria-label="Delete comment"
                              className="text-[10px] text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 font-medium transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-start gap-2 pt-1">
                    <Avatar name={user?.name} isAnonymous={false} size="sm" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <input
                          ref={isExpanded ? commentInputRef : null}
                          value={commentDrafts[post.id] || ''}
                          onChange={e => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleAddComment(post.id)}
                          placeholder="Write a comment..."
                          aria-label="Write a comment"
                          className="flex-1 bg-gray-100 dark:bg-gray-900 border-none rounded-full px-4 py-2 text-xs text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-950/40 transition"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={!commentDrafts[post.id]?.trim() || commentPosting === post.id}
                          aria-label="Send comment"
                          className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors"
                        >
                          {commentPosting === post.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
                        </button>
                      </div>
                      {commentErrors[post.id] && (
                        <p className="text-red-600 dark:text-red-400 text-[10px] mt-1 ml-1">{commentErrors[post.id]}</p>
                      )}
                    </div>
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
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl py-2 text-sm transition-colors disabled:opacity-40"
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