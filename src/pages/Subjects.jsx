import { useState, useRef, useEffect } from 'react'
import { useSubjects } from '../hooks/useSubjects'
import { useAssignments } from '../hooks/useAssignments'
import { SubjectsSkeleton } from '../components/Skeleton'
import { BookOpen, Trash2, Check, AlertTriangle } from 'lucide-react'

export default function Subjects() {
  const { subjects, addSubject, editSubject, deleteSubject, COLORS, loading } = useSubjects()
  const { assignments } = useAssignments()

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [selectedColor, setSelectedColor] = useState('indigo')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  // Focus input when modal opens
  useEffect(() => {
    if (showModal) setTimeout(() => inputRef.current?.focus(), 50)
  }, [showModal])

  // Close modals on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setShowModal(false)
        setConfirmDelete(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function openAdd() {
    setEditing(null)
    setName('')
    setSelectedColor('indigo')
    setError('')
    setShowModal(true)
  }

  function openEdit(subject) {
    setEditing(subject)
    setName(subject.name)
    setSelectedColor(subject.color.name)
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return

    // Duplicate name check
    const isDuplicate = subjects.some(
      s => s.name.toLowerCase() === trimmed.toLowerCase() && s.id !== editing?.id
    )
    if (isDuplicate) {
      setError('A subject with this name already exists.')
      return
    }

    setSaving(true)
    setError('')
    try {
      if (editing) {
        await editSubject(editing.id, trimmed, selectedColor)
      } else {
        await addSubject(trimmed, selectedColor)
      }
      setShowModal(false)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await deleteSubject(confirmDelete.id)
      setConfirmDelete(null)
    } catch (err) {
      setError(err.message || 'Failed to delete subject. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Assignment count per subject
  const assignmentCount = (subjectId) =>
    assignments.filter(a => a.subject_id === subjectId).length

  const pendingCount = (subjectId) =>
    assignments.filter(a => a.subject_id === subjectId && a.status !== 'done').length

  // Fix: actually use the imported SubjectsSkeleton while loading
  if (loading) return <SubjectsSkeleton />

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Subjects</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition shadow-sm shadow-indigo-200 dark:shadow-none"
        >
          + Add Subject
        </button>
      </div>

      {/* Empty state */}
      {subjects.length === 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-12 text-center shadow-sm">
          <BookOpen size={36} className="mx-auto mb-3 text-indigo-500 dark:text-indigo-400" />
          <p className="text-gray-900 dark:text-white font-medium mb-1">No subjects yet</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Add your first subject to get started.</p>
          <button
            onClick={openAdd}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-4 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
          >
            + Add Subject
          </button>
        </div>
      )}

      {/* Subject Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map(subject => {
          const total = assignmentCount(subject.id)
          const pending = pendingCount(subject.id)
          const done = total - pending
          const progress = total > 0 ? Math.round((done / total) * 100) : null

          return (
            <div
              key={subject.id}
              className={`rounded-xl p-5 border ${subject.color.light} ${subject.color.border} dark:bg-gray-800 dark:border-gray-700 flex flex-col gap-4 transition hover:scale-[1.02] shadow-sm`}
            >
              {/* Top row */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${subject.color.bg}`} />
                  <h3 className="text-gray-900 dark:text-white font-semibold text-lg leading-tight">{subject.name}</h3>
                </div>
              </div>

              {/* Assignment stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>{total} assignment{total !== 1 ? 's' : ''}</span>
                {pending > 0 && (
                  <span className="text-amber-600 dark:text-amber-400">{pending} pending</span>
                )}
                {total > 0 && pending === 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check size={12} /> All done
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {total > 0 && (
                <div className="space-y-1">
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${subject.color.bg}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-right">{progress}% complete</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => openEdit(subject)}
                  className="flex-1 text-sm bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-100 dark:border-gray-700 rounded-lg py-1.5 transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDelete(subject)}
                  className="flex-1 text-sm bg-gray-50 dark:bg-gray-900 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 border border-gray-100 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800 rounded-lg py-1.5 transition"
                >
                  Delete
                </button>
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
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-xl">
            <h3 className="text-gray-900 dark:text-white font-semibold text-lg">
              {editing ? 'Edit Subject' : 'Add Subject'}
            </h3>

            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Subject name</label>
              <input
                ref={inputRef}
                value={name}
                onChange={e => { setName(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="e.g. Mathematics"
                className={`w-full bg-gray-50 dark:bg-gray-900 border rounded-lg px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 transition
                  ${error ? 'border-red-300 dark:border-red-800 focus:border-red-400 focus:ring-red-100 dark:focus:ring-red-950/40' : 'border-gray-200 dark:border-gray-700 focus:border-indigo-400 focus:ring-indigo-100 dark:focus:ring-indigo-950/40'}`}
              />
              {error && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1.5">{error}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(color => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    title={color.name}
                    className={`w-7 h-7 rounded-full ${color.bg} transition ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800
                      ${selectedColor === color.name ? 'ring-indigo-500 scale-110' : 'ring-transparent hover:ring-gray-300 dark:hover:ring-gray-600'}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="flex-1 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg py-2 text-sm transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim() || saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2 text-sm transition shadow-sm shadow-indigo-200 dark:shadow-none"
              >
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Subject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
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
              <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Delete Subject?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Are you sure you want to delete{' '}
                <span className="text-gray-900 dark:text-white font-medium">"{confirmDelete.name}"</span>?
                {assignmentCount(confirmDelete.id) > 0 && (
                  <span className="flex items-center justify-center gap-1.5 mt-2 text-amber-600 dark:text-amber-400">
                    <AlertTriangle size={13} />
                    This subject has {assignmentCount(confirmDelete.id)} assignment{assignmentCount(confirmDelete.id) !== 1 ? 's' : ''} linked to it.
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={saving}
                className="flex-1 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg py-2 text-sm transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg py-2 text-sm transition disabled:opacity-40"
              >
                {saving ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}