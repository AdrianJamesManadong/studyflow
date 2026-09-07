import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'
import { Navigate } from 'react-router-dom'
import { useFeedback } from '../hooks/useFeedback'
import {
  Info,
  AlertTriangle,
  CheckCircle2,
  OctagonAlert,
  Users,
  Megaphone,
  MessageCircle,
  Trash2,
  RefreshCw,
  BookOpen,
  ClipboardList,
  BarChart3,
  NotebookPen,
  Search,
  UserSearch,
  Pencil,
  Save,
  Heart,
  ChevronUp,
  ChevronDown,
  Send,
  X,
  MapPin,
} from 'lucide-react'

const ADMIN_EMAIL = 'adrianjames082506@gmail.com'

const FEEDBACK_CATEGORIES = [
  { id: 'general', label: 'General', style: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' },
  { id: 'bug',     label: 'Bug',     style: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' },
  { id: 'feature', label: 'Feature', style: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
]
function feedbackCategoryMeta(id) {
  return FEEDBACK_CATEGORIES.find(c => c.id === id) || FEEDBACK_CATEGORIES[0]
}

// ── Announcement type config: icon, accent classes, and card styling in one place ──
const ANN_TYPES = {
  info:    { Icon: Info,           label: 'Info',    chip: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400',   card: 'bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800' },
  warning: { Icon: AlertTriangle,  label: 'Warning',  chip: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400',     card: 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' },
  success: { Icon: CheckCircle2,   label: 'Success',  chip: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400', card: 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' },
  danger:  { Icon: OctagonAlert,   label: 'Danger',   chip: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400',           card: 'bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-800' },
}

const TABS = [
  { key: 'users',         label: 'Users',         Icon: Users },
  { key: 'announcements', label: 'Announcements', Icon: Megaphone },
  { key: 'feedback',      label: 'Feedback',      Icon: MessageCircle },
]

function IconButton({ Icon, onClick, title, tone = 'default', className = '' }) {
  const toneClass = tone === 'danger'
    ? 'text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
    : 'text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`w-7 h-7 flex items-center justify-center rounded-lg transition ${toneClass} ${className}`}
    >
      <Icon aria-hidden="true" size={15} />
    </button>
  )
}

function ModalIcon({ Icon, tone = 'danger' }) {
  const toneClass = tone === 'danger' ? 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400' : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
  return (
    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${toneClass}`}>
      <Icon aria-hidden="true" size={22} />
    </div>
  )
}

function UserAvatar({ user, size = 'sm' }) {
  const [imgError, setImgError] = useState(false)
  const avatarUrl = user?.avatar_url || user?.raw_user_meta_data?.avatar_url
  const name = user?.name || user?.raw_user_meta_data?.name || user?.email
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-12 h-12 text-xl'

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700`}
      />
    )
  }
  return (
    <div className={`${sizeClass} rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

export default function Admin() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ users: 0, assignments: 0, grades: 0, notes: 0, subjects: 0 })
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('users')
  const [selectedUser, setSelectedUser] = useState(null)
  const [userDetails, setUserDetails] = useState(null)
  const [userDetailsLoading, setUserDetailsLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [annForm, setAnnForm] = useState({ title: '', message: '', type: 'info' })
  const [annLoading, setAnnLoading] = useState(false)
  const [annSuccess, setAnnSuccess] = useState(false)
  const [editingAnn, setEditingAnn] = useState(null)
  const [confirmDeleteAnn, setConfirmDeleteAnn] = useState(null)

  // ── Feedback moderation state ──
  const {
    posts: feedbackPosts,
    comments: feedbackComments,
    loading: feedbackLoading,
    error: feedbackError,
    fetchComments: fetchFeedbackComments,
    addComment: addFeedbackComment,
    deletePost: deleteFeedbackPost,
    deleteComment: deleteFeedbackComment,
  } = useFeedback()
  const [feedbackFilter, setFeedbackFilter] = useState('all')
  const [expandedFeedbackId, setExpandedFeedbackId] = useState(null)
  const [adminReplyDrafts, setAdminReplyDrafts] = useState({})
  const [adminReplyPosting, setAdminReplyPosting] = useState(null)
  const [confirmDeleteFeedbackPost, setConfirmDeleteFeedbackPost] = useState(null)
  const [deletingFeedbackPost, setDeletingFeedbackPost] = useState(false)
  const [confirmDeleteFeedbackComment, setConfirmDeleteFeedbackComment] = useState(null)

  if (user?.email !== ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace />
  }

  useEffect(() => {
    fetchData()
    fetchAnnouncements()
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('admin_user_stats')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setUsers(data)
      setStats({
        users: data.length,
        assignments: data.reduce((acc, u) => acc + parseInt(u.assignment_count || 0), 0),
        grades: data.reduce((acc, u) => acc + parseInt(u.grade_count || 0), 0),
        notes: data.reduce((acc, u) => acc + parseInt(u.note_count || 0), 0),
        subjects: data.reduce((acc, u) => acc + parseInt(u.subject_count || 0), 0),
      })
    }
    setLoading(false)
  }

  async function fetchAnnouncements() {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setAnnouncements(data)
  }

  async function fetchUserDetails(userId) {
    setUserDetails(null)
    setUserDetailsLoading(true)

    const [subjectsRes, assignmentsRes, gradesRes, notesRes] = await Promise.all([
      supabase.from('subjects').select('*').eq('user_id', userId),
      supabase.from('assignments').select('*').eq('user_id', userId).order('due_date'),
      supabase.from('grades').select('*').eq('user_id', userId),
      supabase.from('notes').select('*').eq('user_id', userId),
    ])

    setUserDetails({
      subjects: subjectsRes.data ?? [],
      assignments: assignmentsRes.data ?? [],
      grades: gradesRes.data ?? [],
      notes: notesRes.data ?? [],
      errors: {
        subjects: subjectsRes.error?.message,
        assignments: assignmentsRes.error?.message,
        grades: gradesRes.error?.message,
        notes: notesRes.error?.message,
      }
    })
    setUserDetailsLoading(false)
  }

  async function handleDeleteUser(u) {
    await supabase.from('assignments').delete().eq('user_id', u.id)
    await supabase.from('grades').delete().eq('user_id', u.id)
    await supabase.from('notes').delete().eq('user_id', u.id)
    await supabase.from('subjects').delete().eq('user_id', u.id)
    setUsers(prev => prev.filter(x => x.id !== u.id))
    setConfirmDelete(null)
    if (selectedUser?.id === u.id) {
      setSelectedUser(null)
      setUserDetails(null)
    }
    fetchData()
  }

  async function handlePostAnnouncement() {
    if (!annForm.title.trim() || !annForm.message.trim()) return
    setAnnLoading(true)

    if (editingAnn) {
      const editingId = editingAnn.id
      const { data, error } = await supabase
        .from('announcements')
        .update({ title: annForm.title, message: annForm.message, type: annForm.type })
        .eq('id', editingId)
        .select()

      if (!error) {
        setAnnouncements(prev => prev.map(a =>
          a.id === editingId
            ? { ...a, title: annForm.title, message: annForm.message, type: annForm.type }
            : a
        ))
        setAnnSuccess(true)
        setEditingAnn(null)
        setAnnForm({ title: '', message: '', type: 'info' })
        fetchAnnouncements()
        setTimeout(() => setAnnSuccess(false), 3000)
      }
    } else {
      const { error } = await supabase.from('announcements').insert({
        title: annForm.title,
        message: annForm.message,
        type: annForm.type,
        created_by: user.id,
      })
      if (!error) {
        setAnnSuccess(true)
        setAnnForm({ title: '', message: '', type: 'info' })
        fetchAnnouncements()
        setTimeout(() => setAnnSuccess(false), 3000)
      }
    }
    setAnnLoading(false)
  }

  function handleEditAnn(a) {
    setEditingAnn(a)
    setAnnForm({ title: a.title, message: a.message, type: a.type })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingAnn(null)
    setAnnForm({ title: '', message: '', type: 'info' })
  }

  async function handleDeleteAnnouncement(id) {
    await supabase.from('announcements').delete().eq('id', id)
    setAnnouncements(prev => prev.filter(a => a.id !== id))
    setConfirmDeleteAnn(null)
  }

  function timeAgo(dateStr) {
    if (!dateStr) return 'Never'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  function getSubjectColor(colorField) {
    if (!colorField) return null
    if (typeof colorField === 'string' && (colorField.startsWith('#') || colorField.startsWith('rgb'))) return colorField
    if (typeof colorField === 'object') {
      if (colorField.hex) return colorField.hex
      if (colorField.color) return colorField.color
    }
    return null
  }

  // ── Feedback moderation handlers ──
  async function toggleFeedbackExpand(postId) {
    if (expandedFeedbackId === postId) { setExpandedFeedbackId(null); return }
    setExpandedFeedbackId(postId)
    if (!feedbackComments[postId]) await fetchFeedbackComments(postId)
  }

  async function handleAdminReply(postId) {
    const text = (adminReplyDrafts[postId] || '').trim()
    if (!text) return
    setAdminReplyPosting(postId)
    try {
      await addFeedbackComment(postId, { content: text, isAnonymous: false, authorName: 'StudyFlow Admin', isAdmin: true })
      setAdminReplyDrafts(prev => ({ ...prev, [postId]: '' }))
    } finally {
      setAdminReplyPosting(null)
    }
  }

  async function handleDeleteFeedbackPost() {
    setDeletingFeedbackPost(true)
    try {
      await deleteFeedbackPost(confirmDeleteFeedbackPost.id)
      setConfirmDeleteFeedbackPost(null)
    } finally {
      setDeletingFeedbackPost(false)
    }
  }

  async function handleDeleteFeedbackComment() {
    const { postId, commentId } = confirmDeleteFeedbackComment
    await deleteFeedbackComment(postId, commentId)
    setConfirmDeleteFeedbackComment(null)
  }

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.name?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredFeedback = feedbackFilter === 'all'
    ? feedbackPosts
    : feedbackPosts.filter(p => p.category === feedbackFilter)

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h2>
            <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">Admin</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">Manage StudyFlow users and announcements</p>
        </div>
        <button
          onClick={() => { fetchData(); fetchAnnouncements() }}
          className="flex items-center gap-1.5 text-xs sm:text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 sm:px-4 py-2 rounded-lg transition shadow-sm"
        >
          <RefreshCw aria-hidden="true" size={14} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Stats — 2-col on mobile, 5-col on lg, each with its own accent */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {[
          { label: 'Total Users', value: stats.users,       Icon: Users,         accent: 'text-indigo-600 dark:text-indigo-400',  glow: 'border-indigo-100 dark:border-indigo-900' },
          { label: 'Subjects',    value: stats.subjects,    Icon: BookOpen,      accent: 'text-sky-600 dark:text-sky-400',     glow: 'border-sky-100 dark:border-sky-900' },
          { label: 'Assignments', value: stats.assignments, Icon: ClipboardList, accent: 'text-amber-600 dark:text-amber-400',   glow: 'border-amber-100 dark:border-amber-900' },
          { label: 'Grades',      value: stats.grades,      Icon: BarChart3,     accent: 'text-emerald-600 dark:text-emerald-400', glow: 'border-emerald-100 dark:border-emerald-900' },
          { label: 'Notes',       value: stats.notes,       Icon: NotebookPen,   accent: 'text-violet-600 dark:text-violet-400',  glow: 'border-violet-100 dark:border-violet-900' },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`bg-white dark:bg-gray-800 border rounded-xl p-3 sm:p-4 shadow-sm ${stat.glow} ${i === 4 ? 'col-span-2 lg:col-span-1' : ''}`}
          >
            <stat.Icon aria-hidden="true" size={22} className={`mb-1.5 sm:mb-2 block ${stat.accent}`} />
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-1 overflow-x-auto shadow-sm">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap
              ${activeTab === tab.key ? 'bg-indigo-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <tab.Icon aria-hidden="true" size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Users Tab ─── */}
      {activeTab === 'users' && (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 space-y-3 min-w-0">
            <div className="relative">
              <Search aria-hidden="true" size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 transition text-sm"
              />
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : (
              <>
                {/* ── Desktop table (hidden on mobile) ── */}
                <div className="hidden md:block bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          <th className="text-left px-4 py-3 text-xs text-gray-400 dark:text-gray-500 font-medium">User</th>
                          <th className="text-left px-4 py-3 text-xs text-gray-400 dark:text-gray-500 font-medium">Joined</th>
                          <th className="text-left px-4 py-3 text-xs text-gray-400 dark:text-gray-500 font-medium">Last Seen</th>
                          <th className="text-center px-4 py-3 text-xs text-gray-400 dark:text-gray-500 font-medium">Subjects</th>
                          <th className="text-center px-4 py-3 text-xs text-gray-400 dark:text-gray-500 font-medium">Assignments</th>
                          <th className="text-center px-4 py-3 text-xs text-gray-400 dark:text-gray-500 font-medium">Grades</th>
                          <th className="text-center px-4 py-3 text-xs text-gray-400 dark:text-gray-500 font-medium">Notes</th>
                          <th className="text-center px-4 py-3 text-xs text-gray-400 dark:text-gray-500 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(u => (
                          <tr
                            key={u.id}
                            className={`border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer
                              ${selectedUser?.id === u.id ? 'bg-indigo-50 dark:bg-indigo-950/30' : ''}
                              ${u.email === ADMIN_EMAIL ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}
                            onClick={() => { setSelectedUser(u); fetchUserDetails(u.id) }}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <UserAvatar user={u} size="sm" />
                                <div>
                                  <p className="text-gray-900 dark:text-white text-sm font-medium flex items-center gap-1">
                                    {u.name || 'No name'}
                                    {u.email === ADMIN_EMAIL && (
                                      <span className="text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">Admin</span>
                                    )}
                                  </p>
                                  <p className="text-gray-400 dark:text-gray-500 text-xs">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                              {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                              {timeAgo(u.last_seen_at || u.last_sign_in_at)}
                            </td>
                            <td className="px-4 py-3 text-center"><span className="text-sky-600 dark:text-sky-400 font-medium text-sm">{u.subject_count}</span></td>
                            <td className="px-4 py-3 text-center"><span className="text-amber-600 dark:text-amber-400 font-medium text-sm">{u.assignment_count}</span></td>
                            <td className="px-4 py-3 text-center"><span className="text-emerald-600 dark:text-emerald-400 font-medium text-sm">{u.grade_count}</span></td>
                            <td className="px-4 py-3 text-center"><span className="text-violet-600 dark:text-violet-400 font-medium text-sm">{u.note_count}</span></td>
                            <td className="px-4 py-3 text-center">
                              {u.email !== ADMIN_EMAIL && (
                                <IconButton
                                  Icon={Trash2}
                                  tone="danger"
                                  title="Delete user"
                                  onClick={e => { e.stopPropagation(); setConfirmDelete(u) }}
                                  className="mx-auto"
                                />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filtered.length === 0 && (
                      <div className="text-center py-12">
                        <UserSearch aria-hidden="true" size={30} className="text-gray-300 dark:text-gray-600 block mb-2 mx-auto" />
                        <p className="text-gray-400 dark:text-gray-500 text-sm">No users found.</p>
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-gray-400 dark:text-gray-500 text-xs">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* ── Mobile user cards (hidden on md+) ── */}
                <div className="md:hidden space-y-2">
                  {filtered.length === 0 ? (
                    <div className="text-center py-12">
                      <UserSearch aria-hidden="true" size={30} className="text-gray-300 dark:text-gray-600 block mb-2 mx-auto" />
                      <p className="text-gray-400 dark:text-gray-500 text-sm">No users found.</p>
                    </div>
                  ) : (
                    filtered.map(u => (
                      <div
                        key={u.id}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && (setSelectedUser(u), fetchUserDetails(u.id))}
                        onClick={() => { setSelectedUser(u); fetchUserDetails(u.id) }}
                        className={`w-full text-left bg-white dark:bg-gray-800 border rounded-xl px-4 py-3 transition active:scale-[0.98] cursor-pointer shadow-sm
                          ${selectedUser?.id === u.id ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/20' : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'}
                          ${u.email === ADMIN_EMAIL ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <UserAvatar user={u} size="sm" />
                            <div className="min-w-0">
                              <p className="text-gray-900 dark:text-white text-sm font-medium flex items-center gap-1 flex-wrap">
                                <span className="truncate">{u.name || 'No name'}</span>
                                {u.email === ADMIN_EMAIL && (
                                  <span className="text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">Admin</span>
                                )}
                              </p>
                              <p className="text-gray-400 dark:text-gray-500 text-xs truncate">{u.email}</p>
                              <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                                Last seen {timeAgo(u.last_seen_at || u.last_sign_in_at)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex gap-1.5 flex-wrap justify-end">
                              <span className="text-sky-600 dark:text-sky-400 text-xs font-medium bg-sky-50 dark:bg-sky-950/40 px-1.5 py-0.5 rounded-md">{u.subject_count}S</span>
                              <span className="text-amber-600 dark:text-amber-400 text-xs font-medium bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-md">{u.assignment_count}A</span>
                              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">{u.grade_count}G</span>
                              <span className="text-violet-600 dark:text-violet-400 text-xs font-medium bg-violet-50 dark:bg-violet-950/40 px-1.5 py-0.5 rounded-md">{u.note_count}N</span>
                            </div>
                            {u.email !== ADMIN_EMAIL && (
                              <IconButton
                                Icon={Trash2}
                                tone="danger"
                                title="Delete user"
                                onClick={e => { e.stopPropagation(); setConfirmDelete(u) }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <p className="text-gray-400 dark:text-gray-500 text-xs px-1 pt-1">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>
                </div>
              </>
            )}
          </div>

          {/* ── Desktop side panel ── */}
          {selectedUser && (
            <div className="hidden lg:block w-80 flex-shrink-0 space-y-3">
              <UserDetailPanel
                selectedUser={selectedUser}
                userDetails={userDetails}
                userDetailsLoading={userDetailsLoading}
                onClose={() => { setSelectedUser(null); setUserDetails(null) }}
                onDeleteRequest={() => setConfirmDelete(selectedUser)}
                timeAgo={timeAgo}
                getSubjectColor={getSubjectColor}
                ADMIN_EMAIL={ADMIN_EMAIL}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Mobile bottom sheet for user detail ── */}
      {selectedUser && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => { setSelectedUser(null); setUserDetails(null) }}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 rounded-t-2xl max-h-[80vh] overflow-y-auto shadow-xl">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full" />
            </div>
            <div className="px-4 pb-6">
              <UserDetailPanel
                selectedUser={selectedUser}
                userDetails={userDetails}
                userDetailsLoading={userDetailsLoading}
                onClose={() => { setSelectedUser(null); setUserDetails(null) }}
                onDeleteRequest={() => setConfirmDelete(selectedUser)}
                timeAgo={timeAgo}
                getSubjectColor={getSubjectColor}
                ADMIN_EMAIL={ADMIN_EMAIL}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Announcements Tab ─── */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
                  {editingAnn ? <Pencil aria-hidden="true" size={18} className="text-indigo-600 dark:text-indigo-400" /> : <Megaphone aria-hidden="true" size={18} className="text-indigo-600 dark:text-indigo-400" />}
                </div>
                <div>
                  <h3 className="text-gray-900 dark:text-white font-semibold">
                    {editingAnn ? 'Edit Announcement' : 'Post Announcement'}
                  </h3>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                    {editingAnn ? 'Update the announcement below.' : 'Visible to all users on their dashboard.'}
                  </p>
                </div>
              </div>
              {editingAnn && (
                <button
                  onClick={handleCancelEdit}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg transition flex-shrink-0"
                >
                  Cancel
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Title</label>
              <input
                value={annForm.title}
                onChange={e => setAnnForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. System Maintenance"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 transition text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Message</label>
              <textarea
                value={annForm.message}
                onChange={e => setAnnForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Write your announcement here..."
                rows={3}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 transition text-sm resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Type</label>
              <div className="grid grid-cols-2 sm:flex gap-2">
                {Object.entries(ANN_TYPES).map(([t, cfg]) => (
                  <button
                    key={t}
                    onClick={() => setAnnForm(f => ({ ...f, type: t }))}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium border transition
                      ${annForm.type === t ? cfg.chip : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                  >
                    <cfg.Icon aria-hidden="true" size={14} />
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {annSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-2.5 flex items-center gap-2">
                <CheckCircle2 aria-hidden="true" size={16} className="text-emerald-600 dark:text-emerald-400" />
                <p className="text-emerald-600 dark:text-emerald-400 text-sm">Announcement {editingAnn ? 'updated' : 'posted'} successfully!</p>
              </div>
            )}

            <button
              onClick={handlePostAnnouncement}
              disabled={annLoading || !annForm.title.trim() || !annForm.message.trim()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-lg transition text-sm"
            >
              {annLoading ? (
                'Saving...'
              ) : editingAnn ? (
                <><Save aria-hidden="true" size={15} /> Save Changes</>
              ) : (
                <><Megaphone aria-hidden="true" size={15} /> Post Announcement</>
              )}
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-gray-900 dark:text-white font-semibold">Posted Announcements ({announcements.length})</h3>
            {announcements.length === 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-8 text-center shadow-sm">
                <Megaphone aria-hidden="true" size={28} className="text-gray-300 dark:text-gray-600 block mb-2 mx-auto" />
                <p className="text-gray-400 dark:text-gray-500 text-sm">No announcements yet.</p>
              </div>
            )}
            {announcements.map(a => {
              const cfg = ANN_TYPES[a.type] ?? ANN_TYPES.info
              return (
                <div key={a.id} className={`border rounded-xl p-4 bg-white dark:bg-gray-800 shadow-sm ${cfg.card} ${editingAnn?.id === a.id ? 'ring-2 ring-indigo-400' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <cfg.Icon aria-hidden="true" size={14} className={cfg.chip.split(' ').find(c => c.startsWith('text-'))} />
                        <p className="font-semibold text-gray-900 dark:text-white">{a.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${cfg.chip}`}>{a.type}</span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">{a.message}</p>
                      <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">{timeAgo(a.created_at)}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1 flex-shrink-0">
                      <IconButton Icon={Pencil} title="Edit" onClick={() => handleEditAnn(a)} />
                      <IconButton Icon={Trash2} tone="danger" title="Delete" onClick={() => setConfirmDeleteAnn(a)} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── Feedback Tab ─── */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFeedbackFilter('all')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${feedbackFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
              All
            </button>
            {FEEDBACK_CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setFeedbackFilter(c.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition ${feedbackFilter === c.id ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {feedbackError && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle aria-hidden="true" size={14} />
              {feedbackError}
            </div>
          )}

          {feedbackLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredFeedback.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-8 text-center shadow-sm">
              <MessageCircle aria-hidden="true" size={28} className="text-gray-300 dark:text-gray-600 block mb-2 mx-auto" />
              <p className="text-gray-400 dark:text-gray-500 text-sm">No feedback posts yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFeedback.map(post => {
                const meta = feedbackCategoryMeta(post.category)
                const displayName = post.is_anonymous ? 'Anonymous' : (post.author_name || 'Unknown')
                const isExpanded = expandedFeedbackId === post.id
                return (
                  <div key={post.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-gray-900 dark:text-white text-sm font-medium">{displayName}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${meta.style}`}>{meta.label}</span>
                        </div>
                        <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">{timeAgo(post.created_at)}</p>
                      </div>
                      <IconButton Icon={Trash2} tone="danger" title="Delete post" onClick={() => setConfirmDeleteFeedbackPost(post)} />
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 text-sm mt-2 whitespace-pre-wrap">{post.content}</p>

                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                        <Heart aria-hidden="true" size={14} />
                        {post.like_count}
                      </span>
                      <button
                        onClick={() => toggleFeedbackExpand(post.id)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                      >
                        <MessageCircle aria-hidden="true" size={14} />
                        {post.comment_count > 0 ? post.comment_count : 'View'}
                        {isExpanded ? <ChevronUp aria-hidden="true" size={14} /> : <ChevronDown aria-hidden="true" size={14} />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
                        {(feedbackComments[post.id] ?? []).map(c => (
                          <div key={c.id} className="flex items-start justify-between gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs text-gray-900 dark:text-white font-medium">
                                  {c.is_admin ? 'StudyFlow Admin' : c.is_anonymous ? 'Anonymous' : (c.author_name || 'Unknown')}
                                </p>
                                {c.is_admin && (
                                  <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">Admin</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{c.content}</p>
                            </div>
                            <button
                              onClick={() => setConfirmDeleteFeedbackComment({ postId: post.id, commentId: c.id })}
                              className="text-gray-300 dark:text-gray-600 hover:text-red-600 dark:hover:text-red-400 transition flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                              title="Delete comment"
                              aria-label="Delete comment"
                            >
                              <X aria-hidden="true" size={12} />
                            </button>
                          </div>
                        ))}

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            value={adminReplyDrafts[post.id] || ''}
                            onChange={e => setAdminReplyDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleAdminReply(post.id)}
                            placeholder="Reply as StudyFlow Admin..."
                            className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 transition"
                          />
                          <button
                            onClick={() => handleAdminReply(post.id)}
                            disabled={!adminReplyDrafts[post.id]?.trim() || adminReplyPosting === post.id}
                            className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-2 rounded-lg transition whitespace-nowrap"
                          >
                            {adminReplyPosting === post.id ? (
                              '…'
                            ) : (
                              <><Send aria-hidden="true" size={14} /> Reply</>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirm Delete User Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm space-y-4 shadow-xl">
            <div className="text-center">
              <ModalIcon Icon={Trash2} tone="danger" />
              <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Delete User Data?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                This will permanently delete all data for{' '}
                <span className="text-gray-900 dark:text-white font-medium">{confirmDelete.name || confirmDelete.email}</span>.
                This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg py-3 sm:py-2 text-sm transition">Cancel</button>
              <button onClick={() => handleDeleteUser(confirmDelete)} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg py-3 sm:py-2 text-sm transition">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Announcement Modal */}
      {confirmDeleteAnn && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm space-y-4 shadow-xl">
            <div className="text-center">
              <ModalIcon Icon={Megaphone} tone="danger" />
              <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Delete Announcement?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Are you sure you want to delete{' '}
                <span className="text-gray-900 dark:text-white font-medium">"{confirmDeleteAnn.title}"</span>?
                It will be removed from all users' dashboards.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteAnn(null)} className="flex-1 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg py-3 sm:py-2 text-sm transition">Cancel</button>
              <button onClick={() => handleDeleteAnnouncement(confirmDeleteAnn.id)} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg py-3 sm:py-2 text-sm transition">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Feedback Post Modal */}
      {confirmDeleteFeedbackPost && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm space-y-4 shadow-xl">
            <div className="text-center">
              <ModalIcon Icon={Trash2} tone="danger" />
              <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Delete Feedback Post?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">This will remove the post and all its comments. This cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteFeedbackPost(null)} disabled={deletingFeedbackPost} className="flex-1 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg py-3 sm:py-2 text-sm transition disabled:opacity-40">Cancel</button>
              <button onClick={handleDeleteFeedbackPost} disabled={deletingFeedbackPost} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg py-3 sm:py-2 text-sm transition disabled:opacity-40">
                {deletingFeedbackPost ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Feedback Comment Modal */}
      {confirmDeleteFeedbackComment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm space-y-4 shadow-xl">
            <div className="text-center">
              <ModalIcon Icon={Trash2} tone="danger" />
              <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Delete Comment?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">This cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteFeedbackComment(null)} className="flex-1 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg py-3 sm:py-2 text-sm transition">Cancel</button>
              <button onClick={handleDeleteFeedbackComment} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg py-3 sm:py-2 text-sm transition">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

/* ─── Extracted detail panel (reused by both desktop sidebar and mobile sheet) ─── */
function UserDetailPanel({ selectedUser, userDetails, userDetailsLoading, onClose, onDeleteRequest, timeAgo, getSubjectColor, ADMIN_EMAIL }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-900 dark:text-white font-semibold">User Details</h3>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition">
          <X aria-hidden="true" size={14} />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <UserAvatar user={selectedUser} size="lg" />
        <div>
          <p className="text-gray-900 dark:text-white font-medium">{selectedUser.name || 'No name'}</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs">{selectedUser.email}</p>
          {selectedUser.raw_user_meta_data?.school && (
            <p className="text-gray-400 dark:text-gray-500 text-xs flex items-center gap-1">
              <MapPin aria-hidden="true" size={11} />
              {selectedUser.raw_user_meta_data.school}
              {selectedUser.raw_user_meta_data?.year_level ? ` · ${selectedUser.raw_user_meta_data.year_level}` : ''}
            </p>
          )}
          <p className="text-gray-400 dark:text-gray-500 text-xs">Joined {new Date(selectedUser.created_at).toLocaleDateString()}</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs">Last seen {timeAgo(selectedUser.last_seen_at || selectedUser.last_sign_in_at)}</p>
        </div>
      </div>

      {userDetailsLoading ? (
        <div className="text-center py-6">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : userDetails ? (
        <div className="space-y-3">

          <div>
            <p className="text-gray-400 dark:text-gray-500 text-xs font-medium mb-1.5 flex items-center gap-1.5">
              <BookOpen aria-hidden="true" size={13} className="text-sky-600 dark:text-sky-400" />
              Subjects ({userDetails.subjects.length})
              {userDetails.errors?.subjects && <span className="text-red-600 dark:text-red-400 ml-1">— fetch error</span>}
            </p>
            {userDetails.subjects.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-xs">No subjects</p>
            ) : (
              <div className="space-y-1">
                {userDetails.subjects.map(s => {
                  const hexColor = getSubjectColor(s.color)
                  return (
                    <div key={s.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: hexColor || '#6366f1' }} />
                      <p className="text-gray-900 dark:text-white text-xs">{s.name}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <p className="text-gray-400 dark:text-gray-500 text-xs font-medium mb-1.5 flex items-center gap-1.5">
              <ClipboardList aria-hidden="true" size={13} className="text-amber-600 dark:text-amber-400" />
              Assignments ({userDetails.assignments.length})
              {userDetails.errors?.assignments && <span className="text-red-600 dark:text-red-400 ml-1">— fetch error</span>}
            </p>
            {userDetails.assignments.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-xs">No assignments</p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {userDetails.assignments.map(a => (
                  <div key={a.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-1.5">
                    <p className={`text-xs ${a.status === 'done' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>{a.title}</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs">Due {a.due_date}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-gray-400 dark:text-gray-500 text-xs font-medium mb-1.5 flex items-center gap-1.5">
              <BarChart3 aria-hidden="true" size={13} className="text-emerald-600 dark:text-emerald-400" />
              Grades ({userDetails.grades.length})
              {userDetails.errors?.grades && <span className="text-red-600 dark:text-red-400 ml-1">— fetch error</span>}
            </p>
            {userDetails.grades.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-xs">No grades</p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {userDetails.grades.map(g => {
                  const pct = ((g.score / g.max_score) * 100).toFixed(1)
                  return (
                    <div key={g.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-1.5">
                      <p className="text-gray-900 dark:text-white text-xs">{g.title}</p>
                      <p className={`text-xs font-medium ${parseFloat(pct) >= 90 ? 'text-emerald-600 dark:text-emerald-400' : parseFloat(pct) >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                        {pct}%
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <p className="text-gray-400 dark:text-gray-500 text-xs font-medium mb-1.5 flex items-center gap-1.5">
              <NotebookPen aria-hidden="true" size={13} className="text-violet-600 dark:text-violet-400" />
              Notes ({userDetails.notes.length})
              {userDetails.errors?.notes && <span className="text-red-600 dark:text-red-400 ml-1">— fetch error</span>}
            </p>
            {userDetails.notes.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-xs">No notes</p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {userDetails.notes.map(n => (
                  <div key={n.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-1.5">
                    <p className="text-gray-900 dark:text-white text-xs">{n.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedUser.email !== ADMIN_EMAIL && (
            <button
              onClick={onDeleteRequest}
              className="w-full flex items-center justify-center gap-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-medium py-2.5 rounded-lg transition mt-2"
            >
              <Trash2 aria-hidden="true" size={14} />
              Delete User Data
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}