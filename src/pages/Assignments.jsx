import { useState } from 'react'
import { useAssignments } from '../hooks/useAssignments'
import { useSubjects } from '../hooks/useSubjects'
import { AssignmentsSkeleton } from '../components/Skeleton'

const PRIORITIES = ['low', 'medium', 'high']

const priorityStyles = {
  low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
}

function formatTime(time) {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const display = hour % 12 || 12
  return `${display}:${m} ${ampm}`
}

function isOverdue(dueDate, status) {
  if (status === 'done') return false
  return new Date(dueDate) < new Date()
}

export default function Assignments() {
  const { assignments, addAssignment, editAssignment, deleteAssignment, toggleStatus } = useAssignments()
  const { subjects } = useSubjects()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('all')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [form, setForm] = useState({ title: '', subjectId: '', dueDate: '', dueTime: '', priority: 'medium', notes: '' })

  function openAdd() {
    setEditing(null)
    setForm({ title: '', subjectId: '', dueDate: '', dueTime: '', priority: 'medium', notes: '' })
    setShowModal(true)
  }

  function openEdit(a) {
    setEditing(a)
    setForm({
      title: a.title,
      subjectId: a.subject_id || '',
      dueDate: a.due_date,
      dueTime: a.due_time || '',
      priority: a.priority,
      notes: a.notes || ''
    })
    setShowModal(true)
  }

  function handleSave() {
    if (!form.title.trim() || !form.dueDate) return
    if (editing) {
      editAssignment(editing.id, { ...form, status: editing.status })
    } else {
      addAssignment({ ...form, status: 'pending' })
    }
    setShowModal(false)
  }

  const filtered = assignments.filter(a => {
    if (filter === 'pending') return a.status !== 'done'
    if (filter === 'done') return a.status === 'done'
    return true
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date))

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Assignments</h2>
          <p className="text-gray-400 text-sm mt-1">{assignments.filter(a => a.status !== 'done').length} pending</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          + Add Assignment
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['all', 'pending', 'done'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition
              ${filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-white font-medium mb-1">No assignments here</p>
          <p className="text-gray-400 text-sm">Add one using the button above.</p>
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
              className={`bg-gray-900 border rounded-xl p-4 flex items-start gap-4 transition
                ${a.status === 'done' ? 'border-gray-800 opacity-60' : overdue ? 'border-red-500/30' : 'border-gray-800'}`}
            >
              <button
                onClick={() => toggleStatus(a.id)}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition
                  ${a.status === 'done' ? 'bg-indigo-600 border-indigo-600' : 'border-gray-600 hover:border-indigo-500'}`}
              >
                {a.status === 'done' && (
                  <span className="text-white text-xs flex items-center justify-center w-full h-full">✓</span>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className={`font-medium ${a.status === 'done' ? 'line-through text-gray-500' : 'text-white'}`}>
                  {a.title}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {subject && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${subject.color.light} ${subject.color.border} ${subject.color.text}`}>
                      {subject.name}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${priorityStyles[a.priority]}`}>
                    {a.priority}
                  </span>
                  <span className={`text-xs ${overdue ? 'text-red-400' : 'text-gray-500'}`}>
                    {overdue ? '⚠ Overdue · ' : ''}Due {new Date(a.due_date).toLocaleDateString()}
                    {a.due_time && ` · ${formatTime(a.due_time)}`}
                  </span>
                </div>
                {a.notes && <p className="text-gray-500 text-xs mt-1">{a.notes}</p>}
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => openEdit(a)} className="text-gray-500 hover:text-white text-xs transition">Edit</button>
                <button onClick={() => setConfirmDelete(a)} className="text-gray-500 hover:text-red-400 text-xs transition">Delete</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-white font-semibold text-lg">{editing ? 'Edit Assignment' : 'Add Assignment'}</h3>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Title</label>
              <input
                autoFocus
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Chapter 5 Report"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Subject</label>
              <select
                value={form.subjectId}
                onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="">No subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Due Date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Due Time (optional)</label>
                <input
                  type="time"
                  value={form.dueTime}
                  onChange={e => setForm(f => ({ ...f, dueTime: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
              >
                {PRIORITIES.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any extra details..."
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2 text-sm transition">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.title.trim() || !form.dueDate}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2 text-sm transition"
              >
                {editing ? 'Save Changes' : 'Add Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center">
              <p className="text-3xl mb-3">🗑️</p>
              <h3 className="text-white font-semibold text-lg">Delete Assignment?</h3>
              <p className="text-gray-400 text-sm mt-1">
                Are you sure you want to delete <span className="text-white font-medium">"{confirmDelete.title}"</span>? This cannot be undone.
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
                onClick={() => {
                  deleteAssignment(confirmDelete.id)
                  setConfirmDelete(null)
                }}
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