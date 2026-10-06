import { useState, useEffect, useMemo, useRef } from 'react'
import { useAssignments } from '../hooks/useAssignments'
import { useSubjects } from '../hooks/useSubjects'
import { AssignmentsSkeleton } from '../components/Skeleton'
import {
  AlertTriangle,
  X,
  ClipboardList,
  Check,
  Trash2,
  Pencil,
  ListChecks,
  Flame,
  CircleDot,
} from 'lucide-react'

const PRIORITIES = ['low', 'medium', 'high']
const FILTERS = ['all', 'pending', 'done']

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

// Explicit ring colors (the old "ring-current/30" isn't a valid Tailwind class)
const priorityRing = {
  low:    'ring-emerald-400/50',
  medium: 'ring-amber-400/50',
  high:   'ring-red-400/50',
}

/*
  Entrance animation helper.
  Uses "backwards" instead of "both" on purpose: with "both" the last keyframe
  (transform: translateY(0)) sticks forever and overrides :hover transforms,
  so the row/stat hover motion never worked.
*/
const fadeUp = (delay = 0) => ({
  animation: `fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms backwards`,
})

const inputCls =
  'w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition'

/* ─────────── date helpers ─────────── */

// "YYYY-MM-DD" must be parsed as a LOCAL date. new Date("2026-09-23") is UTC
// midnight, which shows the wrong day (and wrongly "overdue") west of UTC.
function parseLocalDate(value) {
  if (!value) return null
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function startOfToday() {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return t
}

function toInputDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function inDays(n) {
  const d = startOfToday()
  d.setDate(d.getDate() + n)
  return toInputDate(d)
}

function formatTime(time) {
  if (!time) return ''
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const display = hour % 12 || 12
  return `${display}:${m} ${ampm}`
}

function formatShortDate(dueDate) {
  return parseLocalDate(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Compare against start of day, not current time
function isOverdue(dueDate, status) {
  if (status === 'done') return false
  return parseLocalDate(dueDate) < startOfToday()
}

// Whole days between today and the due date (negative = overdue).
function daysUntil(dueDate) {
  return Math.round((parseLocalDate(dueDate) - startOfToday()) / (1000 * 60 * 60 * 24))
}

// Everything the deadline block needs: how urgent it is, what to show big,
// what to show small underneath, and the tone that drives its color.
function getDeadlineInfo(a) {
  const dateLabel = formatShortDate(a.due_date) + (a.due_time ? ` · ${formatTime(a.due_time)}` : '')

  if (a.status === 'done') {
    return { tone: 'done', big: <Check size={18} strokeWidth={3} />, sub: 'Done', dateLabel }
  }

  const diff = daysUntil(a.due_date)

  if (diff < 0) {
    const n = Math.abs(diff)
    return { tone: 'overdue', big: n, sub: n === 1 ? 'day overdue' : 'days overdue', dateLabel }
  }
  if (diff === 0) {
    return { tone: 'today', big: 'Today', sub: 'it’s due', dateLabel, wordy: true }
  }
  if (diff === 1) {
    return { tone: 'soon', big: 'Tomorrow', sub: 'due date', dateLabel, wordy: true }
  }
  if (diff <= 3) {
    return { tone: 'soon', big: diff, sub: 'days left', dateLabel }
  }
  return { tone: 'normal', big: diff, sub: 'days left', dateLabel }
}

const deadlineToneStyles = {
  overdue: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400',
  today:   'bg-amber-100 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400',
  soon:    'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400',
  normal:  'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400',
  done:    'bg-gray-50 dark:bg-gray-900/60 border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-600',
}

function DeadlineBlock({ assignment }) {
  const info = getDeadlineInfo(assignment)
  return (
    <div
      className={`${info.tone === 'today' ? 'a-live' : ''} flex-shrink-0 w-[5.5rem] rounded-2xl border px-2 py-2.5 text-center transition-colors duration-300 ${deadlineToneStyles[info.tone]}`}
    >
      <div
        className={`font-bold leading-tight ${
          info.wordy ? 'text-sm' : info.tone === 'done' ? 'flex justify-center' : 'text-2xl tabular-nums'
        }`}
      >
        {info.big}
      </div>
      <div className="text-[11px] font-medium mt-0.5 opacity-90">{info.sub}</div>
      <div className="text-[10px] mt-1.5 pt-1.5 border-t border-black/10 dark:border-white/10 opacity-60">
        {info.dateLabel}
      </div>
    </div>
  )
}

/* ─────────── small building blocks ─────────── */

// Numbers count up on load / when they change. Skipped for reduced motion.
function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0)
  const valueRef = useRef(0)

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      valueRef.current = target
      setValue(target)
      return
    }
    const from = valueRef.current
    let raf
    let start
    const tick = t => {
      if (start === undefined) start = t
      const p = Math.min((t - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      const v = p < 1 ? from + (target - from) * eased : target
      valueRef.current = v
      setValue(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return Math.round(value)
}

function StatCard({ Icon, label, value, chipClass, valueClass = 'text-gray-900 dark:text-white', delay }) {
  const shown = useCountUp(value)
  return (
    <div
      className="a-stat bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm"
      style={fadeUp(delay)}
    >
      <div className="flex flex-col items-start gap-2.5 sm:flex-row sm:items-center sm:gap-3">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${chipClass}`}>
          <Icon size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className={`text-2xl font-bold leading-none tabular-nums ${valueClass}`}>{shown}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{label}</div>
        </div>
      </div>
    </div>
  )
}

// Segmented control with one pill that slides between options
function FilterTabs({ value, onChange, counts }) {
  const index = FILTERS.indexOf(value)
  return (
    <div
      role="tablist"
      aria-label="Filter assignments"
      className="relative inline-grid grid-cols-3 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-full sm:w-auto"
    >
      <span
        aria-hidden="true"
        className="absolute top-1 bottom-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-lg bg-white dark:bg-gray-700 shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.3,1.2,0.5,1)] motion-reduce:transition-none"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {FILTERS.map(f => (
        <button
          key={f}
          role="tab"
          aria-selected={value === f}
          onClick={() => onChange(f)}
          className={`a-tab relative z-10 sm:min-w-[6.5rem] px-4 py-1.5 rounded-lg text-sm font-medium capitalize flex items-center justify-center gap-1.5 transition-colors duration-200
            ${value === f ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
        >
          {f}
          <span
            className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded-full transition-colors duration-200 ${
              value === f
                ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300'
                : 'bg-gray-200/70 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            {counts[f]}
          </span>
        </button>
      ))}
    </div>
  )
}

function Modal({ children, onClose, labelId, maxWidth = 'max-w-md' }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
      onClick={e => e.target === e.currentTarget && onClose()}
      className="a-fade fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <div
        className={`a-pop w-full ${maxWidth} max-h-[90vh] flex flex-col bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden`}
      >
        {children}
      </div>
    </div>
  )
}

const dialogTone = {
  red:   'bg-red-50 dark:bg-red-950/40 border-red-100 dark:border-red-800 text-red-500 dark:text-red-400',
  amber: 'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-800 text-amber-500 dark:text-amber-400',
}

function ConfirmDialog({
  titleId,
  title,
  children,
  confirmLabel,
  busyLabel,
  busy,
  error,
  onCancel,
  onConfirm,
  Icon = Trash2,
  tone = 'red',
}) {
  return (
    <Modal onClose={onCancel} labelId={titleId} maxWidth="max-w-sm">
      <div className="p-6 space-y-5">
        <div className="text-center">
          <div className={`w-14 h-14 rounded-full border flex items-center justify-center mx-auto mb-3 ${dialogTone[tone]}`}>
            <Icon size={22} aria-hidden="true" />
          </div>
          <h3 id={titleId} className="text-gray-900 dark:text-white font-semibold text-lg">
            {title}
          </h3>
          <div className="text-gray-500 dark:text-gray-400 text-sm mt-1">{children}</div>
          {error && (
            <p role="alert" className="text-red-600 dark:text-red-400 text-xs mt-3">
              {error}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            autoFocus
            onClick={onCancel}
            disabled={busy}
            className="flex-1 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl py-2 text-sm active:scale-[0.98] transition disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl py-2 text-sm active:scale-[0.98] transition disabled:opacity-40"
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ─────────── page ─────────── */

const EMPTY_FORM = { title: '', subjectId: '', dueDate: '', dueTime: '', priority: 'medium', notes: '' }

export default function Assignments() {
  const {
    assignments,
    addAssignment,
    editAssignment,
    deleteAssignment,
    toggleStatus,
    loading: assignmentsLoading,
  } = useAssignments()
  const { subjects, loading: subjectsLoading } = useSubjects()

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('all')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [error, setError] = useState('')

  const busy = saving || deleting || deletingAll
  const anyModal = showModal || !!confirmDelete || confirmDeleteAll

  // Escape closes any open modal (unless something is mid-save)
  useEffect(() => {
    const handler = e => {
      if (e.key !== 'Escape' || busy) return
      setShowModal(false)
      setConfirmDelete(null)
      setConfirmDeleteAll(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [busy])

  // Lock page scroll behind modals
  useEffect(() => {
    document.body.style.overflow = anyModal ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [anyModal])

  // Summary stats: pure counts off the full list, independent of the active filter tab
  const summary = useMemo(() => {
    let pending = 0
    let overdue = 0
    let done = 0
    assignments.forEach(a => {
      if (a.status === 'done') {
        done++
      } else {
        pending++
        if (isOverdue(a.due_date, a.status)) overdue++
      }
    })
    return { total: assignments.length, pending, overdue, done }
  }, [assignments])

  const subjectMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects])

  const filtered = assignments
    .filter(a => {
      if (filter === 'pending') return a.status !== 'done'
      if (filter === 'done') return a.status === 'done'
      return true
    })
    .sort((a, b) => parseLocalDate(a.due_date) - parseLocalDate(b.due_date))

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
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
      notes: a.notes || '',
    })
    setError('')
    setShowModal(true)
  }

  function closeForm() {
    if (!saving) setShowModal(false)
  }

  async function handleSave() {
    if (saving || !form.title.trim() || !form.dueDate) return
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

  function askDelete(a) {
    setError('')
    setConfirmDelete(a)
  }

  function askDeleteAll() {
    setError('')
    setConfirmDeleteAll(true)
  }

  if (assignmentsLoading || subjectsLoading) return <AssignmentsSkeleton />

  const allDoneNow = filter === 'pending' && summary.total > 0

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes aFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes aPop {
          from { opacity: 0; transform: translateY(14px) scale(0.96); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes aTick { from { transform: scale(0) rotate(-40deg); } to { transform: scale(1) rotate(0); } }
        @keyframes aBanner {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes aPulse {
          0%   { box-shadow: 0 0 0 0 rgba(245,158,11,0.45); }
          100% { box-shadow: 0 0 0 9px rgba(245,158,11,0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-7px); }
        }

        .a-fade   { animation: aFade 200ms ease-out backwards; }
        .a-pop    { animation: aPop 300ms cubic-bezier(0.2, 0.9, 0.3, 1.1) backwards; }
        .a-tick   { animation: aTick 240ms cubic-bezier(0.34,1.56,0.64,1) backwards; }
        .a-banner { animation: aBanner 250ms cubic-bezier(0.22,1,0.36,1) backwards; }
        .a-live   { animation: aPulse 2s ease-out infinite; }
        .a-float  { animation: float 3.2s ease-in-out infinite; }

        .a-row { transition: border-color .2s, background .2s, transform .2s cubic-bezier(.22,1,.36,1), box-shadow .2s, opacity .3s; }
        .a-row:hover { transform: translateX(3px); box-shadow: 0 4px 16px rgba(31,41,55,0.07); }
        .a-stat { transition: transform .2s cubic-bezier(.22,1,.36,1), box-shadow .2s; }
        .a-stat:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(31,41,55,0.06); }
        .a-tab:active { transform: scale(.96); }
        .a-check { transition: transform .15s, background .2s, border-color .2s; }
        .a-check:hover { transform: scale(1.1); }
        .a-check:active { transform: scale(.9); }

        @media (prefers-reduced-motion: reduce) {
          [style*="fadeUp"], .a-fade, .a-pop, .a-tick, .a-banner, .a-live, .a-float { animation: none !important; }
          .a-row, .a-stat, .a-check { transition: none !important; }
          .a-row:hover, .a-stat:hover { transform: none; }
        }
      `}</style>

      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3" style={fadeUp(0)}>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Assignments</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {summary.pending} pending · {summary.total} total
            </p>
          </div>
          <div className="flex items-center gap-2">
            {filtered.length > 0 && (
              <button
                onClick={askDeleteAll}
                className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/60 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 text-sm font-medium px-4 py-2 rounded-xl active:scale-95 transition"
              >
                Delete all
              </button>
            )}
            <button
              onClick={openAdd}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm shadow-indigo-200 dark:shadow-none hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              + Add assignment
            </button>
          </div>
        </div>

        {/* ── Summary stat cards ── */}
        {summary.total > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              Icon={ListChecks}
              label="Pending"
              value={summary.pending}
              delay={60}
              chipClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
            />
            <StatCard
              Icon={Flame}
              label="Overdue"
              value={summary.overdue}
              delay={110}
              chipClass={
                summary.overdue > 0
                  ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
              }
              valueClass={
                summary.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
              }
            />
            <StatCard
              Icon={Check}
              label="Done"
              value={summary.done}
              delay={160}
              chipClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
            />
          </div>
        )}

        {/* ── Filter tabs ── */}
        <div style={fadeUp(200)}>
          <FilterTabs
            value={filter}
            onChange={setFilter}
            counts={{ all: summary.total, pending: summary.pending, done: summary.done }}
          />
        </div>

        {/* Top-level error (e.g. from delete-all) */}
        {error && !anyModal && (
          <div
            role="alert"
            className="a-banner bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5 text-xs text-red-600 dark:text-red-400 flex items-center justify-between"
          >
            <span className="flex items-center gap-1.5">
              <AlertTriangle size={13} aria-hidden="true" /> {error}
            </span>
            <button
              onClick={() => setError('')}
              aria-label="Dismiss error"
              className="hover:text-red-700 dark:hover:text-red-300 transition"
            >
              <X size={13} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* ── Empty state ── */}
        {filtered.length === 0 && (
          <div
            className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-center"
            style={fadeUp(240)}
          >
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 a-float ${
                allDoneNow
                  ? 'bg-emerald-50 dark:bg-emerald-950/50'
                  : 'bg-indigo-50 dark:bg-indigo-950/50'
              }`}
            >
              {allDoneNow ? (
                <Check size={30} strokeWidth={2.5} className="text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
              ) : (
                <ClipboardList size={30} className="text-indigo-500 dark:text-indigo-400" aria-hidden="true" />
              )}
            </div>
            <p className="text-gray-900 dark:text-white font-semibold mb-1">
              {filter === 'done'
                ? 'Nothing marked done yet'
                : filter === 'pending'
                ? summary.total > 0
                  ? 'Nothing pending, nice!'
                  : 'No assignments yet'
                : 'No assignments here'}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">Add one using the button below.</p>
            <button
              onClick={openAdd}
              className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl shadow-sm shadow-indigo-200 dark:shadow-none hover:-translate-y-0.5 active:scale-95 transition"
            >
              + Add assignment
            </button>
          </div>
        )}

        {/* ── Assignment list ── */}
        <div className="space-y-3">
          {filtered.map((a, i) => {
            const subject = subjectMap.get(a.subject_id)
            const done = a.status === 'done'
            const overdue = isOverdue(a.due_date, a.status)
            return (
              <div
                key={a.id}
                className={`a-row bg-white dark:bg-gray-800 border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm
                  ${
                    done
                      ? 'border-gray-100 dark:border-gray-700 opacity-60'
                      : overdue
                      ? 'border-red-200 dark:border-red-800'
                      : 'border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800'
                  }`}
                style={fadeUp(260 + Math.min(i, 8) * 35)}
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <button
                    onClick={() => toggleStatus(a.id)}
                    title="Toggle done"
                    aria-pressed={done}
                    aria-label={`Mark "${a.title}" as ${done ? 'not done' : 'done'}`}
                    className={`a-check mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800
                      ${
                        done
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500'
                      }`}
                  >
                    {done && <Check size={12} strokeWidth={3} className="a-tick text-white" aria-hidden="true" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium break-words transition-colors duration-300 ${
                        done ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {a.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {subject && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${subject.color.light} ${subject.color.border} ${subject.color.text}`}
                        >
                          <CircleDot size={9} aria-hidden="true" />
                          {subject.name}
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border capitalize flex items-center gap-1.5 ${priorityStyles[a.priority]}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${priorityDot[a.priority]}`} />
                        {a.priority}
                      </span>
                      {overdue && !done && (
                        <span className="text-xs px-2 py-0.5 rounded-full border bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertTriangle size={10} aria-hidden="true" /> Overdue
                        </span>
                      )}
                    </div>
                    {a.notes && (
                      <p className="text-gray-400 dark:text-gray-500 text-xs mt-1.5 break-words">{a.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 pl-10 sm:pl-0">
                  <DeadlineBlock assignment={a} />
                  <div className="flex sm:flex-col gap-1">
                    <button
                      onClick={() => openEdit(a)}
                      title="Edit"
                      aria-label={`Edit "${a.title}"`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 active:scale-90 transition"
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => askDelete(a)}
                      title="Delete"
                      aria-label={`Delete "${a.title}"`}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 active:scale-90 transition"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Add / Edit modal ── */}
        {showModal && (
          <Modal onClose={closeForm} labelId="assignment-modal-title">
            <div className="px-6 pt-6 pb-3 flex items-center justify-between">
              <h3 id="assignment-modal-title" className="text-gray-900 dark:text-white font-semibold text-lg">
                {editing ? 'Edit assignment' : 'Add assignment'}
              </h3>
              <button
                onClick={closeForm}
                aria-label="Close"
                className="w-8 h-8 -mr-2 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>

            <div className="px-6 pb-4 space-y-4 overflow-y-auto">
              <div>
                <label htmlFor="a-title" className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Title
                </label>
                <input
                  id="a-title"
                  autoFocus
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="e.g. Chapter 5 Report"
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="a-subject" className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Subject
                </label>
                <select
                  id="a-subject"
                  value={form.subjectId}
                  onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">No subject</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="a-date" className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Due date
                    </label>
                    <input
                      id="a-date"
                      type="date"
                      value={form.dueDate}
                      onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="a-time" className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Due time (optional)
                    </label>
                    <input
                      id="a-time"
                      type="time"
                      value={form.dueTime}
                      onChange={e => setForm(f => ({ ...f, dueTime: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Quick date picks */}
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    ['Today', 0],
                    ['Tomorrow', 1],
                    ['In a week', 7],
                  ].map(([label, n]) => {
                    const value = inDays(n)
                    const on = form.dueDate === value
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, dueDate: value }))}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border active:scale-95 transition
                          ${
                            on
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400'
                          }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <span className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Priority</span>
                <div className="flex gap-2">
                  {PRIORITIES.map(p => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={form.priority === p}
                      onClick={() => setForm(f => ({ ...f, priority: p }))}
                      className={`flex-1 text-sm font-medium capitalize px-3 py-2 rounded-xl border active:scale-95 transition flex items-center justify-center gap-1.5
                        ${
                          form.priority === p
                            ? `${priorityStyles[p]} ring-2 ring-offset-1 ring-offset-white dark:ring-offset-gray-800 ${priorityRing[p]}`
                            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${priorityDot[p]}`} />
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="a-notes" className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  id="a-notes"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any extra details..."
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </div>

              {error && (
                <p role="alert" className="text-red-600 dark:text-red-400 text-xs">
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
              <button
                onClick={closeForm}
                disabled={saving}
                className="flex-1 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl py-2 text-sm active:scale-[0.98] transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.title.trim() || !form.dueDate || saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2 text-sm active:scale-[0.98] transition shadow-sm shadow-indigo-200 dark:shadow-none"
              >
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add assignment'}
              </button>
            </div>
          </Modal>
        )}

        {/* ── Confirm delete (single) ── */}
        {confirmDelete && (
          <ConfirmDialog
            titleId="delete-assignment-title"
            title="Delete assignment?"
            confirmLabel="Yes, delete"
            busyLabel="Deleting…"
            busy={deleting}
            error={error}
            onCancel={() => !deleting && setConfirmDelete(null)}
            onConfirm={handleDelete}
          >
            Are you sure you want to delete{' '}
            <span className="text-gray-900 dark:text-white font-medium">"{confirmDelete.title}"</span>? This
            cannot be undone.
          </ConfirmDialog>
        )}

        {/* ── Confirm delete all ── */}
        {confirmDeleteAll && (
          <ConfirmDialog
            titleId="delete-all-assignments-title"
            title={`Delete ${filtered.length} assignment${filtered.length !== 1 ? 's' : ''}?`}
            confirmLabel="Yes, delete all"
            busyLabel="Deleting…"
            busy={deletingAll}
            error={error}
            Icon={AlertTriangle}
            tone="amber"
            onCancel={() => !deletingAll && setConfirmDeleteAll(false)}
            onConfirm={handleDeleteAll}
          >
            This will permanently delete{' '}
            <span className="text-gray-900 dark:text-white font-medium">
              {filter === 'all' ? 'all' : `all ${filter}`} assignment{filtered.length !== 1 ? 's' : ''}
            </span>{' '}
            currently shown. This cannot be undone.
          </ConfirmDialog>
        )}
      </div>
    </>
  )
}