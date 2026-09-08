import { useState, useRef, useEffect } from 'react'
import { useSubjects } from '../hooks/useSubjects'
import { useAssignments } from '../hooks/useAssignments'
import { SubjectsSkeleton } from '../components/Skeleton'
import { BookOpen, Trash2, Check, AlertTriangle, User, MapPin, Clock, GraduationCap } from 'lucide-react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const EMPTY_FORM = {
  name: '',
  color: 'indigo',
  professor: '',
  units: '',
  room: '',
  days: [],
  startTime: '',
  endTime: '',
}

function formatSchedule(subject) {
  const days = subject.days?.length ? subject.days.join('/') : ''
  const time = subject.startTime && subject.endTime
    ? `${subject.startTime}–${subject.endTime}`
    : ''
  if (!days && !time) return ''
  return [days, time].filter(Boolean).join(' · ')
}

export default function Subjects() {
  const { subjects, addSubject, editSubject, deleteSubject, COLORS, loading } = useSubjects()
  const { assignments } = useAssignments()

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
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
        setConfirmDeleteAll(false)
      }
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

  function openEdit(subject) {
    setEditing(subject)
    setForm({
      name: subject.name,
      color: subject.color.name,
      professor: subject.professor || '',
      units: subject.units ?? '',
      room: subject.room || '',
      days: subject.days || [],
      startTime: subject.startTime || '',
      endTime: subject.endTime || '',
    })
    setError('')
    setShowModal(true)
  }

  function toggleDay(day) {
    setForm(f => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day],
    }))
  }

  async function handleSave() {
    const trimmed = form.name.trim()
    if (!trimmed) return

    // Duplicate name check
    const isDuplicate = subjects.some(
      s => s.name.toLowerCase() === trimmed.toLowerCase() && s.id !== editing?.id
    )
    if (isDuplicate) {
      setError('A subject with this name already exists.')
      return
    }

    // Basic time sanity check
    if (form.startTime && form.endTime && form.startTime >= form.endTime) {
      setError('End time must be after start time.')
      return
    }

    const payload = {
      name: trimmed,
      color: form.color,
      professor: form.professor.trim(),
      units: form.units === '' ? null : Number(form.units),
      room: form.room.trim(),
      days: form.days,
      startTime: form.startTime,
      endTime: form.endTime,
    }

    setSaving(true)
    setError('')
    try {
      if (editing) {
        await editSubject(editing.id, payload)
      } else {
        await addSubject(payload)
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

  async function handleDeleteAll() {
    setSaving(true)
    try {
      for (const subject of subjects) {
        await deleteSubject(subject.id)
      }
      setConfirmDeleteAll(false)
    } catch (err) {
      setError(err.message || 'Failed to delete all subjects. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Assignment count per subject
  const assignmentCount = (subjectId) =>
    assignments.filter(a => a.subject_id === subjectId).length

  const pendingCount = (subjectId) =>
    assignments.filter(a => a.subject_id === subjectId && a.status !== 'done').length

  const totalLinkedAssignments = subjects.reduce(
    (sum, s) => sum + assignmentCount(s.id),
    0
  )

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
        <div className="flex items-center gap-2">
          {subjects.length > 0 && (
            <button
              onClick={() => setConfirmDeleteAll(true)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800 px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
            >
              Delete All
            </button>
          )}
          <button
            onClick={openAdd}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition shadow-sm shadow-indigo-200 dark:shadow-none"
          >
            + Add Subject
          </button>
        </div>
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
          const schedule = formatSchedule(subject)

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
                {subject.units != null && subject.units !== '' && (
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-full px-2 py-0.5 flex-shrink-0">
                    {subject.units} unit{Number(subject.units) !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Prof / Room / Schedule */}
              {(subject.professor || subject.room || schedule) && (
                <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {subject.professor && (
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="flex-shrink-0" />
                      <span className="truncate">{subject.professor}</span>
                    </div>
                  )}
                  {subject.room && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="flex-shrink-0" />
                      <span className="truncate">{subject.room}</span>
                    </div>
                  )}
                  {schedule && (
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="flex-shrink-0" />
                      <span className="truncate">{schedule}</span>
                    </div>
                  )}
                </div>
              )}

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
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-xl my-8">
            <h3 className="text-gray-900 dark:text-white font-semibold text-lg">
              {editing ? 'Edit Subject' : 'Add Subject'}
            </h3>

            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Subject name</label>
              <input
                ref={inputRef}
                value={form.name}
                onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="e.g. Mathematics"
                className={`w-full bg-gray-50 dark:bg-gray-900 border rounded-lg px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 transition
                  ${error ? 'border-red-300 dark:border-red-800 focus:border-red-400 focus:ring-red-100 dark:focus:ring-red-950/40' : 'border-gray-200 dark:border-gray-700 focus:border-indigo-400 focus:ring-indigo-100 dark:focus:ring-indigo-950/40'}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                  <User size={13} /> Professor
                </label>
                <input
                  value={form.professor}
                  onChange={e => setForm(f => ({ ...f, professor: e.target.value }))}
                  placeholder="e.g. Dr. Santos"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                  <GraduationCap size={13} /> Units
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.units}
                  onChange={e => setForm(f => ({ ...f, units: e.target.value }))}
                  placeholder="e.g. 3"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                <MapPin size={13} /> Classroom / Room No.
              </label>
              <input
                value={form.room}
                onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
                placeholder="e.g. Rm 302, Bldg C"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                <Clock size={13} /> Schedule
              </label>
              <div className="flex gap-1.5 flex-wrap mb-3">
                {DAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition
                      ${form.days.includes(day)
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700'}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={form.startTime}
                  onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                  className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition"
                />
                <span className="text-gray-400 dark:text-gray-500 text-sm">to</span>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                  className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-600 dark:text-red-400 text-xs">{error}</p>
            )}

            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(color => (
                  <button
                    key={color.name}
                    onClick={() => setForm(f => ({ ...f, color: color.name }))}
                    title={color.name}
                    className={`w-7 h-7 rounded-full ${color.bg} transition ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800
                      ${form.color === color.name ? 'ring-indigo-500 scale-110' : 'ring-transparent hover:ring-gray-300 dark:hover:ring-gray-600'}`}
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
                disabled={!form.name.trim() || saving}
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

      {/* Confirm Delete All Modal */}
      {confirmDeleteAll && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setConfirmDeleteAll(false)}
        >
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-800 flex items-center justify-center mx-auto mb-3">
                <Trash2 size={22} className="text-red-500 dark:text-red-400" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Delete All Subjects?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                This will permanently delete all{' '}
                <span className="text-gray-900 dark:text-white font-medium">{subjects.length}</span> subject{subjects.length !== 1 ? 's' : ''}.
                {totalLinkedAssignments > 0 && (
                  <span className="flex items-center justify-center gap-1.5 mt-2 text-amber-600 dark:text-amber-400">
                    <AlertTriangle size={13} />
                    {totalLinkedAssignments} assignment{totalLinkedAssignments !== 1 ? 's' : ''} linked to these will be affected too.
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteAll(false)}
                disabled={saving}
                className="flex-1 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg py-2 text-sm transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg py-2 text-sm transition disabled:opacity-40"
              >
                {saving ? 'Deleting…' : 'Yes, Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}