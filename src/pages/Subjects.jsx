import { useState, useRef, useEffect, useMemo } from 'react'
import { useSubjects } from '../hooks/useSubjects'
import { useAssignments } from '../hooks/useAssignments'
import { useReminders } from '../hooks/useReminders'
import { useNotes } from '../hooks/useNotes'
import { SubjectsSkeleton } from '../components/Skeleton'
import { BookOpen, Trash2, Check, AlertTriangle, User, MapPin, Clock, GraduationCap, Plus, X, Bell, StickyNote, Layers } from 'lucide-react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/* ─── animation helper (same pattern as Dashboard / Assignments) ─── */
const fadeUp = (delay = 0) => ({
  animation: `fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}ms both`,
})

// One schedule "block" = a set of days that share the same time + room
// e.g. a subject can have one block for Mon/Wed lecture in Rm 302
// and another block for Fri lab in the Chem Lab.
function emptyScheduleBlock() {
  return {
    _key: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    days: [],
    startTime: '',
    endTime: '',
    room: '',
  }
}

const EMPTY_FORM = {
  name: '',
  color: 'indigo',
  professor: '',
  units: '',
  schedules: [emptyScheduleBlock()],
}

// Normalizes a subject from storage into the schedules[] shape,
// so old subjects saved with a single days/startTime/endTime/room
// still work fine after this update.
function normalizeSchedules(subject) {
  if (Array.isArray(subject.schedules) && subject.schedules.length > 0) {
    return subject.schedules.map(block => ({
      _key: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      days: block.days || [],
      startTime: block.startTime || '',
      endTime: block.endTime || '',
      room: block.room || '',
    }))
  }
  // Legacy shape fallback
  if (subject.days?.length || subject.startTime || subject.room) {
    return [{
      _key: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      days: subject.days || [],
      startTime: subject.startTime || '',
      endTime: subject.endTime || '',
      room: subject.room || '',
    }]
  }
  return [emptyScheduleBlock()]
}

function formatScheduleBlock(block) {
  const days = block.days?.length ? block.days.join('/') : ''
  const time = block.startTime && block.endTime
    ? `${block.startTime}–${block.endTime}`
    : ''
  const dayTime = [days, time].filter(Boolean).join(' · ')
  if (!dayTime && !block.room) return ''
  return [dayTime, block.room].filter(Boolean).join(block.room && dayTime ? ' @ ' : '')
}

export default function Subjects() {
  const { subjects, addSubject, editSubject, deleteSubject, COLORS, loading } = useSubjects()
  const { assignments } = useAssignments()
  const { reminders } = useReminders()
  const { notes } = useNotes()

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
      schedules: normalizeSchedules(subject),
    })
    setError('')
    setShowModal(true)
  }

  function toggleDay(blockIndex, day) {
    setForm(f => ({
      ...f,
      schedules: f.schedules.map((block, i) =>
        i !== blockIndex
          ? block
          : {
              ...block,
              days: block.days.includes(day)
                ? block.days.filter(d => d !== day)
                : [...block.days, day],
            }
      ),
    }))
  }

  function updateBlock(blockIndex, patch) {
    setForm(f => ({
      ...f,
      schedules: f.schedules.map((block, i) => (i !== blockIndex ? block : { ...block, ...patch })),
    }))
  }

  function addBlock() {
    setForm(f => ({ ...f, schedules: [...f.schedules, emptyScheduleBlock()] }))
  }

  function removeBlock(blockIndex) {
    setForm(f => ({
      ...f,
      schedules: f.schedules.length <= 1 ? f.schedules : f.schedules.filter((_, i) => i !== blockIndex),
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

    // Basic time sanity check per schedule block
    for (const block of form.schedules) {
      if (block.startTime && block.endTime && block.startTime >= block.endTime) {
        setError('End time must be after start time for one of your schedules.')
        return
      }
    }

    // Drop fully-empty schedule blocks (no days, no time, no room)
    const cleanedSchedules = form.schedules
      .filter(b => b.days.length || b.startTime || b.endTime || b.room.trim())
      .map(({ _key, ...rest }) => ({ ...rest, room: rest.room.trim() }))

    const payload = {
      name: trimmed,
      color: form.color,
      professor: form.professor.trim(),
      units: form.units === '' ? null : Number(form.units),
      schedules: cleanedSchedules,
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

  // Reminder count per subject
  const reminderCount = (subjectId) =>
    reminders.filter(r => r.subject_id === subjectId).length

  const pendingReminderCount = (subjectId) =>
    reminders.filter(r => r.subject_id === subjectId && !r.is_done).length

  // Note count per subject
  const noteCount = (subjectId) =>
    notes.filter(n => n.subject_id === subjectId).length

  const totalLinkedAssignments = subjects.reduce(
    (sum, s) => sum + assignmentCount(s.id),
    0
  )

  // Summary stats for the top row.
  const summary = useMemo(() => {
    const totalUnits = subjects.reduce((sum, s) => sum + (Number(s.units) || 0), 0)
    const totalPendingAssignments = subjects.reduce((sum, s) => sum + pendingCount(s.id), 0)
    return { count: subjects.length, totalUnits, totalPendingAssignments }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects, assignments])

  // Fix: actually use the imported SubjectsSkeleton while loading
  if (loading) return <SubjectsSkeleton />

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .s-card { transition: transform .2s cubic-bezier(.22,1,.36,1), box-shadow .2s ease; }
        .s-card:hover { transform: translateY(-3px) scale(1.015); box-shadow: 0 8px 24px rgba(31,41,55,0.08); }
        .s-stat { transition: transform .18s cubic-bezier(.22,1,.36,1); }
        .s-stat:hover { transform: translateY(-2px); }
        .s-day-btn { transition: transform .12s, background .15s, border-color .15s, color .15s; }
        .s-day-btn:active { transform: scale(.92); }
        .s-color-swatch { transition: transform .15s, box-shadow .15s; }
        .s-color-swatch:hover { transform: scale(1.12); }
      `}</style>

      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between" style={fadeUp(0)}>
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
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition shadow-sm shadow-indigo-200 dark:shadow-none hover:-translate-y-0.5"
            >
              + Add Subject
            </button>
          </div>
        </div>

        {/* ── Summary stat cards ── */}
        {subjects.length > 0 && (
          <div className="grid grid-cols-3 gap-3" style={fadeUp(60)}>
            <div className="s-stat bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 mb-1.5">
                <Layers size={15} />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Subjects</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{summary.count}</div>
            </div>
            <div className="s-stat bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-violet-500 dark:text-violet-400 mb-1.5">
                <GraduationCap size={15} />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Total Units</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{summary.totalUnits}</div>
            </div>
            <div className="s-stat bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
              <div className={`flex items-center gap-2 mb-1.5 ${summary.totalPendingAssignments > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
                <ClipboardIcon />
                <span className="text-[11px] font-semibold uppercase tracking-wider">Pending Work</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{summary.totalPendingAssignments}</div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {subjects.length === 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-12 text-center shadow-sm" style={fadeUp(60)}>
            <BookOpen size={36} className="mx-auto mb-3 text-indigo-500 dark:text-indigo-400" style={{ animation: 'float 3s ease-in-out infinite' }} />
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
          {subjects.map((subject, i) => {
            const total = assignmentCount(subject.id)
            const pending = pendingCount(subject.id)
            const done = total - pending
            const progress = total > 0 ? Math.round((done / total) * 100) : null

            const totalReminders = reminderCount(subject.id)
            const pendingReminders = pendingReminderCount(subject.id)
            const doneReminders = totalReminders - pendingReminders
            const reminderProgress = totalReminders > 0 ? Math.round((doneReminders / totalReminders) * 100) : null

            const totalNotes = noteCount(subject.id)

            const scheduleBlocks = normalizeSchedules(subject).filter(
              b => b.days.length || b.startTime || b.room
            )

            return (
              <div
                key={subject.id}
                className={`s-card rounded-xl p-5 border ${subject.color.light} ${subject.color.border} dark:bg-gray-800 dark:border-gray-700 flex flex-col gap-4 shadow-sm`}
                style={fadeUp(100 + i * 40)}
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

                {/* Prof / Schedule blocks (each with its own days, time, room) */}
                {(subject.professor || scheduleBlocks.length > 0) && (
                  <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {subject.professor && (
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="flex-shrink-0" />
                        <span className="truncate">{subject.professor}</span>
                      </div>
                    )}
                    {scheduleBlocks.map((block, i) => {
                      const label = formatScheduleBlock(block)
                      if (!label) return null
                      return (
                        <div key={block._key || i} className="flex items-center gap-1.5">
                          <Clock size={12} className="flex-shrink-0" />
                          <span className="truncate">{label}</span>
                        </div>
                      )
                    })}
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

                {/* Assignment progress bar */}
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

                {/* Reminder stats + progress bar */}
                {totalReminders > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Bell size={12} /> {totalReminders} reminder{totalReminders !== 1 ? 's' : ''}
                      </span>
                      {pendingReminders > 0 && (
                        <span className="text-blue-600 dark:text-blue-400">{pendingReminders} upcoming</span>
                      )}
                      {pendingReminders === 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check size={12} /> All cleared
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-blue-500"
                        style={{ width: `${reminderProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-right">{reminderProgress}% cleared</p>
                  </div>
                )}

                {/* Note count (no bar — notes don't have a done/undone state) */}
                {totalNotes > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <StickyNote size={12} className="flex-shrink-0" />
                    <span>{totalNotes} note{totalNotes !== 1 ? 's' : ''}</span>
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

              {/* Schedule blocks: each is its own days + time + room combo,
                  so a subject that meets in different rooms/times on different
                  days can have more than one of these. */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Clock size={13} /> Schedule
                  </label>
                  <button
                    type="button"
                    onClick={addBlock}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
                  >
                    <Plus size={13} /> Add another
                  </button>
                </div>

                {form.schedules.map((block, blockIndex) => (
                  <div
                    key={block._key}
                    className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex gap-1.5 flex-wrap">
                        {DAYS.map(day => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(blockIndex, day)}
                            className={`s-day-btn text-xs font-medium px-2.5 py-1.5 rounded-lg border
                              ${block.days.includes(day)
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700'}`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                      {form.schedules.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBlock(blockIndex)}
                          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex-shrink-0 p-1"
                          title="Remove this schedule"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={block.startTime}
                        onChange={e => updateBlock(blockIndex, { startTime: e.target.value })}
                        className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition"
                      />
                      <span className="text-gray-400 dark:text-gray-500 text-sm">to</span>
                      <input
                        type="time"
                        value={block.endTime}
                        onChange={e => updateBlock(blockIndex, { endTime: e.target.value })}
                        className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                        <MapPin size={12} /> Classroom / Room No.
                      </label>
                      <input
                        value={block.room}
                        onChange={e => updateBlock(blockIndex, { room: e.target.value })}
                        placeholder="e.g. Rm 302, Bldg C"
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition"
                      />
                    </div>
                  </div>
                ))}
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
                      className={`s-color-swatch w-7 h-7 rounded-full ${color.bg} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800
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
    </>
  )
}

// Small inline icon (avoids importing ClipboardList just for the stat card,
// since Subjects.jsx doesn't otherwise use it)
function ClipboardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6" /><path d="M9 16h6" />
    </svg>
  )
}