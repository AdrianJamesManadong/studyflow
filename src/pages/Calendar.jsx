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
  CalendarDays,
  ListChecks,
} from 'lucide-react'

/* ─── animation helper (same pattern as Dashboard / Assignments / Notes) ─── */
const fadeUp = (delay = 0) => ({
  animation: `fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}ms both`,
})

// Fix: all constants outside component
const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Subject schedules can come in with day values in whatever shape the form
// that saved them used — 'Mon', 'Monday', 'monday', 'MON ', etc. Matching
// against DAYS with a strict equality check meant anything but the exact
// 3-letter form silently never matched, so classes could vanish with no
// error anywhere. This normalizes any reasonable variant to the 3-letter
// code the rest of the calendar keys off of.
const DAY_ALIASES = {
  sun: 'Sun', sunday: 'Sun',
  mon: 'Mon', monday: 'Mon',
  tue: 'Tue', tues: 'Tue', tuesday: 'Tue',
  wed: 'Wed', weds: 'Wed', wednesday: 'Wed',
  thu: 'Thu', thur: 'Thu', thurs: 'Thu', thursday: 'Thu',
  fri: 'Fri', friday: 'Fri',
  sat: 'Sat', saturday: 'Sat',
}
function normalizeDay(day) {
  if (!day) return null
  return DAY_ALIASES[day.toString().trim().toLowerCase()] || null
}
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

// Fallback swatch for subjects whose stored `color` isn't the expected
// { bg, light, border, text } object (legacy/malformed rows). Without this,
// `subject.color.bg` throws and takes the whole calendar down with it.
const DEFAULT_SUBJECT_COLOR = {
  bg: 'bg-indigo-500',
  light: 'bg-indigo-50 dark:bg-indigo-950/40',
  border: 'border-indigo-200 dark:border-indigo-800',
  text: 'text-indigo-600 dark:text-indigo-400',
}
function getSubjectColor(subject) {
  const c = subject?.color
  return c && typeof c === 'object' && c.bg ? c : DEFAULT_SUBJECT_COLOR
}

// Fix: pure helpers outside component
function formatTime(time) {
  if (!time) return ''
  const [h, m = '00'] = time.split(':')
  const hour = parseInt(h, 10)
  if (Number.isNaN(hour)) return ''
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const display = hour % 12 || 12
  return `${display}:${m} ${ampm}`
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Local-calendar "YYYY-MM-DD" for a Date (NOT toISOString, which is UTC and
// shifts the day for anyone not on UTC — e.g. a grade logged at 2am in
// Manila would land on the previous day).
function localDateStr(date) {
  return toDateStr(date.getFullYear(), date.getMonth(), date.getDate())
}

// Parses "YYYY-MM-DD" as a LOCAL date. `new Date('2026-10-06')` is parsed as
// UTC midnight, which displays as the wrong day in timezones behind UTC.
function parseLocalDate(str) {
  if (!str) return null
  const [y, m, d] = String(str).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function formatDateStr(str) {
  const d = parseLocalDate(str)
  return d ? d.toLocaleDateString() : ''
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

// Today's date string that rolls over at midnight (and when the tab wakes
// from sleep), so "today" highlighting / upcoming / classes-today never go
// stale on a page that's left open overnight.
function useTodayStr() {
  const [todayStr, setTodayStr] = useState(() => localDateStr(new Date()))

  useEffect(() => {
    let timer
    const refresh = () => setTodayStr(localDateStr(new Date()))
    const schedule = () => {
      const now = new Date()
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1)
      timer = setTimeout(() => { refresh(); schedule() }, next - now)
    }
    schedule()
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  return todayStr
}

export default function Calendar() {
  const { assignments, loading: assignmentsLoading } = useAssignments()
  const { subjects,    loading: subjectsLoading    } = useSubjects()
  const { grades,      loading: gradesLoading      } = useGrades()
  const { events, addEvent, deleteEvent,
          loading: eventsLoading                   } = useEvents()
  const { reminders,   loading: remindersLoading   } = useReminders()

  const todayStr  = useTodayStr()
  const todayDate = useMemo(() => parseLocalDate(todayStr), [todayStr])

  const [current, setCurrent]         = useState(() => {
    const t = parseLocalDate(localDateStr(new Date()))
    return { year: t.getFullYear(), month: t.getMonth() }
  })
  const [selected, setSelected]       = useState(null)
  const [showModal, setShowModal]     = useState(false)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)
  const [formError, setFormError]     = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting]       = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const isLoading = assignmentsLoading || subjectsLoading || gradesLoading || eventsLoading || remindersLoading

  // Escape closes the top-most modal (but not while a request is in flight)
  useEffect(() => {
    if (!showModal && !confirmDelete) return
    const handler = (e) => {
      if (e.key !== 'Escape') return
      if (confirmDelete) {
        if (!deleting) setConfirmDelete(null)
      } else if (showModal && !saving) {
        setShowModal(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showModal, confirmDelete, saving, deleting])

  // Changing month clears the selected day — otherwise "the 14th" silently
  // becomes the 14th of whatever month you navigated to.
  function prevMonth() {
    setSelected(null)
    setCurrent(c => c.month === 0  ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 })
  }
  function nextMonth() {
    setSelected(null)
    setCurrent(c => c.month === 11 ? { year: c.year + 1, month: 0  } : { ...c, month: c.month + 1 })
  }
  function goToToday() {
    setCurrent({ year: todayDate.getFullYear(), month: todayDate.getMonth() })
    setSelected(todayDate.getDate())
  }

  const viewingCurrentMonth =
    current.year === todayDate.getFullYear() && current.month === todayDate.getMonth()

  // Fix: memoised — only recalculates when month/year changes
  const cells = useMemo(() => {
    const firstDay    = new Date(current.year, current.month, 1).getDay()
    const daysInMonth = new Date(current.year, current.month + 1, 0).getDate()
    const arr = []
    for (let i = 0; i < firstDay; i++) arr.push(null)
    for (let d = 1; d <= daysInMonth; d++) arr.push(d)
    return arr
  }, [current.year, current.month])

  const subjectById = useMemo(() => {
    const map = {}
    subjects.forEach(s => { map[s.id] = s })
    return map
  }, [subjects])

  // Fix: pre-index items by date string — O(1) lookup per cell instead of O(n) filter × 35 cells
  const assignmentsByDate = useMemo(() => {
    const map = {}
    assignments.forEach(a => {
      if (!a.due_date) return
      if (!map[a.due_date]) map[a.due_date] = []
      map[a.due_date].push(a)
    })
    return map
  }, [assignments])

  // Grades are keyed by the LOCAL day they were logged (created_at is a UTC
  // timestamp, so slicing it would put late-night/early-morning grades on the
  // wrong day for anyone ahead of or behind UTC).
  const gradesByDate = useMemo(() => {
    const map = {}
    grades.forEach(g => {
      if (!g.created_at) return
      const created = new Date(g.created_at)
      if (Number.isNaN(created.getTime())) return
      const ds = localDateStr(created)
      if (!map[ds]) map[ds] = []
      map[ds].push(g)
    })
    return map
  }, [grades])

  const eventsByDate = useMemo(() => {
    const map = {}
    events.forEach(e => {
      if (!e.date) return
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
        (block.days || []).forEach(rawDay => {
          const day = normalizeDay(rawDay)
          if (!day) return
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
    day !== null && toDateStr(current.year, current.month, day) === todayStr

  const selectedItems = useMemo(
    () => selected ? getItemsForDay(selected) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, assignmentsByDate, gradesByDate, eventsByDate, remindersByDate, subjectsByWeekday, current]
  )

  // Upcoming list: compares "YYYY-MM-DD" strings directly (timezone-proof),
  // sorted by date then time.
  const upcomingItems = useMemo(() => {
    return [
      ...assignments
        .filter(a => a.status !== 'done' && a.due_date && a.due_date >= todayStr)
        .map(a => ({ key: `a-${a.id}`, date: a.due_date, time: a.due_time, label: a.title, type: 'assignment' })),
      ...events
        .filter(e => e.date && e.date >= todayStr)
        .map(e => ({ key: `e-${e.id}`, date: e.date, time: e.time, label: e.title, type: 'event' })),
      ...reminders
        .filter(r => !r.is_done && r.due_date && r.due_date >= todayStr)
        .map(r => ({ key: `r-${r.id}`, date: r.due_date, time: r.due_time, label: r.title, type: 'reminder' })),
    ]
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
      .slice(0, 6)
  }, [assignments, events, reminders, todayStr])

  // Today's classes — recurring, so shown separately from the date-based upcoming list.
  const todaysClasses = useMemo(
    () => subjectsByWeekday[DAYS[todayDate.getDay()]] || [],
    [subjectsByWeekday, todayDate]
  )

  // Summary stats for the top row — mirrors the stat-card pattern used on
  // Notes: total events this month, items due this week, classes today.
  const summary = useMemo(() => {
    const monthPrefix = `${current.year}-${String(current.month + 1).padStart(2, '0')}`
    const monthEvents = events.filter(e => e.date?.startsWith(monthPrefix)).length
    const weekEnd = localDateStr(new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 7))
    const dueThisWeek = assignments.filter(
      a => a.status !== 'done' && a.due_date && a.due_date >= todayStr && a.due_date <= weekEnd
    ).length
    return { monthEvents, dueThisWeek, classesToday: todaysClasses.length }
  }, [events, assignments, todayStr, todayDate, current, todaysClasses])

  // Opens the add-event modal with a sensible default date so the Add button
  // isn't dead until you pick one: the clicked day, else the selected day,
  // else today (if you're viewing this month), else the 1st of the viewed month.
  function openAddEvent(day) {
    let date
    if (day)           date = toDateStr(current.year, current.month, day)
    else if (selected) date = toDateStr(current.year, current.month, selected)
    else if (viewingCurrentMonth) date = todayStr
    else               date = toDateStr(current.year, current.month, 1)

    setForm({ ...EMPTY_FORM, date })
    setFormError('')
    setShowModal(true)
  }

  // Fix: saving state, try/catch, error surfaced
  async function handleAddEvent() {
    if (!form.title.trim() || !form.date || saving) return
    setSaving(true)
    setFormError('')
    try {
      await addEvent({ ...form, title: form.title.trim() })
      setShowModal(false)
      setForm(EMPTY_FORM)
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Fix: confirm modal + async delete with error handling
  async function handleDeleteEvent() {
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteEvent(confirmDelete.id)
      setConfirmDelete(null)
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete event. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  function toggleSelect(day) {
    setSelected(s => (s === day ? null : day))
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse motion-reduce:animate-none" role="status" aria-busy="true">
        <span className="sr-only">Loading calendar…</span>
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-40" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const navBtn = 'w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
  const inputCls = 'w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition'

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .c-stat { transition: transform .18s cubic-bezier(.22,1,.36,1); }
        .c-stat:hover { transform: translateY(-2px); }
        .c-day { transition: transform .15s cubic-bezier(.22,1,.36,1), border-color .15s, background-color .15s; }
        .c-day:hover { transform: translateY(-1px); }
        @media (prefers-reduced-motion: reduce) {
          .c-stat, .c-day { transition: none; }
          .c-stat:hover, .c-day:hover { transform: none; }
        }
      `}</style>

      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={fadeUp(0)}>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => openAddEvent(null)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all flex items-center gap-2 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
            >
              <Plus size={15} aria-hidden="true" /> Add Event
            </button>
            <button
              onClick={goToToday}
              disabled={viewingCurrentMonth && selected === todayDate.getDate()}
              className="text-sm font-medium px-3 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Today
            </button>
            <button onClick={prevMonth} aria-label="Previous month" className={navBtn}>
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <span aria-live="polite" className="text-gray-900 dark:text-white font-semibold w-36 text-center">
              {MONTHS[current.month]} {current.year}
            </span>
            <button onClick={nextMonth} aria-label="Next month" className={navBtn}>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-3 gap-3" style={fadeUp(60)}>
          <div className="c-stat bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 mb-1.5">
              <CalendarDays size={15} aria-hidden="true" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Events This Month</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{summary.monthEvents}</div>
          </div>
          <div className="c-stat bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400 mb-1.5">
              <ListChecks size={15} aria-hidden="true" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Due This Week</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{summary.dueThisWeek}</div>
          </div>
          <div className="c-stat bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-violet-500 dark:text-violet-400 mb-1.5">
              <GraduationCap size={15} aria-hidden="true" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Classes Today</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{summary.classesToday}</div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">

          {/* Calendar grid */}
          <div className="flex-1" style={fadeUp(100)}>
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
                // Overflow = what the chips can't show. Each category shows at most
                // one chip (grades collapse into a single "N grades" chip).
                const extra = ['classes', 'assignments', 'reminders', 'events']
                  .reduce((n, k) => n + Math.max(0, items[k].length - 1), 0)
                const isSelected = selected === day
                const todayCell  = isToday(day)

                // Empty leading cells: purely layout
                if (!day) return <div key={i} aria-hidden="true" className="min-h-12 lg:min-h-16" />

                return (
                  <div
                    key={i}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-current={todayCell ? 'date' : undefined}
                    aria-label={`${MONTHS[current.month]} ${day}, ${current.year}${todayCell ? ', today' : ''}${totalItems ? `, ${totalItems} item${totalItems !== 1 ? 's' : ''}` : ''}`}
                    onClick={() => toggleSelect(day)}
                    onDoubleClick={() => openAddEvent(day)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleSelect(day)
                      }
                    }}
                    className={`c-day min-h-12 lg:min-h-16 rounded-lg p-1 lg:p-1.5 cursor-pointer
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                      ${todayCell ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-700' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'}
                      ${isSelected ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' : ''}
                    `}
                  >
                    <p className={`text-xs font-medium mb-0.5 lg:mb-1 ${todayCell ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {day}
                    </p>
                    <div className="space-y-0.5 hidden sm:block">
                      {items.classes.slice(0, 1).map(({ subject }, idx) => (
                        <div key={`${subject.id}-${idx}`} className={`text-xs px-1 py-0.5 rounded truncate flex items-center gap-1 ${getSubjectColor(subject).bg} text-white`}>
                          <GraduationCap size={9} aria-hidden="true" className="flex-shrink-0" /> {subject.name}
                        </div>
                      ))}
                      {items.assignments.slice(0, 1).map(a => {
                        const subject = subjectById[a.subject_id]
                        return (
                          <div key={a.id} className={`text-xs px-1 py-0.5 rounded truncate flex items-center gap-1
                            ${a.status === 'done' ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                              : subject ? getSubjectColor(subject).bg + ' text-white'
                              : 'bg-indigo-600 text-white'}`}>
                            <FileText size={9} aria-hidden="true" className="flex-shrink-0" /> {a.title}
                          </div>
                        )
                      })}
                      {items.reminders.slice(0, 1).map(r => (
                        <div key={r.id} className={`text-xs px-1 py-0.5 rounded truncate flex items-center gap-1
                          ${r.is_done ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500' : 'bg-pink-600 text-white'}`}>
                          <Bell size={9} aria-hidden="true" className="flex-shrink-0" /> {r.title}
                        </div>
                      ))}
                      {items.events.slice(0, 1).map(e => {
                        const color = EVENT_COLORS[e.color] || EVENT_COLORS.indigo
                        return (
                          <div key={e.id} className={`text-xs px-1 py-0.5 rounded truncate flex items-center gap-1 ${color.bg} text-white`}>
                            <Star size={9} aria-hidden="true" className="flex-shrink-0" /> {e.title}
                          </div>
                        )
                      })}
                      {items.grades.length > 0 && (
                        <div className="text-xs px-1 py-0.5 rounded truncate flex items-center gap-1 bg-emerald-600 text-white">
                          <BarChart3 size={9} aria-hidden="true" className="flex-shrink-0" /> {items.grades.length} grade{items.grades.length > 1 ? 's' : ''}
                        </div>
                      )}
                      {extra > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 px-1">+{extra} more</p>
                      )}
                    </div>
                    {/* Mobile dots */}
                    <div className="flex gap-0.5 flex-wrap sm:hidden mt-0.5" aria-hidden="true">
                      {items.classes.length > 0     && <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
                      {items.assignments.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                      {items.reminders.length > 0   && <span className="w-1.5 h-1.5 rounded-full bg-pink-500"   />}
                      {items.events.length > 0      && <span className="w-1.5 h-1.5 rounded-full bg-amber-500"  />}
                      {items.grades.length > 0      && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><span aria-hidden="true" className="w-2 h-2 rounded-full bg-violet-500" /> Classes</div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><span aria-hidden="true" className="w-2 h-2 rounded-full bg-indigo-500" /> Assignments</div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><span aria-hidden="true" className="w-2 h-2 rounded-full bg-pink-500" /> Reminders</div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><span aria-hidden="true" className="w-2 h-2 rounded-full bg-emerald-500" /> Grades</div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><span aria-hidden="true" className="w-2 h-2 rounded-full bg-amber-500" /> Events</div>
              <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">Double-click a day to add event</p>
            </div>
          </div>

          {/* Side panel */}
          <div className="w-full lg:w-64 lg:flex-shrink-0 space-y-3" style={fadeUp(140)}>
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

                  {selectedItems.classes.map(({ subject, block }, idx) => {
                    const sc = getSubjectColor(subject)
                    return (
                      <div key={`${subject.id}-${idx}`} className={`border rounded-lg p-3 mb-2 ${sc.light} ${sc.border}`}>
                        <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                          <GraduationCap size={13} aria-hidden="true" className="flex-shrink-0" /> {subject.name}
                        </p>
                        {(block.startTime || block.endTime) && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 flex items-center gap-1">
                            <Clock size={11} aria-hidden="true" /> {formatTime(block.startTime)}{block.endTime && ` – ${formatTime(block.endTime)}`}
                          </p>
                        )}
                        {block.room && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                            <MapPin size={11} aria-hidden="true" /> {block.room}
                          </p>
                        )}
                        {subject.professor && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                            <User size={11} aria-hidden="true" /> {subject.professor}
                          </p>
                        )}
                      </div>
                    )
                  })}

                  {selectedItems.assignments.map(a => {
                    const subject = subjectById[a.subject_id]
                    const sc = getSubjectColor(subject)
                    return (
                      <div key={a.id} className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg p-3 mb-2">
                        <p className={`text-sm font-medium flex items-center gap-1.5 ${a.status === 'done' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                          <FileText size={13} aria-hidden="true" className="flex-shrink-0" /> {a.title}
                        </p>
                        {a.due_time && <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 flex items-center gap-1"><Clock size={11} aria-hidden="true" /> {formatTime(a.due_time)}</p>}
                        {subject && (
                          <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full border ${sc.light} ${sc.border} ${sc.text}`}>
                            {subject.name}
                          </span>
                        )}
                        <p className={`text-xs mt-1 capitalize flex items-center gap-1 ${a.priority === 'high' ? 'text-red-600 dark:text-red-400' : a.priority === 'medium' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {a.priority} priority {a.status === 'done' && <><CheckCircle2 size={11} aria-hidden="true" /> Done</>}
                        </p>
                      </div>
                    )
                  })}

                  {selectedItems.reminders.map(r => {
                    const subject = subjectById[r.subject_id]
                    const sc = getSubjectColor(subject)
                    const linkedAssignment = assignments.find(a => a.id === r.assignment_id)
                    return (
                      <div key={r.id} className="bg-pink-50 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900 rounded-lg p-3 mb-2">
                        <p className={`text-sm font-medium flex items-center gap-1.5 ${r.is_done ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                          <Bell size={13} aria-hidden="true" className="flex-shrink-0" /> {r.title}
                        </p>
                        {r.due_time && <p className="text-xs text-pink-600 dark:text-pink-400 mt-0.5 flex items-center gap-1"><Clock size={11} aria-hidden="true" /> {formatTime(r.due_time)}</p>}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {subject && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.light} ${sc.border} ${sc.text}`}>
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
                          {r.priority} priority {r.is_done && <><CheckCircle2 size={11} aria-hidden="true" /> Done</>}
                        </p>
                      </div>
                    )
                  })}

                  {selectedItems.grades.map(g => {
                    // Fix: guard division by zero
                    const pct = g.max_score > 0 ? ((g.score / g.max_score) * 100).toFixed(1) : '0.0'
                    return (
                      <div key={g.id} className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg p-3 mb-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5"><BarChart3 size={13} aria-hidden="true" /> {g.title}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{g.score}/{g.max_score} — {pct}%</p>
                      </div>
                    )
                  })}

                  {selectedItems.events.map(e => {
                    const color = EVENT_COLORS[e.color] || EVENT_COLORS.indigo
                    return (
                      <div key={e.id} className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg p-3 mb-2 group">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5 min-w-0">
                            <Star size={13} aria-hidden="true" className="flex-shrink-0" /> <span className="truncate">{e.title}</span>
                          </p>
                          {/* Opens the confirm modal. Hover-reveal only where hover exists;
                              always visible on touch, and visible on keyboard focus. */}
                          <button
                            onClick={() => { setDeleteError(''); setConfirmDelete(e) }}
                            aria-label={`Delete event ${e.title}`}
                            className="p-1 -m-1 flex-shrink-0 rounded text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors
                              [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100
                              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          ><X size={14} aria-hidden="true" /></button>
                        </div>
                        {e.time && <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 flex items-center gap-1"><Clock size={11} aria-hidden="true" /> {formatTime(e.time)}</p>}
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
                        <GraduationCap size={15} aria-hidden="true" /> Today's Classes
                      </h3>
                      {todaysClasses.map(({ subject, block }, idx) => {
                        const sc = getSubjectColor(subject)
                        return (
                          <div key={`${subject.id}-${idx}`} className={`border rounded-lg p-3 mb-2 last:mb-0 ${sc.light} ${sc.border}`}>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{subject.name}</p>
                            {(block.startTime || block.endTime) && (
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 flex items-center gap-1">
                                <Clock size={11} aria-hidden="true" /> {formatTime(block.startTime)}{block.endTime && ` – ${formatTime(block.endTime)}`}
                              </p>
                            )}
                            {block.room && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                                <MapPin size={11} aria-hidden="true" /> {block.room}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <h3 className="text-gray-900 dark:text-white font-semibold mb-3">Upcoming</h3>
                  {upcomingItems.length === 0 && (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Nothing upcoming.</p>
                  )}
                  {upcomingItems.map(item => {
                    const ItemIcon = item.type === 'assignment' ? FileText : item.type === 'reminder' ? Bell : Star
                    return (
                      <div key={item.key} className="mb-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                        <p className="text-sm text-gray-900 dark:text-white font-medium flex items-center gap-1.5">
                          <ItemIcon size={13} aria-hidden="true" className="flex-shrink-0" /> {item.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {formatDateStr(item.date)}
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
          // Fix: backdrop click closes modal (unless saving)
          <div
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-event-title"
            onClick={(e) => e.target === e.currentTarget && !saving && setShowModal(false)}
          >
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
              <h3 id="add-event-title" className="text-gray-900 dark:text-white font-semibold text-lg">Add Event</h3>

              <div>
                <label htmlFor="event-title" className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Title</label>
                <input
                  id="event-title"
                  autoFocus
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  onKeyDown={e => {
                    // isComposing guard: don't submit while an IME is mid-composition
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAddEvent()
                  }}
                  placeholder="e.g. Final Exam"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="event-date" className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Date</label>
                  <input
                    id="event-date"
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="event-time" className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Time (optional)</label>
                  <input
                    id="event-time"
                    type="time"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="event-type" className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Type</label>
                <select
                  id="event-type"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className={inputCls}
                >
                  {EVENT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>

              <div>
                <span id="event-color-label" className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Color</span>
                <div className="flex gap-2" role="group" aria-labelledby="event-color-label">
                  {Object.entries(EVENT_COLORS).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: key }))}
                      aria-label={key}
                      aria-pressed={form.color === key}
                      className={`w-7 h-7 rounded-full ${val.bg} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 transition
                        ${form.color === key ? 'ring-gray-900 dark:ring-white scale-110' : 'ring-transparent hover:ring-gray-300 dark:hover:ring-gray-600'}`}
                    />
                  ))}
                </div>
              </div>

              {formError && <p role="alert" className="text-red-600 dark:text-red-400 text-xs">{formError}</p>}

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
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-event-title"
            onClick={(e) => e.target === e.currentTarget && !deleting && setConfirmDelete(null)}
          >
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-center mx-auto mb-3">
                  <Trash2 size={20} aria-hidden="true" className="text-red-500 dark:text-red-400" />
                </div>
                <h3 id="delete-event-title" className="text-gray-900 dark:text-white font-semibold text-lg">Delete Event?</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  Are you sure you want to delete{' '}
                  <span className="text-gray-900 dark:text-white font-medium">"{confirmDelete.title}"</span>? This cannot be undone.
                </p>
                {deleteError && <p role="alert" className="text-red-600 dark:text-red-400 text-xs mt-2">{deleteError}</p>}
              </div>
              <div className="flex gap-3">
                <button
                  autoFocus
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
    </>
  )
}