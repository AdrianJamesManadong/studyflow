import { useState, useEffect, useMemo } from 'react'
import { useAssignments } from '../hooks/useAssignments'
import { useSubjects } from '../hooks/useSubjects'
import { useGrades } from '../hooks/useGrades'
import { useEvents } from '../hooks/useEvents'
import { useReminders } from '../hooks/useReminders'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
  Star,
  BarChart3,
  Clock,
  CheckCircle2,
  X,
  Trash2,
  GraduationCap,
  MapPin,
  User,
  Bell,
} from 'lucide-react'

// Fix: all constants outside component
const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const EVENT_TYPES = ['reminder', 'exam', 'holiday', 'meeting', 'other']
const EVENT_COLORS = {
  indigo:  { bg: 'bg-indigo-500',  light: 'bg-indigo-50 dark:bg-indigo-950/40',  border: 'border-indigo-200 dark:border-indigo-800',  text: 'text-indigo-600 dark:text-indigo-400'  },
  rose:    { bg: 'bg-rose-500',    light: 'bg-rose-50 dark:bg-rose-950/40',    border: 'border-rose-200 dark:border-rose-800',    text: 'text-rose-600 dark:text-rose-400'    },
  emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-600 dark:text-emerald-400' },
  amber:   { bg: 'bg-amber-500',   light: 'bg-amber-50 dark:bg-amber-950/40',   border: 'border-amber-200 dark:border-amber-800',   text: 'text-amber-600 dark:text-amber-400'   },
  sky:     { bg: 'bg-sky-500',     light: 'bg-sky-50 dark:bg-sky-950/40',     border: 'border-sky-200 dark:border-sky-800',     text: 'text-sky-600 dark:text-sky-400'     },
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

// A subject can now have multiple schedule blocks (different days/times/rooms
// for lecture vs. lab, for example). This reads that array off the subject,
// falling back to the old single days/startTime/endTime/room fields for any
// subject that hasn't been touched since the multi-schedule update.
function getSubjectSchedules(subject) {
  if (Array.isArray(subject.schedules) && subject.schedules.length > 0) {
    return subject.schedules
  }
  if (subject.days?.length || subject.startTime || subject.room) {
    return [{
      days: subject.days || [],
      startTime: subject.startTime || '',
      endTime: subject.endTime || '',
      room: subject.room || '',
    }]
  }
  return []
}

export default function Calendar() {
  const { assignments, loading: assignmentsLoading } = useAssignments()
  const { subjects,    loading: subjectsLoading    } = useSubjects()
  const { grades,      loading: gradesLoading      } = useGrades()
  const { events, addEvent, deleteEvent,
          loading: eventsLoading                   } = useEvents()
  const { reminders,   loading: remindersLoading   } = useReminders()

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

  const isLoading = assignmentsLoading || subjectsLoading || gradesLoading || eventsLoading || remindersLoading

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

  // Reminders are optional-date — only index the ones that actually have one.
  const remindersByDate = useMemo(() => {
    const map = {}
    reminders.forEach(r => {
      if (!r.due_date) return
      if (!map[r.due_date]) map[r.due_date] = []
      map[r.due_date].push(r)
    })
    return map
  }, [reminders])

  // Subject class schedules are recurring by weekday, not tied to one date.
  // Each subject can have several schedule blocks (e.g. lecture Mon/Wed in
  // one room, lab Fri in another), so we index by weekday abbreviation and
  // store { subject, block } pairs — one pair per (subject, matching day).
  // That way a subject with two different rooms on two different days shows
  // the correct room/time on each day, instead of just its first schedule.
  const subjectsByWeekday = useMemo(() => {
    const map = {}
    subjects.forEach(s => {
      getSubjectSchedules(s).forEach(block => {
        (block.days || []).forEach(day => {
          if (!map[day]) map[day] = []
          map[day].push({ subject: s, block })
        })
      })
    })
    Object.values(map).forEach(list =>
      list.sort((a, b) => (a.block.startTime || '').localeCompare(b.block.startTime || ''))
    )
    return map
  }, [subjects])

  function getClassesForDay(day) {
    if (!day) return []
    const weekday = DAYS[new Date(current.year, current.month, day).getDay()]
    return subjectsByWeekday[weekday] || []
  }

  function getItemsForDay(day) {
    if (!day) return { assignments: [], grades: [], events: [], classes: [], reminders: [] }
    const ds = toDateStr(current.year, current.month, day)
    return {
      assignments: assignmentsByDate[ds] || [],
      grades:      gradesByDate[ds]      || [],
      events:      eventsByDate[ds]      || [],
      reminders:   remindersByDate[ds]   || [],
      classes:     getClassesForDay(day),
    }
  }

  const isToday = (day) =>
    day !== null &&
    toDateStr(current.year, current.month, day) === toDateStr(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate())

  const selectedItems = useMemo(
    () => selected ? getItemsForDay(selected) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, assignmentsByDate, gradesByDate, eventsByDate, remindersByDate, subjectsByWeekday, current]
  )

  // Fix: upcoming list uses stable todayMs
  const upcomingItems = useMemo(() => {
    return [
      ...assignments
        .filter(a => a.status !== 'done' && new Date(a.due_date).getTime() >= todayMs)
        .map(a => ({ date: a.due_date, time: a.due_time, label: a.title, type: 'assignment' })),
      ...events
        .filter(e => new Date(e.date).getTime() >= todayMs)
        .map(e => ({ date: e.date, time: e.time, label: e.title, type: 'event' })),
      ...reminders
        .filter(r => !r.is_done && r.due_date && new Date(r.due_date).getTime() >= todayMs)
        .map(r => ({ date: r.due_date, time: r.due_time, label: r.title, type: 'reminder' })),
    ]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 6)
  }, [assignments, events, reminders, todayMs])

  // Today's classes — recurring, so shown separately from the date-based upcoming list.
  const todaysClasses = useMemo(
    () => subjectsByWeekday[DAYS[todayDate.getDay()]] || [],
    [subjectsByWeekday, todayDate]
  )

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
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-40" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => openAddEvent(null)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <Plus size={15} /> Add Event
          </button>
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-gray-900 dark:text-white font-semibold w-36 text-center">{MONTHS[current.month]} {current.year}</span>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* Calendar grid */}
        <div className="flex-1">
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs text-gray-500 dark:text-gray-400 font-medium py-2">
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{d[0]}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {cells.map((day, i) => {
              const items      = getItemsForDay(day)
              const totalItems = items.classes.length + items.assignments.length + items.reminders.length + items.grades.length + items.events.length
              const isSelected = selected === day

              return (
                <div
                  key={i}
                  onClick={() => day && setSelected(isSelected ? null : day)}
                  onDoubleClick={() => day && openAddEvent(day)}
                  className={`min-h-12 lg:min-h-16 rounded-lg p-1 lg:p-1.5 transition-colors
                    ${!day ? '' : 'cursor-pointer'}
                    ${isToday(day)  ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-700' : day ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700' : ''}
                    ${isSelected    ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' : ''}
                  `}
                >
                  {day && (
                    <>
                      <p className={`text-xs font-medium mb-0.5 lg:mb-1 ${isToday(day) ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {day}
                      </p>
                      <div className="space-y-0.5 hidden sm:block">
                        {items.classes.slice(0, 1).map(({ subject, block }, idx) => (
                          <div key={`${subject.id}-${idx}`} className={`text-xs px-1 py-0.5 rounded truncate flex items-center gap-1 ${subject.color.bg} text-white`}>
                            <GraduationCap size={9} className="flex-shrink-0" /> {subject.name}
                          </div>
                        ))}
                        {items.assignments.slice(0, 1).map(a => {
                          const subject = subjects.find(s => s.id === a.subject_id)
                          return (
                            <div key={a.id} className={`text-xs px-1 py-0.5 rounded truncate flex items-center gap-1
                              ${a.status === 'done' ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                                : subject ? subject.color.bg + ' text-white'
                                : 'bg-indigo-600 text-white'}`}>
                              <FileText size={9} className="flex-shrink-0" /> {a.title}
                            </div>
                          )
                        })}
                        {items.reminders.slice(0, 1).map(r => (
                          <div key={r.id} className={`text-xs px-1 py-0.5 rounded truncate flex items-center gap-1
                            ${r.is_done ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500' : 'bg-pink-600 text-white'}`}>
                            <Bell size={9} className="flex-shrink-0" /> {r.title}
                          </div>
                        ))}
                        {items.events.slice(0, 1).map(e => {
                          const color = EVENT_COLORS[e.color] || EVENT_COLORS.indigo
                          return (
                            <div key={e.id} className={`text-xs px-1 py-0.5 rounded truncate flex items-center gap-1 ${color.bg} text-white`}>
                              <Star size={9} className="flex-shrink-0" /> {e.title}
                            </div>
                          )
                        })}
                        {items.grades.length > 0 && (
                          <div className="text-xs px-1 py-0.5 rounded truncate flex items-center gap-1 bg-emerald-600 text-white">
                            <BarChart3 size={9} className="flex-shrink-0" /> {items.grades.length} grade{items.grades.length > 1 ? 's' : ''}
                          </div>
                        )}
                        {totalItems > 4 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 px-1">+{totalItems - 4} more</p>
                        )}
                      </div>
                      {/* Mobile dots */}
                      <div className="flex gap-0.5 flex-wrap sm:hidden mt-0.5">
                        {items.classes.length > 0     && <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
                        {items.assignments.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                        {items.reminders.length > 0   && <span className="w-1.5 h-1.5 rounded-full bg-pink-500"   />}
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
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-violet-500" /> Classes</div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Assignments</div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-pink-500" /> Reminders</div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Grades</div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><span className="w-2 h-2 rounded-full bg-amber-500" /> Events</div>
            <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">Double-click a day to add event</p>
          </div>
        </div>

        {/* Side panel */}
        <div className="w-full lg:w-64 lg:flex-shrink-0 space-y-3">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
            {selected ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-900 dark:text-white font-semibold">{MONTHS[current.month]} {selected}</h3>
                  <button
                    onClick={() => openAddEvent(selected)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
                  >
                    + Event
                  </button>
                </div>

                {selectedItems.classes.length === 0 && selectedItems.assignments.length === 0 && selectedItems.reminders.length === 0 && selectedItems.grades.length === 0 && selectedItems.events.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Nothing on this day.</p>
                )}

                {selectedItems.classes.map(({ subject, block }, idx) => (
                  <div key={`${subject.id}-${idx}`} className={`border rounded-lg p-3 mb-2 ${subject.color.light} ${subject.color.border}`}>
                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                      <GraduationCap size={13} className="flex-shrink-0" /> {subject.name}
                    </p>
                    {(block.startTime || block.endTime) && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 flex items-center gap-1">
                        <Clock size={11} /> {formatTime(block.startTime)}{block.endTime && ` – ${formatTime(block.endTime)}`}
                      </p>
                    )}
                    {block.room && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                        <MapPin size={11} /> {block.room}
                      </p>
                    )}
                    {subject.professor && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                        <User size={11} /> {subject.professor}
                      </p>
                    )}
                  </div>
                ))}

                {selectedItems.assignments.map(a => {
                  const subject = subjects.find(s => s.id === a.subject_id)
                  return (
                    <div key={a.id} className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg p-3 mb-2">
                      <p className={`text-sm font-medium flex items-center gap-1.5 ${a.status === 'done' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                        <FileText size={13} className="flex-shrink-0" /> {a.title}
                      </p>
                      {a.due_time && <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 flex items-center gap-1"><Clock size={11} /> {formatTime(a.due_time)}</p>}
                      {subject && (
                        <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full border ${subject.color.light} ${subject.color.border} ${subject.color.text}`}>
                          {subject.name}
                        </span>
                      )}
                      <p className={`text-xs mt-1 capitalize flex items-center gap-1 ${a.priority === 'high' ? 'text-red-600 dark:text-red-400' : a.priority === 'medium' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {a.priority} priority {a.status === 'done' && <><CheckCircle2 size={11} /> Done</>}
                      </p>
                    </div>
                  )
                })}

                {selectedItems.reminders.map(r => {
                  const subject = subjects.find(s => s.id === r.subject_id)
                  const linkedAssignment = assignments.find(a => a.id === r.assignment_id)
                  return (
                    <div key={r.id} className="bg-pink-50 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900 rounded-lg p-3 mb-2">
                      <p className={`text-sm font-medium flex items-center gap-1.5 ${r.is_done ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                        <Bell size={13} className="flex-shrink-0" /> {r.title}
                      </p>
                      {r.due_time && <p className="text-xs text-pink-600 dark:text-pink-400 mt-0.5 flex items-center gap-1"><Clock size={11} /> {formatTime(r.due_time)}</p>}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
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
                      </div>
                      <p className={`text-xs mt-1 capitalize flex items-center gap-1 ${r.priority === 'high' ? 'text-red-600 dark:text-red-400' : r.priority === 'medium' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {r.priority} priority {r.is_done && <><CheckCircle2 size={11} /> Done</>}
                      </p>
                    </div>
                  )
                })}

                {selectedItems.grades.map(g => {
                  // Fix: guard division by zero
                  const pct = g.max_score > 0 ? ((g.score / g.max_score) * 100).toFixed(1) : '0.0'
                  return (
                    <div key={g.id} className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg p-3 mb-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5"><BarChart3 size={13} /> {g.title}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{g.score}/{g.max_score} — {pct}%</p>
                    </div>
                  )
                })}

                {selectedItems.events.map(e => {
                  const color = EVENT_COLORS[e.color] || EVENT_COLORS.indigo
                  return (
                    <div key={e.id} className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg p-3 mb-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5"><Star size={13} /> {e.title}</p>
                        {/* Fix: opens confirm modal instead of inline delete */}
                        <button
                          onClick={() => { setError(''); setConfirmDelete(e) }}
                          className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        ><X size={14} /></button>
                      </div>
                      {e.time && <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 flex items-center gap-1"><Clock size={11} /> {formatTime(e.time)}</p>}
                      <p className={`text-xs mt-1 capitalize ${color.text}`}>{e.type}</p>
                    </div>
                  )
                })}
              </>
            ) : (
              <>
                {todaysClasses.length > 0 && (
                  <div className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-gray-900 dark:text-white font-semibold mb-3 flex items-center gap-1.5">
                      <GraduationCap size={15} /> Today's Classes
                    </h3>
                    {todaysClasses.map(({ subject, block }, idx) => (
                      <div key={`${subject.id}-${idx}`} className={`border rounded-lg p-3 mb-2 last:mb-0 ${subject.color.light} ${subject.color.border}`}>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{subject.name}</p>
                        {(block.startTime || block.endTime) && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 flex items-center gap-1">
                            <Clock size={11} /> {formatTime(block.startTime)}{block.endTime && ` – ${formatTime(block.endTime)}`}
                          </p>
                        )}
                        {block.room && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                            <MapPin size={11} /> {block.room}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <h3 className="text-gray-900 dark:text-white font-semibold mb-3">Upcoming</h3>
                {upcomingItems.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Nothing upcoming.</p>
                )}
                {upcomingItems.map((item, i) => {
                  const ItemIcon = item.type === 'assignment' ? FileText : item.type === 'reminder' ? Bell : Star
                  return (
                    <div key={i} className="mb-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                      <p className="text-sm text-gray-900 dark:text-white font-medium flex items-center gap-1.5">
                        <ItemIcon size={13} className="flex-shrink-0" /> {item.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {new Date(item.date).toLocaleDateString()}
                        {item.time && ` · ${formatTime(item.time)}`}
                      </p>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showModal && (
        // Fix: backdrop click closes modal
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Add Event</h3>

            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Title</label>
              <input
                autoFocus
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
                placeholder="e.g. Final Exam"
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Time (optional)</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition"
              >
                {EVENT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Color</label>
              <div className="flex gap-2">
                {Object.entries(EVENT_COLORS).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setForm(f => ({ ...f, color: key }))}
                    className={`w-7 h-7 rounded-full ${val.bg} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 transition
                      ${form.color === key ? 'ring-gray-900 dark:ring-white scale-110' : 'ring-transparent hover:ring-gray-300 dark:hover:ring-gray-600'}`}
                  />
                ))}
              </div>
            </div>

            {error && <p className="text-red-600 dark:text-red-400 text-xs">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              {/* Fix: saving state, disabled while in-flight */}
              <button
                onClick={handleAddEvent}
                disabled={!form.title.trim() || !form.date || saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2 text-sm shadow-sm transition-colors"
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
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setConfirmDelete(null)}
        >
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-center mx-auto mb-3">
                <Trash2 size={20} className="text-red-500 dark:text-red-400" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Delete Event?</h3>
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
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg py-2 text-sm transition-colors disabled:opacity-40"
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