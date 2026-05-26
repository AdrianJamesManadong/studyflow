import { useState, useEffect, useMemo } from 'react'
import { useAssignments } from '../hooks/useAssignments'
import { useSubjects } from '../hooks/useSubjects'
import { useGrades } from '../hooks/useGrades'
import { useEvents } from '../hooks/useEvents'

// Fix: all constants outside component
const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const EVENT_TYPES = ['reminder', 'exam', 'holiday', 'meeting', 'other']
const EVENT_COLORS = {
  indigo:  { bg: 'bg-indigo-500',  light: 'bg-indigo-500/10',  border: 'border-indigo-500/30',  text: 'text-indigo-400'  },
  rose:    { bg: 'bg-rose-500',    light: 'bg-rose-500/10',    border: 'border-rose-500/30',    text: 'text-rose-400'    },
  emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  amber:   { bg: 'bg-amber-500',   light: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400'   },
  sky:     { bg: 'bg-sky-500',     light: 'bg-sky-500/10',     border: 'border-sky-500/30',     text: 'text-sky-400'     },
}
const EMPTY_FORM = { title: '', date: '', time: '', type: 'reminder', color: 'indigo' }

// Fix: pure helpers outside component
function formatTime(time) {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const display = hour % 12 || 12
  return `${display}:${m} ${ampm}`
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function Calendar() {
  const { assignments, loading: assignmentsLoading } = useAssignments()
  const { subjects,    loading: subjectsLoading    } = useSubjects()
  const { grades,      loading: gradesLoading      } = useGrades()
  const { events, addEvent, deleteEvent,
          loading: eventsLoading                   } = useEvents()

  // Fix: stable today — primitive ms timestamp, never changes
  const todayMs = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }, [])
  const todayDate = useMemo(() => new Date(todayMs), [todayMs])

  const [current, setCurrent]         = useState({ year: todayDate.getFullYear(), month: todayDate.getMonth() })
  const [selected, setSelected]       = useState(null)
  const [showModal, setShowModal]     = useState(false)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting]       = useState(false)

  const isLoading = assignmentsLoading || subjectsLoading || gradesLoading || eventsLoading

  // Fix: Escape key closes modals
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return
      setShowModal(false)
      setConfirmDelete(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function prevMonth() {
    setCurrent(c => c.month === 0  ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 })
  }
  function nextMonth() {
    setCurrent(c => c.month === 11 ? { year: c.year + 1, month: 0  } : { ...c, month: c.month + 1 })
  }

  // Fix: memoised — only recalculates when month/year changes
  const cells = useMemo(() => {
    const firstDay    = new Date(current.year, current.month, 1).getDay()
    const daysInMonth = new Date(current.year, current.month + 1, 0).getDate()
    const arr = []
    for (let i = 0; i < firstDay; i++) arr.push(null)
    for (let d = 1; d <= daysInMonth; d++) arr.push(d)
    return arr
  }, [current.year, current.month])

  // Fix: pre-index items by date string — O(1) lookup per cell instead of O(n) filter × 35 cells
  const assignmentsByDate = useMemo(() => {
    const map = {}
    assignments.forEach(a => {
      if (!map[a.due_date]) map[a.due_date] = []
      map[a.due_date].push(a)
    })
    return map
  }, [assignments])

  const gradesByDate = useMemo(() => {
    const map = {}
    grades.forEach(g => {
      const ds = g.created_at?.slice(0, 10)
      if (!ds) return
      if (!map[ds]) map[ds] = []
      map[ds].push(g)
    })
    return map
  }, [grades])

  const eventsByDate = useMemo(() => {
    const map = {}
    events.forEach(e => {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    })
    return map
  }, [events])

  function getItemsForDay(day) {
    if (!day) return { assignments: [], grades: [], events: [] }
    const ds = toDateStr(current.year, current.month, day)
    return {
      assignments: assignmentsByDate[ds] || [],
      grades:      gradesByDate[ds]      || [],
      events:      eventsByDate[ds]      || [],
    }
  }

  const isToday = (day) =>
    day !== null &&
    toDateStr(current.year, current.month, day) === toDateStr(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate())

  const selectedItems = useMemo(
    () => selected ? getItemsForDay(selected) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, assignmentsByDate, gradesByDate, eventsByDate, current]
  )

  // Fix: upcoming list uses stable todayMs
  const upcomingItems = useMemo(() => {
    return [
      ...assignments
        .filter(a => a.status !== 'done' && new Date(a.due_date).getTime() >= todayMs)
        .map(a => ({ date: a.due_date, time: a.due_time, label: `📝 ${a.title}`, type: 'assignment' })),
      ...events
        .filter(e => new Date(e.date).getTime() >= todayMs)
        .map(e => ({ date: e.date, time: e.time, label: `⭐ ${e.title}`, type: 'event' })),
    ]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 6)
  }, [assignments, events, todayMs])

  function openAddEvent(day) {
    setForm({ ...EMPTY_FORM, date: day ? toDateStr(current.year, current.month, day) : '' })
    setError('')
    setShowModal(true)
  }

  // Fix: saving state, try/catch, error surfaced
  async function handleAddEvent() {
    if (!form.title.trim() || !form.date) return
    setSaving(true)
    setError('')
    try {
      await addEvent(form)
      setShowModal(false)
      setForm(EMPTY_FORM)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Fix: confirm modal + async delete with error handling
  async function handleDeleteEvent() {
    setDeleting(true)
    setError('')
    try {
      await deleteEvent(confirmDelete.id)
      setConfirmDelete(null)
    } catch (err) {
      setError(err.message || 'Failed to delete event. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-40" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-900 border border-gray-800 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-white">Calendar</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => openAddEvent(null)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + Add Event
          </button>
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition">‹</button>
          <span className="text-white font-semibold w-36 text-center">{MONTHS[current.month]} {current.year}</span>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition">›</button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* Calendar grid */}
        <div className="flex-1">
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs text-gray-500 font-medium py-2">
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{d[0]}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {cells.map((day, i) => {
              const items      = getItemsForDay(day)
              const totalItems = items.assignments.length + items.grades.length + items.events.length
              const isSelected = selected === day

              return (
                <div
                  key={i}
                  onClick={() => day && setSelected(isSelected ? null : day)}
                  onDoubleClick={() => day && openAddEvent(day)}
                  className={`min-h-12 lg:min-h-16 rounded-lg p-1 lg:p-1.5 transition
                    ${!day ? '' : 'cursor-pointer'}
                    ${isToday(day)  ? 'bg-indigo-600/20 border border-indigo-500/50' : day ? 'bg-gray-900 border border-gray-800 hover:border-indigo-500/30' : ''}
                    ${isSelected    ? 'border-indigo-500 bg-indigo-600/10' : ''}
                  `}
                >
                  {day && (
                    <>
                      <p className={`text-xs font-medium mb-0.5 lg:mb-1 ${isToday(day) ? 'text-indigo-400' : 'text-gray-400'}`}>
                        {day}
                      </p>
                      <div className="space-y-0.5 hidden sm:block">
                        {items.assignments.slice(0, 1).map(a => {
                          const subject = subjects.find(s => s.id === a.subject_id)
                          return (
                            <div key={a.id} className={`text-xs px-1 py-0.5 rounded truncate
                              ${a.status === 'done' ? 'bg-gray-700 text-gray-500'
                                : subject ? subject.color.bg + ' text-white'
                                : 'bg-indigo-600 text-white'}`}>
                              📝 {a.title}
                            </div>
                          )
                        })}
                        {items.events.slice(0, 1).map(e => {
                          const color = EVENT_COLORS[e.color] || EVENT_COLORS.indigo
                          return (
                            <div key={e.id} className={`text-xs px-1 py-0.5 rounded truncate ${color.bg} text-white`}>
                              ⭐ {e.title}
                            </div>
                          )
                        })}
                        {items.grades.length > 0 && (
                          <div className="text-xs px-1 py-0.5 rounded truncate bg-emerald-600 text-white">
                            📊 {items.grades.length} grade{items.grades.length > 1 ? 's' : ''}
                          </div>
                        )}
                        {totalItems > 2 && (
                          <p className="text-xs text-gray-500 px-1">+{totalItems - 2} more</p>
                        )}
                      </div>
                      {/* Mobile dots */}
                      <div className="flex gap-0.5 flex-wrap sm:hidden mt-0.5">
                        {items.assignments.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                        {items.events.length > 0      && <span className="w-1.5 h-1.5 rounded-full bg-amber-500"  />}
                        {items.grades.length > 0      && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Assignments</div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Grades</div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2 h-2 rounded-full bg-amber-500" /> Events</div>
            <p className="text-xs text-gray-600 hidden sm:block">Double-click a day to add event</p>
          </div>
        </div>

        {/* Side panel */}
        <div className="w-full lg:w-64 lg:flex-shrink-0 space-y-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            {selected ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">{MONTHS[current.month]} {selected}</h3>
                  <button
                    onClick={() => openAddEvent(selected)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                  >
                    + Event
                  </button>
                </div>

                {selectedItems.assignments.length === 0 && selectedItems.grades.length === 0 && selectedItems.events.length === 0 && (
                  <p className="text-gray-500 text-sm">Nothing on this day.</p>
                )}

                {selectedItems.assignments.map(a => {
                  const subject = subjects.find(s => s.id === a.subject_id)
                  return (
                    <div key={a.id} className="bg-gray-800 rounded-lg p-3 mb-2">
                      <p className={`text-sm font-medium ${a.status === 'done' ? 'line-through text-gray-500' : 'text-white'}`}>
                        📝 {a.title}
                      </p>
                      {a.due_time && <p className="text-xs text-indigo-400 mt-0.5">🕐 {formatTime(a.due_time)}</p>}
                      {subject && (
                        <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full border ${subject.color.light} ${subject.color.border} ${subject.color.text}`}>
                          {subject.name}
                        </span>
                      )}
                      <p className={`text-xs mt-1 capitalize ${a.priority === 'high' ? 'text-red-400' : a.priority === 'medium' ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {a.priority} priority {a.status === 'done' ? '· ✓ Done' : ''}
                      </p>
                    </div>
                  )
                })}

                {selectedItems.grades.map(g => {
                  // Fix: guard division by zero
                  const pct = g.max_score > 0 ? ((g.score / g.max_score) * 100).toFixed(1) : '0.0'
                  return (
                    <div key={g.id} className="bg-gray-800 rounded-lg p-3 mb-2">
                      <p className="text-sm font-medium text-white">📊 {g.title}</p>
                      <p className="text-xs text-emerald-400 mt-1">{g.score}/{g.max_score} — {pct}%</p>
                    </div>
                  )
                })}

                {selectedItems.events.map(e => {
                  const color = EVENT_COLORS[e.color] || EVENT_COLORS.indigo
                  return (
                    <div key={e.id} className="bg-gray-800 rounded-lg p-3 mb-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">⭐ {e.title}</p>
                        {/* Fix: opens confirm modal instead of inline delete */}
                        <button
                          onClick={() => { setError(''); setConfirmDelete(e) }}
                          className="text-gray-600 hover:text-red-400 text-xs transition"
                        >✕</button>
                      </div>
                      {e.time && <p className="text-xs text-indigo-400 mt-0.5">🕐 {formatTime(e.time)}</p>}
                      <p className={`text-xs mt-1 capitalize ${color.text}`}>{e.type}</p>
                    </div>
                  )
                })}
              </>
            ) : (
              <>
                <h3 className="text-white font-semibold mb-3">Upcoming</h3>
                {upcomingItems.length === 0 && (
                  <p className="text-gray-500 text-sm">Nothing upcoming.</p>
                )}
                {upcomingItems.map((item, i) => (
                  <div key={i} className="mb-2 bg-gray-800 rounded-lg p-3">
                    <p className="text-sm text-white font-medium">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(item.date).toLocaleDateString()}
                      {item.time && ` · ${formatTime(item.time)}`}
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showModal && (
        // Fix: backdrop click closes modal
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-white font-semibold text-lg">Add Event</h3>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Title</label>
              <input
                autoFocus
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
                placeholder="e.g. Final Exam"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Time (optional)</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
              >
                {EVENT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Color</label>
              <div className="flex gap-2">
                {Object.entries(EVENT_COLORS).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setForm(f => ({ ...f, color: key }))}
                    className={`w-7 h-7 rounded-full ${val.bg} ring-2 ring-offset-2 ring-offset-gray-900 transition
                      ${form.color === key ? 'ring-white scale-110' : 'ring-transparent hover:ring-gray-500'}`}
                  />
                ))}
              </div>
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2 text-sm transition disabled:opacity-40"
              >
                Cancel
              </button>
              {/* Fix: saving state, disabled while in-flight */}
              <button
                onClick={handleAddEvent}
                disabled={!form.title.trim() || !form.date || saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2 text-sm transition"
              >
                {saving ? 'Saving…' : 'Add Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setConfirmDelete(null)}
        >
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center">
              <p className="text-3xl mb-3">🗑️</p>
              <h3 className="text-white font-semibold text-lg">Delete Event?</h3>
              <p className="text-gray-400 text-sm mt-1">
                Are you sure you want to delete{' '}
                <span className="text-white font-medium">"{confirmDelete.title}"</span>? This cannot be undone.
              </p>
              {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2 text-sm transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg py-2 text-sm transition disabled:opacity-40"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}