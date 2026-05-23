import { useState } from 'react'
import { useNotes } from '../hooks/useNotes'
import { useSubjects } from '../hooks/useSubjects'
import { NotesSkeleton } from '../components/Skeleton'

export default function Notes() {
  const { notes, addNote, editNote, deleteNote } = useNotes()
  const { subjects } = useSubjects()
  const [view, setView] = useState('list')
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [form, setForm] = useState({ title: '', content: '', subjectId: '' })

  function openNew() {
    setEditing(null)
    setForm({ title: '', content: '', subjectId: '' })
    setView('editor')
  }

  function openEdit(note) {
    setEditing(note)
    setForm({ title: note.title, content: note.content, subjectId: note.subject_id || '' })
    setView('editor')
  }

  function handleSave() {
    if (!form.title.trim()) return
    if (editing) {
      editNote(editing.id, form)
    } else {
      addNote(form)
    }
    setView('list')
  }

  function handleDelete(id) {
    deleteNote(id)
    if (view === 'editor') setView('list')
  }

  const filtered = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
    const matchesSubject = selectedSubject === 'all' || n.subject_id === selectedSubject
    return matchesSearch && matchesSubject
  })

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  if (view === 'editor') {
    const subject = subjects.find(s => s.id === form.subjectId)
    return (
      <div className="space-y-4 h-full">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setView('list')}
            className="text-gray-400 hover:text-white text-sm flex items-center gap-2 transition"
          >
            ← Back to Notes
          </button>
          <div className="flex gap-2">
            {editing && (
              <button
                onClick={() => handleDelete(editing.id)}
                className="px-4 py-2 text-sm bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition"
              >
                Delete
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!form.title.trim()}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
            >
              Save Note
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={form.subjectId}
            onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500 transition"
          >
            <option value="">No subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {subject && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${subject.color.light} ${subject.color.border} ${subject.color.text}`}>
              {subject.name}
            </span>
          )}
        </div>

        <input
          autoFocus
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Note title..."
          className="w-full bg-transparent text-3xl font-bold text-white placeholder-gray-600 focus:outline-none border-b border-gray-800 pb-3"
        />

        <textarea
          value={form.content}
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
          placeholder="Start writing your note here..."
          className="w-full bg-transparent text-gray-300 placeholder-gray-600 focus:outline-none resize-none leading-relaxed"
          style={{ minHeight: '60vh' }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Notes</h2>
          <p className="text-gray-400 text-sm mt-1">{notes.length} note{notes.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openNew}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          + New Note
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes..."
          className="flex-1 min-w-48 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition text-sm"
        />
        <select
          value={selectedSubject}
          onChange={e => setSelectedSubject(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500 transition"
        >
          <option value="all">All subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-4xl mb-3">🗒️</p>
          <p className="text-white font-medium mb-1">{search ? 'No notes match your search' : 'No notes yet'}</p>
          <p className="text-gray-400 text-sm">Click "New Note" to start writing.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(note => {
          const subject = subjects.find(s => s.id === note.subject_id)
          return (
            <div
              key={note.id}
              onClick={() => openEdit(note)}
              className="bg-gray-900 border border-gray-800 hover:border-indigo-500/50 rounded-xl p-5 cursor-pointer transition group space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-white font-semibold group-hover:text-indigo-300 transition line-clamp-1">
                  {note.title}
                </h3>
                <button
                  onClick={e => { e.stopPropagation(); deleteNote(note.id) }}
                  className="text-gray-600 hover:text-red-400 text-xs transition flex-shrink-0 opacity-0 group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>

              {note.content && (
                <p className="text-gray-500 text-sm line-clamp-3 leading-relaxed">{note.content}</p>
              )}

              <div className="flex items-center justify-between">
                {subject ? (
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${subject.color.light} ${subject.color.border} ${subject.color.text}`}>
                    {subject.name}
                  </span>
                ) : <span />}
                <span className="text-xs text-gray-600">{timeAgo(note.updated_at)}</span>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}