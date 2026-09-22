import { useState, useEffect, useRef, useCallback } from 'react'
import { useGrades } from '../hooks/useGrades'
import { useSubjects } from '../hooks/useSubjects'
import { GradesSkeleton } from '../components/Skeleton'
import { BarChart3, Trash2 } from 'lucide-react'

const TYPES = ['quiz', 'exam', 'project', 'homework', 'lab', 'other']

const EMPTY_FORM = { title: '', subjectId: '', score: '', maxScore: '100', type: 'quiz' }

// Extra credit: scores above the max are allowed. Flip this to false to go
// back to a hard reject — the >100% display handling below covers both cases.
const ALLOW_EXTRA_CREDIT = true

function scoreColor(pct) {
  if (pct >= 90) return 'text-emerald-600 dark:text-emerald-400'
  if (pct >= 75) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function scoreBorder(pct) {
  if (pct >= 90) return 'border-emerald-400 dark:border-emerald-600'
  if (pct >= 75) return 'border-amber-400 dark:border-amber-600'
  return 'border-red-400 dark:border-red-600'
}

// Whole-number display for the small badge circle so 3-digit / decimal
// percentages (e.g. "100.0%") never overflow it. The exact score/maxScore
// is still shown as text next to the title.
function formatBadgePct(pct) {
  return `${Math.round(pct)}%`
}

// Averages come back as strings (or null). "0.0" is a real value, so test for
// presence rather than truthiness — otherwise a genuine 0% renders as "—".
function hasValue(v) {
  return v !== null && v !== undefined && v !== ''
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Escape to close, focus trapped inside, background scroll locked, focus
// restored to whatever opened the modal. `busy` blocks closing mid-request.
function useModalA11y(active, onClose, busy) {
  const ref = useRef(null)

  useEffect(() => {
    if (!active) return

    const node = ref.current
    const previouslyFocused = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handler = (e) => {
      if (e.key === 'Escape') {
        if (busy) return
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !node) return

      const focusables = Array.from(node.querySelectorAll(FOCUSABLE))
      if (focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handler, true)
    return () => {
      document.removeEventListener('keydown', handler, true)
      document.body.style.overflow = previousOverflow
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }, [active, onClose, busy])

  return ref
}

export default function Grades() {
  const {
    grades, addGrade, editGrade, deleteGrade,
    getSubjectAverage, getOverallAverage, getLetterGrade,
    loading: gradesLoading,
  } = useGrades()
  const { subjects, loading: subjectsLoading } = useSubjects()

  const [showModal, setShowModal]             = useState(false)
  const [editing, setEditing]                 = useState(null)
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [form, setForm]                       = useState(EMPTY_FORM)
  const [saving, setSaving]                   = useState(false)
  const [confirmDelete, setConfirmDelete]     = useState(null)
  const [deleting, setDeleting]               = useState(false)
  const [error, setError]                     = useState('')

  const closeForm    = useCallback(() => setShowModal(false), [])
  const closeConfirm = useCallback(() => setConfirmDelete(null), [])

  const formRef    = useModalA11y(showModal, closeForm, saving)
  const confirmRef = useModalA11y(Boolean(confirmDelete), closeConfirm, deleting)

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowModal(true)
  }

  function openEdit(g) {
    setEditing(g)
    setForm({
      title:     g.title,
      subjectId: g.subject_id || '',
      score:     String(g.score),
      maxScore:  String(g.max_score),
      type:      g.type,
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    const title    = form.title.trim()
    const score    = parseFloat(form.score)
    const maxScore = parseFloat(form.maxScore)

    if (!title || form.score === '') return

    // A number input can hold partial values like "-" or "1e", which parse to
    // NaN and slip past the range checks below — catch them first.
    if (Number.isNaN(score)) {
      setError('Score must be a number.')
      return
    }
    if (Number.isNaN(maxScore) || maxScore <= 0) {
      setError('"Out of" must be greater than 0.')
      return
    }
    if (score < 0) {
      setError('Score cannot be negative.')
      return
    }
    if (!ALLOW_EXTRA_CREDIT && score > maxScore) {
      setError(`Score (${score}) cannot be greater than max score (${maxScore}).`)
      return
    }

    setSaving(true)
    setError('')
    try {
      const data = { ...form, score, maxScore }
      if (editing) {
        await editGrade(editing.id, data)
      } else {
        await addGrade(data)
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
      await deleteGrade(confirmDelete.id)
      setConfirmDelete(null)
    } catch (err) {
      setError(err.message || 'Failed to delete grade. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  // Enter saves from any field in the form, not just the title.
  function handleFormKeyDown(e) {
    if (e.key !== 'Enter') return
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') return
    e.preventDefault()
    if (!form.title.trim() || form.score === '' || saving) return
    handleSave()
  }

  const overall = getOverallAverage()

  const filtered = grades
    .filter(g => selectedSubject === 'all' || g.subject_id === selectedSubject)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  if (gradesLoading || subjectsLoading) return <GradesSkeleton />

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Grades</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {grades.length} record{grades.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition shadow-sm shadow-indigo-200 dark:shadow-none"
        >
          + Log Grade
        </button>
      </div>

      {/* Overall + per-subject average cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Overall Average</p>
          <p className={`text-4xl font-bold mt-1 ${hasValue(overall) ? scoreColor(parseFloat(overall)) : 'text-gray-300 dark:text-gray-600'}`}>
            {hasValue(overall) ? `${overall}%` : '—'}
          </p>
          {hasValue(overall) && (
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{getLetterGrade(parseFloat(overall))}</p>
          )}
        </div>

        {subjects.map(s => {
          const avg = getSubjectAverage(s.id)
          return (
            <div key={s.id} className={`rounded-xl p-5 border dark:bg-gray-800 shadow-sm ${s.color.light} ${s.color.border}`}>
              <p className={`text-sm ${s.color.text} truncate`}>{s.name}</p>
              <p className={`text-3xl font-bold mt-1 ${hasValue(avg) ? scoreColor(parseFloat(avg)) : 'text-gray-300 dark:text-gray-600'}`}>
                {hasValue(avg) ? `${avg}%` : '—'}
              </p>
              {hasValue(avg) && (
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{getLetterGrade(parseFloat(avg))}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Filter by subject */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedSubject('all')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition
            ${selectedSubject === 'all' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
        >
          All
        </button>
        {subjects.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedSubject(s.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition
              ${selectedSubject === s.id ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-12 text-center shadow-sm">
          <BarChart3 size={36} className="mx-auto mb-3 text-indigo-500 dark:text-indigo-400" />
          <p className="text-gray-900 dark:text-white font-medium mb-1">No grades logged yet</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Start tracking your scores.</p>
        </div>
      )}

      {/* Grades list */}
      <div className="space-y-3">
        {filtered.map(g => {
          const subject = subjects.find(s => s.id === g.subject_id)
          const pct = g.max_score > 0 ? ((g.score / g.max_score) * 100).toFixed(1) : '0.0'
          const pctFloat = parseFloat(pct)
          return (
            <div key={g.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center flex-shrink-0 border-2 ${scoreBorder(pctFloat)}`}>
                <span className={`font-bold ${scoreColor(pctFloat)} ${pctFloat >= 100 ? 'text-xs' : 'text-sm'}`}>
                  {formatBadgePct(pctFloat)}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-gray-900 dark:text-white font-medium">{g.title}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {subject && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${subject.color.light} ${subject.color.border} ${subject.color.text}`}>
                      {subject.name}
                    </span>
                  )}
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full capitalize">
                    {g.type}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{g.score} / {g.max_score}</span>
                  {g.score > g.max_score && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">Extra credit</span>
                  )}
                </div>
              </div>

              <div className={`text-xl font-bold flex-shrink-0 ${scoreColor(pctFloat)}`}>
                {getLetterGrade(pctFloat)}
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(g)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white text-xs transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => { setError(''); setConfirmDelete(g) }}
                  className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 text-xs transition"
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
          onClick={(e) => {
            if (saving) return
            if (e.target === e.currentTarget) setShowModal(false)
          }}
        >
          <div
            ref={formRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="grade-modal-title"
            onKeyDown={handleFormKeyDown}
            className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl"
          >
            <h3 id="grade-modal-title" className="text-gray-900 dark:text-white font-semibold text-lg">
              {editing ? 'Edit Grade' : 'Log Grade'}
            </h3>

            <div>
              <label htmlFor="grade-title" className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Title</label>
              <input
                id="grade-title"
                autoFocus
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Midterm Exam"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 transition"
              />
            </div>

            <div>
              <label htmlFor="grade-subject" className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Subject</label>
              <select
                id="grade-subject"
                value={form.subjectId}
                onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 transition"
              >
                <option value="">No subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="grade-score" className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Score</label>
                <input
                  id="grade-score"
                  type="number"
                  min="0"
                  step="any"
                  value={form.score}
                  onChange={e => { setForm(f => ({ ...f, score: e.target.value })); setError('') }}
                  placeholder="85"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 transition"
                />
              </div>
              <div>
                <label htmlFor="grade-max" className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Out of</label>
                <input
                  id="grade-max"
                  type="number"
                  min="1"
                  step="any"
                  value={form.maxScore}
                  onChange={e => { setForm(f => ({ ...f, maxScore: e.target.value })); setError('') }}
                  placeholder="100"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 transition"
                />
              </div>
              <div>
                <label htmlFor="grade-type" className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Type</label>
                <select
                  id="grade-type"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 transition capitalize"
                >
                  {TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
            </div>

            {/* Inline score preview so the result is visible before saving */}
            {form.score !== '' && !Number.isNaN(parseFloat(form.score)) && parseFloat(form.maxScore) > 0 && (
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg px-4 py-2">
                <span className="text-gray-500 dark:text-gray-400 text-xs">Preview:</span>
                {(() => {
                  const pct = Math.min((parseFloat(form.score) / parseFloat(form.maxScore)) * 100, 999).toFixed(1)
                  return (
                    <>
                      <span className={`text-sm font-bold ${scoreColor(parseFloat(pct))}`}>{pct}%</span>
                      <span className={`text-sm font-bold ${scoreColor(parseFloat(pct))}`}>
                        · {getLetterGrade(parseFloat(pct))}
                      </span>
                    </>
                  )
                })()}
              </div>
            )}

            {error && <p role="alert" className="text-red-600 dark:text-red-400 text-xs">{error}</p>}

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
                disabled={!form.title.trim() || form.score === '' || saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2 text-sm transition shadow-sm shadow-indigo-200 dark:shadow-none"
              >
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Log Grade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (deleting) return
            if (e.target === e.currentTarget) setConfirmDelete(null)
          }}
        >
          <div
            ref={confirmRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl"
          >
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-800 flex items-center justify-center mx-auto mb-3">
                <Trash2 size={22} className="text-red-500 dark:text-red-400" />
              </div>
              <h3 id="delete-modal-title" className="text-gray-900 dark:text-white font-semibold text-lg">Delete Grade?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Are you sure you want to delete{' '}
                <span className="text-gray-900 dark:text-white font-medium">"{confirmDelete.title}"</span>? This cannot be undone.
              </p>
              {error && <p role="alert" className="text-red-600 dark:text-red-400 text-xs mt-2">{error}</p>}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg py-2 text-sm transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                autoFocus
                onClick={handleDelete}
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