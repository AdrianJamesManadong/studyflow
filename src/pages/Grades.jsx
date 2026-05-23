import { useState } from 'react'
import { useGrades } from '../hooks/useGrades'
import { useSubjects } from '../hooks/useSubjects'
import { GradesSkeleton } from '../components/Skeleton'

export default function Grades() {
  const { grades, addGrade, editGrade, deleteGrade, getSubjectAverage, getOverallAverage, getLetterGrade } = useGrades()
  const { subjects } = useSubjects()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [form, setForm] = useState({ title: '', subjectId: '', score: '', maxScore: '100', type: 'quiz' })

  const TYPES = ['quiz', 'exam', 'project', 'homework', 'lab', 'other']

  function openAdd() {
    setEditing(null)
    setForm({ title: '', subjectId: '', score: '', maxScore: '100', type: 'quiz' })
    setShowModal(true)
  }

  function openEdit(g) {
    setEditing(g)
    setForm({
      title: g.title,
      subjectId: g.subject_id || '',
      score: String(g.score),
      maxScore: String(g.max_score),
      type: g.type
    })
    setShowModal(true)
  }

  function handleSave() {
    if (!form.title.trim() || form.score === '') return
    const data = { ...form, score: parseFloat(form.score), maxScore: parseFloat(form.maxScore) }
    if (editing) {
      editGrade(editing.id, data)
    } else {
      addGrade(data)
    }
    setShowModal(false)
  }

  const overall = getOverallAverage()

  const filtered = grades
    .filter(g => selectedSubject === 'all' || g.subject_id === selectedSubject)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  function scoreColor(pct) {
    if (pct >= 90) return 'text-emerald-400'
    if (pct >= 75) return 'text-amber-400'
    return 'text-red-400'
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Grades</h2>
          <p className="text-gray-400 text-sm mt-1">{grades.length} record{grades.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          + Log Grade
        </button>
      </div>

      {/* Overall average card */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 sm:col-span-1">
          <p className="text-gray-400 text-sm">Overall Average</p>
          <p className={`text-4xl font-bold mt-1 ${overall ? scoreColor(parseFloat(overall)) : 'text-gray-600'}`}>
            {overall ? `${overall}%` : '—'}
          </p>
          {overall && <p className="text-gray-400 text-sm mt-1">{getLetterGrade(parseFloat(overall))}</p>}
        </div>

        {subjects.map(s => {
          const avg = getSubjectAverage(s.id)
          return (
            <div key={s.id} className={`rounded-xl p-5 border ${s.color.light} ${s.color.border}`}>
              <p className={`text-sm ${s.color.text} truncate`}>{s.name}</p>
              <p className={`text-3xl font-bold mt-1 ${avg ? scoreColor(parseFloat(avg)) : 'text-gray-600'}`}>
                {avg ? `${avg}%` : '—'}
              </p>
              {avg && <p className="text-gray-400 text-sm mt-1">{getLetterGrade(parseFloat(avg))}</p>}
            </div>
          )
        })}
      </div>

      {/* Filter by subject */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedSubject('all')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition
            ${selectedSubject === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
        >
          All
        </button>
        {subjects.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedSubject(s.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition
              ${selectedSubject === s.id ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-white font-medium mb-1">No grades logged yet</p>
          <p className="text-gray-400 text-sm">Start tracking your scores.</p>
        </div>
      )}

      {/* Grades list */}
      <div className="space-y-3">
        {filtered.map(g => {
          const subject = subjects.find(s => s.id === g.subject_id)
          const pct = ((g.score / g.max_score) * 100).toFixed(1)
          return (
            <div key={g.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center flex-shrink-0 border-2
                ${parseFloat(pct) >= 90 ? 'border-emerald-500' : parseFloat(pct) >= 75 ? 'border-amber-500' : 'border-red-500'}`}>
                <span className={`text-sm font-bold ${scoreColor(parseFloat(pct))}`}>{pct}%</span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white font-medium">{g.title}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {subject && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${subject.color.light} ${subject.color.border} ${subject.color.text}`}>
                      {subject.name}
                    </span>
                  )}
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full capitalize">{g.type}</span>
                  <span className="text-xs text-gray-500">{g.score} / {g.max_score}</span>
                </div>
              </div>

              <div className={`text-xl font-bold flex-shrink-0 ${scoreColor(parseFloat(pct))}`}>
                {getLetterGrade(parseFloat(pct))}
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => openEdit(g)} className="text-gray-500 hover:text-white text-xs transition">Edit</button>
                <button onClick={() => deleteGrade(g.id)} className="text-gray-500 hover:text-red-400 text-xs transition">Delete</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-white font-semibold text-lg">{editing ? 'Edit Grade' : 'Log Grade'}</h3>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Title</label>
              <input
                autoFocus
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Midterm Exam"
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

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Score</label>
                <input
                  type="number"
                  value={form.score}
                  onChange={e => setForm(f => ({ ...f, score: e.target.value }))}
                  placeholder="85"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Out of</label>
                <input
                  type="number"
                  value={form.maxScore}
                  onChange={e => setForm(f => ({ ...f, maxScore: e.target.value }))}
                  placeholder="100"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  {TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2 text-sm transition">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.title.trim() || form.score === ''}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2 text-sm transition"
              >
                {editing ? 'Save Changes' : 'Log Grade'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}