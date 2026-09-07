import { useState, useEffect } from 'react'
import { useAssignments } from '../hooks/useAssignments'
import { useSubjects } from '../hooks/useSubjects'
import { AssignmentsSkeleton } from '../components/Skeleton'
import { AlertTriangle, X, ClipboardList, Check, Trash2 } from 'lucide-react'

const PRIORITIES = ['low', 'medium', 'high']

const priorityStyles = {
  low:    'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  medium: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  high:   'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
}

const priorityDot = {
  low:    'bg-emerald-500',
  medium: 'bg-amber-500',
  high:   'bg-red-500',
}

function formatTime(time) {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const display = hour % 12 || 12
  return `${display}:${m} ${ampm}`
}

// Fix: compare against start of day, not current time
function isOverdue(dueDate, status) {
  if (status === 'done') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dueDate) < today
}

const EMPTY_FORM = { title: '', subjectId: '', dueDate: '', dueTime: '', priority: 'medium', notes: '' }

export default function Assignments() {
  const { assignments, addAssignment, editAssignment, deleteAssignment, toggleStatus, loading: assignmentsLoading } = useAssignments()
  const { subjects, loading: subjectsLoading } = useSubjects()

  const [showModal, setShowModal]         = useState(false)
  const [editing, setEditing]             = useState(null)
  const [filter, setFilter]               = useState('all')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [form, setForm]                   = useState(EMPTY_FORM)
  const [saving, setSaving]               = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [deletingAll, setDeletingAll]     = useState(false)
  const [error, setError]                 = useState('')

  // Escape key closes any open modal
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return
      setShowModal(false)
      setConfirmDelete(null)
      setConfirmDeleteAll(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowModal(true)
  }

  function openEdit(a) {
    setEditing(a)
    setForm({
      title:     a.title,
      subjectId: a.subject_id || '',
      dueDate:   a.due_date,
      dueTime:   a.due_time || '',
      priority:  a.priority,
      notes:     a.notes || '',
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.dueDate) return
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await editAssignment(editing.id, { ...form, status: editing.status })
      } else {
        await addAssignment({ ...form, status: 'pending' })
      }
      setShowModal(false)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError('')
    try {
      await deleteAssignment(confirmDelete.id)
      setConfirmDelete(null)
    } catch (err) {
      setError(err.message || 'Failed to delete assignment. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeleteAll() {
    setDeletingAll(true)
    setError('')
    try {
      await Promise.all(filtered.map(a => deleteAssignment(a.id)))
      setConfirmDeleteAll(false)
    } catch (err) {
      setError(err.message || 'Failed to delete some assignments. Please try again.')
    } finally {
      setDeletingAll(false)
    }
  }

  const filtered = assignments.filter(a => {
    if (filter === 'pending') return a.status !== 'done'
    if (filter === 'done')    return a.status === 'done'
    return true
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date))

  if (assignmentsLoading || subjectsLoading) return <AssignmentsSkeleton />

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Assignments</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {assignments.filter(a => a.status !== 'done').length} pending
          </p>
        </div>
        <div className="flex items-center gap-2">
          {filtered.length > 0 && (
            <button
              onClick={() => setConfirmDeleteAll(true)}
              className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/60 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 text-sm font-medium px-4 py-2 rounded-xl transition"
            >
              Delete all
            </button>
          )}
          <button
            onClick={openAdd}
            className="bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            + Add Assignment
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['all', 'pending', 'done'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium capitalize transition
              ${filter === f ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Top-level error (e.g. from delete-all) */}
      {error && !showModal && !confirmDelete && !confirmDeleteAll && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5 text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5"><AlertTriangle size={13} /> {error}</span>
          <button onClick={() => setError('')} className="hover:text-red-700 dark:hover:text-red-300 transition"><X size={13} /></button>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-12 text-center shadow-sm">
          <ClipboardList size={36} className="mx-auto mb-3 text-indigo-500 dark:text-indigo-400" />
          <p className="text-gray-900 dark:text-white font-medium mb-1">No assignments here</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Add one using the button above.</p>
        </div>
      )}

      {/* Assignment list */}
      <div className="space-y-3">
        {filtered.map(a => {
          const subject = subjects.find(s => s.id === a.subject_id)
          const overdue = isOverdue(a.due_date, a.status)
          return (
            <div
              key={a.id}
              className={`bg-white dark:bg-gray-800 border rounded-2xl p-4 flex items-start gap-4 transition hover:border-gray-300 dark:hover:border-gray-600 shadow-sm
                ${a.status === 'done' ? 'border-gray-100 dark:border-gray-700 opacity-60' : overdue ? 'border-red-200 dark:border-red-800' : 'border-gray-100 dark:border-gray-700'}`}
            >
              <button
                onClick={() => toggleStatus(a.id)}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition
                  ${a.status === 'done' ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500'}`}
              >
                {a.status === 'done' && (
                  <span className="text-white flex items-center justify-center w-full h-full">
                    <Check size={11} />
                  </span>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className={`font-medium ${a.status === 'done' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                  {a.title}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {subject && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${subject.color.light} ${subject.color.border} ${subject.color.text}`}>
                      {subject.name}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize flex items-center gap-1.5 ${priorityStyles[a.priority]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${priorityDot[a.priority]}`} />
                    {a.priority}
                  </span>
                  <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                    {overdue && <AlertTriangle size={11} />}
                    {overdue ? 'Overdue · ' : ''}
                    Due {new Date(a.due_date).toLocaleDateString()}
                    {a.due_time && ` · ${formatTime(a.due_time)}`}
                  </span>
                </div>
                {a.notes && <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{a.notes}</p>}
              </div>

              <div className="flex gap-3 flex-shrink-0">
                <button onClick={() => openEdit(a)}         className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white text-xs transition">Edit</button>
                <button onClick={() => setConfirmDelete(a)} className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 text-xs transition">Delete</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h3 className="text-gray-900 dark:text-white font-semibold text-lg">
              {editing ? 'Edit Assignment' : 'Add Assignment'}
            </h3>

            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Title</label>
              <input
                autoFocus
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="e.g. Chapter 5 Report"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Subject</label>
              <select
                value={form.subjectId}
                onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 transition"
              >
                <option value="">No subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Due Date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 transition"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Due Time (optional)</label>
                <input
                  type="time"
                  value={form.dueTime}
                  onChange={e => setForm(f => ({ ...f, dueTime: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 transition"
              >
                {PRIORITIES.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any extra details..."
                rows={2}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 transition resize-none"
              />
            </div>

            {error && (
              <p className="text-red-600 dark:text-red-400 text-xs">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="flex-1 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl py-2 text-sm transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.title.trim() || !form.dueDate || saving}
                className="flex-1 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2 text-sm transition"
              >
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete (single) Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setConfirmDelete(null)}
        >
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-800 flex items-center justify-center mx-auto mb-3">
                <Trash2 size={22} className="text-red-500 dark:text-red-400" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Delete Assignment?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Are you sure you want to delete{' '}
                <span className="text-gray-900 dark:text-white font-medium">"{confirmDelete.title}"</span>? This cannot be undone.
              </p>
              {error && <p className="text-red-600 dark:text-red-400 text-xs mt-2">{error}</p>}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl py-2 text-sm transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl py-2 text-sm transition disabled:opacity-40"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete All Modal */}
      {confirmDeleteAll && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setConfirmDeleteAll(false)}
        >
          <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={22} className="text-amber-500 dark:text-amber-400" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-semibold text-lg">
                Delete {filtered.length} assignment{filtered.length !== 1 ? 's' : ''}?
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                This will permanently delete{' '}
                <span className="text-gray-900 dark:text-white font-medium">
                  {filter === 'all' ? 'all' : `all ${filter}`} assignment{filtered.length !== 1 ? 's' : ''}
                </span>{' '}
                currently shown. This cannot be undone.
              </p>
              {error && <p className="text-red-600 dark:text-red-400 text-xs mt-2">{error}</p>}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteAll(false)}
                disabled={deletingAll}
                className="flex-1 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl py-2 text-sm transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deletingAll}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl py-2 text-sm transition disabled:opacity-40"
              >
                {deletingAll ? 'Deleting…' : `Yes, Delete All`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}