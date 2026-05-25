import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'
import { Navigate } from 'react-router-dom'

const ADMIN_EMAIL = 'adrianjames082506@gmail.com'

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

      console.log('update result:', data, error)

      if (!error) {
        // Optimistically update local state immediately
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
      } else {
        console.error('Failed to update announcement:', error.message)
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
      } else {
        console.error('Failed to post announcement:', error.message)
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
    if (typeof colorField === 'string' && (colorField.startsWith('#') || colorField.startsWith('rgb'))) {
      return colorField
    }
    if (typeof colorField === 'object') {
      if (colorField.hex) return colorField.hex
      if (colorField.color) return colorField.color
    }
    return null
  }

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.name?.toLowerCase().includes(search.toLowerCase())
  )

  const annTypeStyles = {
    info: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    danger: 'bg-red-500/10 border-red-500/30 text-red-400',
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
            <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">Admin</span>
          </div>
          <p className="text-gray-400 text-sm mt-1">Manage StudyFlow users and announcements</p>
        </div>
        <button
          onClick={() => { fetchData(); fetchAnnouncements() }}
          className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: 'Total Users', value: stats.users, icon: '👥' },
          { label: 'Subjects', value: stats.subjects, icon: '📚' },
          { label: 'Assignments', value: stats.assignments, icon: '📝' },
          { label: 'Grades', value: stats.grades, icon: '📊' },
          { label: 'Notes', value: stats.notes, icon: '🗒️' },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-2xl mb-2">{stat.icon}</p>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-gray-500 text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {[
          { key: 'users', label: '👥 Users' },
          { key: 'announcements', label: '📢 Announcements' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition
              ${activeTab === tab.key ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="flex gap-4">
          <div className="flex-1 space-y-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition text-sm"
            />

            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">User</th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Joined</th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Last Seen</th>
                        <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Subjects</th>
                        <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Assignments</th>
                        <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Grades</th>
                        <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Notes</th>
                        <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(u => (
                        <tr
                          key={u.id}
                          className={`border-b border-gray-800/50 hover:bg-gray-800/50 transition cursor-pointer
                            ${selectedUser?.id === u.id ? 'bg-indigo-600/10 border-indigo-500/30' : ''}
                            ${u.email === ADMIN_EMAIL ? 'bg-indigo-600/5' : ''}`}
                          onClick={() => {
                            setSelectedUser(u)
                            fetchUserDetails(u.id)
                          }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {(u.name || u.email)?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="text-white text-sm font-medium flex items-center gap-1">
                                  {u.name || 'No name'}
                                  {u.email === ADMIN_EMAIL && (
                                    <span className="text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">Admin</span>
                                  )}
                                </p>
                                <p className="text-gray-500 text-xs">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">
                            {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{timeAgo(u.last_sign_in_at)}</td>
                          <td className="px-4 py-3 text-center"><span className="text-sky-400 font-medium text-sm">{u.subject_count}</span></td>
                          <td className="px-4 py-3 text-center"><span className="text-amber-400 font-medium text-sm">{u.assignment_count}</span></td>
                          <td className="px-4 py-3 text-center"><span className="text-emerald-400 font-medium text-sm">{u.grade_count}</span></td>
                          <td className="px-4 py-3 text-center"><span className="text-purple-400 font-medium text-sm">{u.note_count}</span></td>
                          <td className="px-4 py-3 text-center">
                            {u.email !== ADMIN_EMAIL && (
                              <button
                                onClick={e => { e.stopPropagation(); setConfirmDelete(u) }}
                                className="text-gray-600 hover:text-red-400 text-xs transition"
                              >
                                🗑️
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-500 text-sm">No users found.</p>
                    </div>
                  )}
                </div>
                <div className="px-4 py-3 border-t border-gray-800">
                  <p className="text-gray-600 text-xs">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            )}
          </div>

          {/* User detail panel */}
          {selectedUser && (
            <div className="w-80 flex-shrink-0 space-y-3">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">User Details</h3>
                  <button onClick={() => { setSelectedUser(null); setUserDetails(null) }} className="text-gray-500 hover:text-white text-xs transition">✕</button>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                    {(selectedUser.name || selectedUser.email)?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-medium">{selectedUser.name || 'No name'}</p>
                    <p className="text-gray-400 text-xs">{selectedUser.email}</p>
                    <p className="text-gray-600 text-xs">Joined {new Date(selectedUser.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {userDetailsLoading ? (
                  <div className="text-center py-6">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : userDetails ? (
                  <div className="space-y-3">

                    {/* Subjects */}
                    <div>
                      <p className="text-gray-500 text-xs font-medium mb-1.5">
                        📚 Subjects ({userDetails.subjects.length})
                        {userDetails.errors?.subjects && (
                          <span className="text-red-400 ml-1">— fetch error</span>
                        )}
                      </p>
                      {userDetails.subjects.length === 0 ? (
                        <p className="text-gray-600 text-xs">No subjects</p>
                      ) : (
                        <div className="space-y-1">
                          {userDetails.subjects.map(s => {
                            const hexColor = getSubjectColor(s.color)
                            return (
                              <div key={s.id} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5">
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: hexColor || '#6366f1' }}
                                />
                                <p className="text-white text-xs">{s.name}</p>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Assignments */}
                    <div>
                      <p className="text-gray-500 text-xs font-medium mb-1.5">
                        📝 Assignments ({userDetails.assignments.length})
                        {userDetails.errors?.assignments && (
                          <span className="text-red-400 ml-1">— fetch error</span>
                        )}
                      </p>
                      {userDetails.assignments.length === 0 ? (
                        <p className="text-gray-600 text-xs">No assignments</p>
                      ) : (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {userDetails.assignments.map(a => (
                            <div key={a.id} className="bg-gray-800 rounded-lg px-3 py-1.5">
                              <p className={`text-xs ${a.status === 'done' ? 'line-through text-gray-500' : 'text-white'}`}>{a.title}</p>
                              <p className="text-gray-600 text-xs">Due {a.due_date}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Grades */}
                    <div>
                      <p className="text-gray-500 text-xs font-medium mb-1.5">
                        📊 Grades ({userDetails.grades.length})
                        {userDetails.errors?.grades && (
                          <span className="text-red-400 ml-1">— fetch error</span>
                        )}
                      </p>
                      {userDetails.grades.length === 0 ? (
                        <p className="text-gray-600 text-xs">No grades</p>
                      ) : (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {userDetails.grades.map(g => {
                            const pct = ((g.score / g.max_score) * 100).toFixed(1)
                            return (
                              <div key={g.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-1.5">
                                <p className="text-white text-xs">{g.title}</p>
                                <p className={`text-xs font-medium ${parseFloat(pct) >= 90 ? 'text-emerald-400' : parseFloat(pct) >= 75 ? 'text-amber-400' : 'text-red-400'}`}>
                                  {pct}%
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <p className="text-gray-500 text-xs font-medium mb-1.5">
                        🗒️ Notes ({userDetails.notes.length})
                        {userDetails.errors?.notes && (
                          <span className="text-red-400 ml-1">— fetch error</span>
                        )}
                      </p>
                      {userDetails.notes.length === 0 ? (
                        <p className="text-gray-600 text-xs">No notes</p>
                      ) : (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {userDetails.notes.map(n => (
                            <div key={n.id} className="bg-gray-800 rounded-lg px-3 py-1.5">
                              <p className="text-white text-xs">{n.title}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedUser.email !== ADMIN_EMAIL && (
                      <button
                        onClick={() => setConfirmDelete(selectedUser)}
                        className="w-full bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-medium py-2 rounded-lg transition mt-2"
                      >
                        🗑️ Delete User Data
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">

          {/* Post/Edit form */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold">
                  {editingAnn ? '✏️ Edit Announcement' : '📢 Post Announcement'}
                </h3>
                <p className="text-gray-400 text-xs mt-0.5">
                  {editingAnn ? 'Update the announcement below.' : 'This will be visible to all users in their dashboard.'}
                </p>
              </div>
              {editingAnn && (
                <button
                  onClick={handleCancelEdit}
                  className="text-xs text-gray-500 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg transition"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Title</label>
              <input
                value={annForm.title}
                onChange={e => setAnnForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. System Maintenance"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Message</label>
              <textarea
                value={annForm.message}
                onChange={e => setAnnForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Write your announcement here..."
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition text-sm resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Type</label>
              <div className="flex gap-2 flex-wrap">
                {['info', 'warning', 'success', 'danger'].map(t => (
                  <button
                    key={t}
                    onClick={() => setAnnForm(f => ({ ...f, type: t }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition
                      ${annForm.type === t ? annTypeStyles[t] : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                  >
                    {t === 'info' ? 'ℹ️' : t === 'warning' ? '⚠️' : t === 'success' ? '✅' : '🚨'} {t}
                  </button>
                ))}
              </div>
            </div>

            {annSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2.5">
                <p className="text-emerald-400 text-sm">✓ Announcement {editingAnn ? 'updated' : 'posted'} successfully!</p>
              </div>
            )}

            <button
              onClick={handlePostAnnouncement}
              disabled={annLoading || !annForm.title.trim() || !annForm.message.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-lg transition text-sm"
            >
              {annLoading ? 'Saving...' : editingAnn ? '💾 Save Changes' : '📢 Post Announcement'}
            </button>
          </div>

          {/* Existing announcements */}
          <div className="space-y-3">
            <h3 className="text-white font-semibold">Posted Announcements ({announcements.length})</h3>
            {announcements.length === 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <p className="text-4xl mb-2">📢</p>
                <p className="text-gray-500 text-sm">No announcements yet.</p>
              </div>
            )}
            {announcements.map(a => (
              <div key={a.id} className={`border rounded-xl p-4 ${annTypeStyles[a.type]} ${editingAnn?.id === a.id ? 'ring-2 ring-indigo-500' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{a.type === 'info' ? 'ℹ️' : a.type === 'warning' ? '⚠️' : a.type === 'success' ? '✅' : '🚨'}</span>
                      <p className="font-semibold text-white">{a.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${annTypeStyles[a.type]}`}>{a.type}</span>
                    </div>
                    <p className="text-gray-300 text-sm">{a.message}</p>
                    <p className="text-gray-500 text-xs mt-2">{timeAgo(a.created_at)}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEditAnn(a)}
                      className="text-gray-400 hover:text-indigo-400 text-xs transition px-2 py-1 rounded bg-gray-800 hover:bg-gray-700"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => setConfirmDeleteAnn(a)}
                      className="text-gray-400 hover:text-red-400 text-xs transition px-2 py-1 rounded bg-gray-800 hover:bg-gray-700"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Delete User Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center">
              <p className="text-3xl mb-3">🗑️</p>
              <h3 className="text-white font-semibold text-lg">Delete User Data?</h3>
              <p className="text-gray-400 text-sm mt-1">
                This will permanently delete all data for{' '}
                <span className="text-white font-medium">{confirmDelete.name || confirmDelete.email}</span>.
                This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2 text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(confirmDelete)}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg py-2 text-sm transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Announcement Modal */}
      {confirmDeleteAnn && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center">
              <p className="text-3xl mb-3">📢</p>
              <h3 className="text-white font-semibold text-lg">Delete Announcement?</h3>
              <p className="text-gray-400 text-sm mt-1">
                Are you sure you want to delete{' '}
                <span className="text-white font-medium">"{confirmDeleteAnn.title}"</span>?
                It will be removed from all users' dashboards.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteAnn(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2 text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAnnouncement(confirmDeleteAnn.id)}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg py-2 text-sm transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}