import { useState, useRef, useEffect, useMemo } from 'react'
import { useSubjects } from '../hooks/useSubjects'
import { useAssignments } from '../hooks/useAssignments'
import { useReminders } from '../hooks/useReminders'
import { useNotes } from '../hooks/useNotes'
import { SubjectsSkeleton } from '../components/Skeleton'
import {
  BookOpen,
  Trash2,
  Check,
  AlertTriangle,
  User,
  MapPin,
  Clock,
  GraduationCap,
  Plus,
  X,
  Bell,
  StickyNote,
  Layers,
  Pencil,
  ClipboardList,
} from 'lucide-react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DUP_ERROR = 'A subject with this name already exists.'
const EMPTY_STATS = { total: 0, pending: 0, reminders: 0, pendingReminders: 0, notes: 0 }

/*
  Entrance animation helper.
  NOTE: uses "backwards" instead of "both" on purpose. With "both" the final
  keyframe (transform: translateY(0)) sticks forever and overrides the
  :hover lift on cards. "backwards" only applies during the delay.
*/
const fadeUp = (delay = 0) => ({
  animation: `fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms backwards`,
})

const inputCls =
  'w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition'
const blockInputCls = inputCls.replace('bg-gray-50', 'bg-white')

const newKey = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`

// One schedule "block" = a set of days that share the same time + room
// e.g. a subject can have one block for Mon/Wed lecture in Rm 302
// and another block for Fri lab in the Chem Lab.
function emptyScheduleBlock() {
  return { _key: newKey(), days: [], startTime: '', endTime: '', room: '' }
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
      _key: newKey(),
      days: block.days || [],
      startTime: block.startTime || '',
      endTime: block.endTime || '',
      room: block.room || '',
    }))
  }
  // Legacy shape fallback
  if (subject.days?.length || subject.startTime || subject.room) {
    return [
      {
        _key: newKey(),
        days: subject.days || [],
        startTime: subject.startTime || '',
        endTime: subject.endTime || '',
        room: subject.room || '',
      },
    ]
  }
  return [emptyScheduleBlock()]
}

function formatScheduleBlock(block) {
  const days = block.days?.length ? block.days.join('/') : ''
  const time = block.startTime && block.endTime ? `${block.startTime}–${block.endTime}` : ''
  const dayTime = [days, time].filter(Boolean).join(' · ')
  if (!dayTime && !block.room) return ''
  return [dayTime, block.room].filter(Boolean).join(block.room && dayTime ? ' @ ' : '')
}

// Monday-first abbreviation for today, matching DAYS
const todayAbbr = () => DAYS[(new Date().getDay() + 6) % 7]

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

  return Number.isInteger(target) ? Math.round(value) : Math.round(value * 10) / 10
}

function StatCard({ Icon, label, value, chipClass, delay }) {
  const shown = useCountUp(value)
  return (
    <div
      className="s-stat bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm"
      style={fadeUp(delay)}
    >
      <div className="flex flex-col items-start gap-2.5 sm:flex-row sm:items-center sm:gap-3">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${chipClass}`}>
          <Icon size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="text-2xl font-bold leading-none tabular-nums text-gray-900 dark:text-white">{shown}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{label}</div>
        </div>
      </div>
    </div>
  )
}

// Progress bar that grows in from the left on mount and eases on updates
function Meter({ percent, barClass }) {
  return (
    <div className="h-1.5 bg-white/70 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`s-bar h-full rounded-full ${barClass}`}
        style={{ width: `${percent}%`, transition: 'width 500ms ease' }}
      />
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
      className="s-fade fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <div
        className={`s-pop w-full ${maxWidth} max-h-[90vh] flex flex-col bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden`}
      >
        {children}
      </div>
    </div>
  )
}

function ConfirmDialog({ titleId, title, children, confirmLabel, busyLabel, saving, error, onCancel, onConfirm }) {
  return (
    <Modal onClose={onCancel} labelId={titleId} maxWidth="max-w-sm">
      <div className="p-6 space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-800 flex items-center justify-center mx-auto mb-3">
            <Trash2 size={22} className="text-red-500 dark:text-red-400" aria-hidden="true" />
          </div>
          <h3 id={titleId} className="text-gray-900 dark:text-white font-semibold text-lg">
            {title}
          </h3>
          <div className="text-gray-500 dark:text-gray-400 text-sm mt-1">{children}</div>
          {error && (
            <p role="alert" className="mt-3 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            autoFocus
            onClick={onCancel}
            disabled={saving}
            className="flex-1 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg py-2 text-sm active:scale-[0.98] transition disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg py-2 text-sm active:scale-[0.98] transition disabled:opacity-40"
          >
            {saving ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ─────────── page ─────────── */

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

  const anyModal = showModal || !!confirmDelete || confirmDeleteAll

  // Focus the name input when the form opens
  useEffect(() => {
    if (!showModal) return
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [showModal])

  // Escape closes whatever is open (unless it's mid-save)
  useEffect(() => {
    const handler = e => {
      if (e.key !== 'Escape' || saving) return
      setShowModal(false)
      setConfirmDelete(null)
      setConfirmDeleteAll(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saving])

  // Lock page scroll behind modals
  useEffect(() => {
    document.body.style.overflow = anyModal ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [anyModal])

  // Per-subject counts, computed once instead of filtering on every card
  const byId = useMemo(() => {
    const map = {}
    const get = id => (map[id] = map[id] || { ...EMPTY_STATS })
    assignments.forEach(a => {
      if (a.subject_id == null) return
      const s = get(a.subject_id)
      s.total++
      if (a.status !== 'done') s.pending++
    })
    reminders.forEach(r => {
      if (r.subject_id == null) return
      const s = get(r.subject_id)
      s.reminders++
      if (!r.is_done) s.pendingReminders++
    })
    notes.forEach(n => {
      if (n.subject_id == null) return
      get(n.subject_id).notes++
    })
    return map
  }, [assignments, reminders, notes])

  const statsFor = id => byId[id] || EMPTY_STATS

  const summary = useMemo(() => {
    const totalUnits = subjects.reduce((sum, s) => sum + (Number(s.units) || 0), 0)
    const pendingWork = subjects.reduce((sum, s) => sum + (byId[s.id]?.pending || 0), 0)
    const linkedAssignments = subjects.reduce((sum, s) => sum + (byId[s.id]?.total || 0), 0)
    return { count: subjects.length, totalUnits, pendingWork, linkedAssignments }
  }, [subjects, byId])

  function openAdd() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, schedules: [emptyScheduleBlock()] })
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

  function closeForm() {
    if (!saving) setShowModal(false)
  }

  function toggleDay(blockIndex, day) {
    setForm(f => ({
      ...f,
      schedules: f.schedules.map((block, i) =>
        i !== blockIndex
          ? block
          : {
              ...block,
              days: block.days.includes(day) ? block.days.filter(d => d !== day) : [...block.days, day],
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
    if (saving) return
    const trimmed = form.name.trim()
    if (!trimmed) return

    // Duplicate name check
    const isDuplicate = subjects.some(
      s => s.name.toLowerCase() === trimmed.toLowerCase() && s.id !== editing?.id
    )
    if (isDuplicate) {
      setError(DUP_ERROR)
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
    setError('')
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
    setError('')
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

  function askDelete(subject) {
    setError('')
    setConfirmDelete(subject)
  }

  function askDeleteAll() {
    setError('')
    setConfirmDeleteAll(true)
  }

  if (loading) return <SubjectsSkeleton />

  const today = todayAbbr()

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sPop {
          from { opacity: 0; transform: translateY(14px) scale(0.96); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes sBar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes sBlockIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes sCheck { from { transform: scale(0) rotate(-40deg); } to { transform: scale(1) rotate(0); } }
        @keyframes sPulse {
          0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.55); }
          100% { box-shadow: 0 0 0 7px rgba(16,185,129,0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-7px); }
        }

        .s-fade     { animation: sFade 200ms ease-out backwards; }
        .s-pop      { animation: sPop 300ms cubic-bezier(0.2, 0.9, 0.3, 1.1) backwards; }
        .s-bar      { transform-origin: left; animation: sBar 0.9s cubic-bezier(0.22,1,0.36,1) 0.3s backwards; }
        .s-block-in { animation: sBlockIn 260ms cubic-bezier(0.22,1,0.36,1) backwards; }
        .s-check    { animation: sCheck 220ms cubic-bezier(0.34,1.56,0.64,1) backwards; }
        .s-float    { animation: float 3.2s ease-in-out infinite; }
        .s-live     { animation: sPulse 1.8s ease-out infinite; }

        .s-card { transition: transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s ease; }
        .s-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(31,41,55,0.10); }
        .s-stat { transition: transform .2s cubic-bezier(.22,1,.36,1), box-shadow .2s ease; }
        .s-stat:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(31,41,55,0.06); }
        .s-day-btn { transition: transform .12s, background .15s, border-color .15s, color .15s; }
        .s-day-btn:active { transform: scale(.92); }
        .s-color-swatch { transition: transform .15s, box-shadow .15s; }
        .s-color-swatch:hover { transform: scale(1.12); }

        @media (prefers-reduced-motion: reduce) {
          [style*="fadeUp"], .s-fade, .s-pop, .s-bar, .s-block-in, .s-check, .s-float, .s-live {
            animation: none !important;
          }
          .s-card, .s-stat, .s-day-btn, .s-color-swatch { transition: none !important; }
          .s-card:hover, .s-stat:hover { transform: none; }
        }
      `}</style>

      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3" style={fadeUp(0)}>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Subjects</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {subjects.length > 0 && (
              <button
                onClick={askDeleteAll}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800 px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 active:scale-95 transition"
              >
                Delete all
              </button>
            )}
            <button
              onClick={openAdd}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition shadow-sm shadow-indigo-200 dark:shadow-none hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
            >
              + Add subject
            </button>
          </div>
        </div>

        {/* ── Summary stat cards ── */}
        {subjects.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              Icon={Layers}
              label="Subjects"
              value={summary.count}
              delay={60}
              chipClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
            />
            <StatCard
              Icon={GraduationCap}
              label="Total units"
              value={summary.totalUnits}
              delay={110}
              chipClass="bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400"
            />
            <StatCard
              Icon={ClipboardList}
              label="Pending work"
              value={summary.pendingWork}
              delay={160}
              chipClass={
                summary.pendingWork > 0
                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
              }
            />
          </div>
        )}

        {/* ── Empty state ── */}
        {subjects.length === 0 && (
          <div
            className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-center"
            style={fadeUp(60)}
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center mx-auto mb-4 s-float">
              <BookOpen size={30} className="text-indigo-500 dark:text-indigo-400" aria-hidden="true" />
            </div>
            <p className="text-gray-900 dark:text-white font-semibold mb-1">No subjects yet</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">
              Add your first subject to start tracking classes, work and notes.
            </p>
            <button
              onClick={openAdd}
              className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg shadow-sm shadow-indigo-200 dark:shadow-none hover:-translate-y-0.5 active:scale-95 transition"
            >
              + Add subject
            </button>
          </div>
        )}

        {/* ── Subject cards ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject, i) => {
            const st = statsFor(subject.id)
            const done = st.total - st.pending
            const progress = st.total > 0 ? Math.round((done / st.total) * 100) : 0
            const doneReminders = st.reminders - st.pendingReminders
            const reminderProgress = st.reminders > 0 ? Math.round((doneReminders / st.reminders) * 100) : 0

            const allBlocks = normalizeSchedules(subject)
            const scheduleBlocks = allBlocks.filter(b => b.days.length || b.startTime || b.room)
            const meetsToday = allBlocks.some(b => b.days.includes(today))

            return (
              <div
                key={subject.id}
                className={`s-card relative overflow-hidden rounded-2xl p-5 pt-6 border ${subject.color.light} ${subject.color.border} dark:bg-gray-800 dark:border-gray-700 flex flex-col gap-4 shadow-sm`}
                style={fadeUp(220 + Math.min(i, 8) * 45)}
              >
                {/* color accent */}
                <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${subject.color.bg}`} />

                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${subject.color.bg}`} />
                    <h3 className="text-gray-900 dark:text-white font-semibold text-lg leading-tight break-words">
                      {subject.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {meetsToday && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-full px-2 py-0.5">
                        <span className="s-live w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                        Today
                      </span>
                    )}
                    {subject.units != null && subject.units !== '' && (
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-full px-2 py-0.5">
                        {subject.units} unit{Number(subject.units) !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Professor + schedule blocks */}
                {(subject.professor || scheduleBlocks.length > 0) && (
                  <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {subject.professor && (
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="flex-shrink-0" aria-hidden="true" />
                        <span className="truncate">{subject.professor}</span>
                      </div>
                    )}
                    {scheduleBlocks.map((block, bi) => {
                      const label = formatScheduleBlock(block)
                      if (!label) return null
                      const isToday = block.days.includes(today)
                      return (
                        <div
                          key={bi}
                          className={`flex items-center gap-1.5 ${
                            isToday ? 'font-medium text-gray-700 dark:text-gray-200' : ''
                          }`}
                        >
                          <Clock size={12} className="flex-shrink-0" aria-hidden="true" />
                          <span className="truncate">{label}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Assignments */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">
                      {st.total} assignment{st.total !== 1 ? 's' : ''}
                      {st.total > 0 && <span className="tabular-nums"> · {progress}%</span>}
                    </span>
                    {st.pending > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">{st.pending} pending</span>
                    )}
                    {st.total > 0 && st.pending === 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                        <Check size={12} aria-hidden="true" /> All done
                      </span>
                    )}
                  </div>
                  {st.total > 0 && <Meter percent={progress} barClass={subject.color.bg} />}
                </div>

                {/* Reminders */}
                {st.reminders > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <Bell size={12} aria-hidden="true" /> {st.reminders} reminder{st.reminders !== 1 ? 's' : ''}
                        <span className="tabular-nums"> · {reminderProgress}%</span>
                      </span>
                      {st.pendingReminders > 0 ? (
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          {st.pendingReminders} upcoming
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                          <Check size={12} aria-hidden="true" /> All cleared
                        </span>
                      )}
                    </div>
                    <Meter percent={reminderProgress} barClass="bg-blue-500" />
                  </div>
                )}

                {/* Notes (no bar, notes have no done state) */}
                {st.notes > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <StickyNote size={12} className="flex-shrink-0" aria-hidden="true" />
                    <span>
                      {st.notes} note{st.notes !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-auto pt-1">
                  <button
                    onClick={() => openEdit(subject)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm bg-white/70 dark:bg-gray-900 hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200/70 dark:border-gray-700 rounded-lg py-1.5 active:scale-[0.97] transition"
                  >
                    <Pencil size={13} aria-hidden="true" /> Edit
                  </button>
                  <button
                    onClick={() => askDelete(subject)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm bg-white/70 dark:bg-gray-900 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 border border-gray-200/70 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800 rounded-lg py-1.5 active:scale-[0.97] transition"
                  >
                    <Trash2 size={13} aria-hidden="true" /> Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Add / Edit modal ── */}
        {showModal && (
          <Modal onClose={closeForm} labelId="subject-modal-title">
            <div className="px-6 pt-6 pb-3 flex items-center justify-between">
              <h3 id="subject-modal-title" className="text-gray-900 dark:text-white font-semibold text-lg">
                {editing ? 'Edit subject' : 'Add subject'}
              </h3>
              <button
                onClick={closeForm}
                aria-label="Close"
                className="w-8 h-8 -mr-2 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>

            <div className="px-6 pb-4 space-y-5 overflow-y-auto">
              <div>
                <label htmlFor="subject-name" className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Subject name
                </label>
                <input
                  id="subject-name"
                  ref={inputRef}
                  value={form.name}
                  onChange={e => {
                    setForm(f => ({ ...f, name: e.target.value }))
                    setError('')
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="e.g. Mathematics"
                  className={`w-full bg-gray-50 dark:bg-gray-900 border rounded-lg px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 transition
                    ${
                      error === DUP_ERROR
                        ? 'border-red-300 dark:border-red-800 focus:border-red-400 focus:ring-red-100 dark:focus:ring-red-950/40'
                        : 'border-gray-200 dark:border-gray-700 focus:border-indigo-400 focus:ring-indigo-100 dark:focus:ring-indigo-950/40'
                    }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="subject-prof" className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                    <User size={13} aria-hidden="true" /> Professor
                  </label>
                  <input
                    id="subject-prof"
                    value={form.professor}
                    onChange={e => setForm(f => ({ ...f, professor: e.target.value }))}
                    placeholder="e.g. Dr. Santos"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="subject-units" className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                    <GraduationCap size={13} aria-hidden="true" /> Units
                  </label>
                  <input
                    id="subject-units"
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.units}
                    onChange={e => setForm(f => ({ ...f, units: e.target.value }))}
                    placeholder="e.g. 3"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Schedule blocks: each is its own days + time + room combo,
                  so a subject that meets in different rooms/times on different
                  days can have more than one of these. */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Clock size={13} aria-hidden="true" /> Schedule
                  </span>
                  <button
                    type="button"
                    onClick={addBlock}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 active:scale-95 transition"
                  >
                    <Plus size={13} aria-hidden="true" /> Add another
                  </button>
                </div>

                {form.schedules.map((block, blockIndex) => (
                  <div
                    key={block._key}
                    className="s-block-in bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex gap-1.5 flex-wrap">
                        {DAYS.map(day => {
                          const on = block.days.includes(day)
                          return (
                            <button
                              key={day}
                              type="button"
                              aria-pressed={on}
                              onClick={() => toggleDay(blockIndex, day)}
                              className={`s-day-btn text-xs font-medium px-2.5 py-1.5 rounded-lg border
                                ${
                                  on
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none'
                                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700'
                                }`}
                            >
                              {day}
                            </button>
                          )
                        })}
                      </div>
                      {form.schedules.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBlock(blockIndex)}
                          className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex-shrink-0 p-1 active:scale-90 transition"
                          title="Remove this schedule"
                          aria-label="Remove this schedule"
                        >
                          <X size={15} aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        aria-label="Start time"
                        value={block.startTime}
                        onChange={e => updateBlock(blockIndex, { startTime: e.target.value })}
                        className={`flex-1 ${blockInputCls}`}
                      />
                      <span className="text-gray-400 dark:text-gray-500 text-sm">to</span>
                      <input
                        type="time"
                        aria-label="End time"
                        value={block.endTime}
                        onChange={e => updateBlock(blockIndex, { endTime: e.target.value })}
                        className={`flex-1 ${blockInputCls}`}
                      />
                    </div>

                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
                        <MapPin size={12} aria-hidden="true" /> Classroom / room no.
                      </span>
                      <input
                        aria-label="Classroom or room number"
                        value={block.room}
                        onChange={e => updateBlock(blockIndex, { room: e.target.value })}
                        placeholder="e.g. Rm 302, Bldg C"
                        className={blockInputCls}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <span className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Color</span>
                <div className="flex gap-2.5 flex-wrap">
                  {COLORS.map(color => {
                    const selected = form.color === color.name
                    return (
                      <button
                        key={color.name}
                        type="button"
                        aria-label={color.name}
                        aria-pressed={selected}
                        onClick={() => setForm(f => ({ ...f, color: color.name }))}
                        title={color.name}
                        className={`s-color-swatch w-8 h-8 rounded-full ${color.bg} flex items-center justify-center ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800
                          ${
                            selected
                              ? 'ring-gray-900/70 dark:ring-white/80 scale-110'
                              : 'ring-transparent hover:ring-gray-300 dark:hover:ring-gray-600'
                          }`}
                      >
                        {selected && <Check size={14} strokeWidth={3} className="s-check text-white" aria-hidden="true" />}
                      </button>
                    )
                  })}
                </div>
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
                className="flex-1 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg py-2 text-sm active:scale-[0.98] transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2 text-sm active:scale-[0.98] transition shadow-sm shadow-indigo-200 dark:shadow-none"
              >
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add subject'}
              </button>
            </div>
          </Modal>
        )}

        {/* ── Confirm delete ── */}
        {confirmDelete && (
          <ConfirmDialog
            titleId="delete-subject-title"
            title="Delete subject?"
            confirmLabel="Yes, delete"
            busyLabel="Deleting…"
            saving={saving}
            error={error}
            onCancel={() => !saving && setConfirmDelete(null)}
            onConfirm={handleDelete}
          >
            <p>
              Are you sure you want to delete{' '}
              <span className="text-gray-900 dark:text-white font-medium">"{confirmDelete.name}"</span>?
            </p>
            {statsFor(confirmDelete.id).total > 0 && (
              <p className="flex items-center justify-center gap-1.5 mt-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle size={13} aria-hidden="true" />
                This subject has {statsFor(confirmDelete.id).total} assignment
                {statsFor(confirmDelete.id).total !== 1 ? 's' : ''} linked to it.
              </p>
            )}
          </ConfirmDialog>
        )}

        {/* ── Confirm delete all ── */}
        {confirmDeleteAll && (
          <ConfirmDialog
            titleId="delete-all-title"
            title="Delete all subjects?"
            confirmLabel="Yes, delete all"
            busyLabel="Deleting…"
            saving={saving}
            error={error}
            onCancel={() => !saving && setConfirmDeleteAll(false)}
            onConfirm={handleDeleteAll}
          >
            <p>
              This will permanently delete all{' '}
              <span className="text-gray-900 dark:text-white font-medium">{subjects.length}</span> subject
              {subjects.length !== 1 ? 's' : ''}.
            </p>
            {summary.linkedAssignments > 0 && (
              <p className="flex items-center justify-center gap-1.5 mt-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle size={13} aria-hidden="true" />
                {summary.linkedAssignments} assignment{summary.linkedAssignments !== 1 ? 's' : ''} linked to these
                will be affected too.
              </p>
            )}
          </ConfirmDialog>
        )}
      </div>
    </>
  )
}