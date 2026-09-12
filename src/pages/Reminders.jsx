import { useState, useEffect } from 'react'
import { useReminders } from '../hooks/useReminders'
import { useSubjects } from '../hooks/useSubjects'
import { useAssignments } from '../hooks/useAssignments'
import { AssignmentsSkeleton } from '../components/Skeleton'
import { AlertTriangle, X, Bell, Check, Trash2 } from 'lucide-react'

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

function isOverdue(dueDate, isDone) {
  if (isDone || !dueDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dueDate) < today
}

const EMPTY_FORM = { title: '', subjectId: '', assignmentId: '', dueDate: '', dueTime: '', priority: 'medium', notes: '' }

export default function Reminders() {
  const { reminders, addReminder, editReminder, deleteReminder, toggleDone, loading: remindersLoading } = useReminders()
  const { subjects, loading: subjectsLoading } = useSubjects()
  const { assignments, loading: assignmentsLoading } = useAssignments()

  const [showModal, setShowModal]               = useState(false)
  const [editing, setEditing]                   = useState(null)
  const [filter, setFilter]                     = useState('all')
  const [confirmDelete, setConfirmDelete]       = useState(null)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [form, setForm]                         = useState(EMPTY_FORM)
  const [saving, setSaving]                     = useState(false)
  const [deleting, setDeleting]                 = useState(false)
  const [deletingAll, setDeletingAll]           = useState(false)
  const [error, setError]                       = useState('')

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

  function openEdit(r) {
    setEditing(r)
    setForm({
      title:        r.title,
      subjectId:    r.subject_id || '',
      assignmentId: r.assignment_id || '',
      dueDate:      r.due_date || '',
      dueTime:      r.due_time || '',
      priority:     r.priority,
      notes:        r.notes || '',
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await editReminder(editing.id, { ...form, isDone: editing.is_done })
      } else {
        await addReminder({ ...form, isDone: false })
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
      await deleteReminder(confirmDelete.id)
      setConfirmDelete(null)
    } catch (err) {
      setError(err.message || 'Failed to delete reminder. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeleteAll() {
    setDeletingAll(true)
    setError('')
    try {
      await Promise.all(filtered.map(r => deleteReminder(r.id)))
      setConfirmDeleteAll(false)
    } catch (err) {
      setError(err.message || 'Failed to delete some reminders. Please try again.')
    } finally {
      setDeletingAll(false)
    }
  }

  const filtered = reminders.filter(r => {
    if (filter === 'pending') return !r.is_done
    if (filter === 'done')    return r.is_done
    return true
  }).sort((a, b) => {
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return new Date(a.due_date) - new Date(b.due_date)
  })

  if (remindersLoading || subjectsLoading || assignmentsLoading) return <AssignmentsSkeleton />

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Reminders</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {reminders.filter(r => !r.is_done).length} pending
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
            + Add Reminder
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
          <Bell size={36} className="mx-auto mb-3 text-indigo-500 dark:text-indigo-400" />
          <p className="text-gray-900 dark:text-white font-medium mb-1">No reminders here</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Add one using the button above.</p>
        </div>
      )}

      {/* Reminder list */}
      <div className="space-y-3">
        {filtered.map(r => {
          const subject = subjects.find(s => s.id === r.subject_id)
          const linkedAssignment = assignments.find(a => a.id === r.assignment_id)
          const overdue = isOverdue(r.due_date, r.is_done)
          return (
            <div
              key={r.id}
              className={`bg-white dark:bg-gray-800 border rounded-2xl p-4 flex items-start gap-4 transition hover:border-gray-300 dark:hover:border-gray-600 shadow-sm
                ${r.is_done ? 'border-gray-100 dark:border-gray-700 opacity-60' : overdue ? 'border-red-200 dark:border-red-800' : 'border-gray-100 dark:border-gray-700'}`}
            >
              <button
                onClick={() => toggleDone(r.id)}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition
                  ${r.is_done ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500'}`}
              >
                {r.is_done && (
                  <span className="text-white flex items-center justify-center w-full h-full">
                    <Check size={11} />
                  </span>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className={`font-medium ${r.is_done ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                  {r.title}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {subject && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${subject.color.light} ${subject.color.border} ${subject.color.text}`}>
                      {subject.name}
                    </span>
                  )}
                  {linkedAssignment && (
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
                      {linkedAssignment.title}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize flex items-center gap-1.5 ${priorityStyles[r.priority]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${priorityDot[r.priority]}`} />
                    {r.priority}
                  </span>
                  {r.due_date && (
                    <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                      {overdue && <AlertTriangle size={11} />}
                      {overdue ? 'Overdue · ' : ''}
                      Due {new Date(r.due_date).toLocaleDateString()}
                      {r.due_time && ` · ${formatTime(r.due_time)}`}
                    </span>
                  )}
                </div>
                {r.notes && <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{r.notes}</p>}
              </div>

              <div className="flex gap-3 flex-shrink-0">
                <button onClick={() => openEdit(r)}          className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white text-xs transition">Edit</button>
                <button onClick={() => setConfirmDelete(r)}  className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 text-xs transition">Delete</button>
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
              {editing ? 'Edit Reminder' : 'Add Reminder'}
            </h3>

            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Title</label>
              <input
                autoFocus
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="e.g. Be ready for presentation"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Subject (optional)</label>
              <select
                value={form.subjectId}
                onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 transition"
              >
                <option value="">No subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Linked Assignment (optional)</label>
              <select
                value={form.assignmentId}
                onChange={e => setForm(f => ({ ...f, assignmentId: e.target.value }))}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 transition"
              >
                <option value="">None</option>
                {assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Due Date (optional)</label>
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
                disabled={!form.title.trim() || saving}
                className="flex-1 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2 text-sm transition"
              >
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Reminder'}
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
              <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Delete Reminder?</h3>
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
                Delete {filtered.length} reminder{filtered.length !== 1 ? 's' : ''}?
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                This will permanently delete{' '}
                <span className="text-gray-900 dark:text-white font-medium">
                  {filter === 'all' ? 'all' : `all ${filter}`} reminder{filtered.length !== 1 ? 's' : ''}
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