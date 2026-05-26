import { useState, useEffect, useCallback } from 'react'
import { useNotes } from '../hooks/useNotes'
import { useSubjects } from '../hooks/useSubjects'
import { NotesSkeleton } from '../components/Skeleton'

// Fix: outside component — never recreated on render
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function isDirty(form, editing) {
  if (!editing) return form.title.trim() !== '' || form.content.trim() !== ''
  return (
    form.title     !== editing.title ||
    form.content   !== (editing.content || '') ||
    form.subjectId !== (editing.subject_id || '')
  )
}

const EMPTY_FORM = { title: '', content: '', subjectId: '' }

export default function Notes() {
  // Fix: destructure loading from both hooks
  const { notes, addNote, editNote, deleteNote, loading: notesLoading } = useNotes()
  const { subjects, loading: subjectsLoading }                           = useSubjects()

  const [view, setView]                   = useState('list')
  const [editing, setEditing]             = useState(null)
  const [search, setSearch]               = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')  // Fix: debounced search
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [form, setForm]                   = useState(EMPTY_FORM)
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)   // Fix: confirm before delete
  const [deleting, setDeleting]           = useState(false)
  const [confirmBack, setConfirmBack]     = useState(false)  // Fix: warn on unsaved changes

  // Fix: debounce search input by 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Escape key: close confirm modals or go back from editor
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return
      if (confirmDelete) { setConfirmDelete(null); return }
      if (confirmBack)   { setConfirmBack(false);  return }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [confirmDelete, confirmBack])

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setView('editor')
  }

  function openEdit(note) {
    setEditing(note)
    setForm({ title: note.title, content: note.content || '', subjectId: note.subject_id || '' })
    setError('')
    setView('editor')
  }

  // Fix: warn if unsaved changes exist before navigating back
  function handleBack() {
    if (isDirty(form, editing)) {
      setConfirmBack(true)
    } else {
      setView('list')
    }
  }

  // Fix: async, awaited, saving state, error handling
  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await editNote(editing.id, form)
      } else {
        await addNote(form)
      }
      setView('list')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Fix: async delete with deleting state and error handling
  async function handleDelete() {
    setDeleting(true)
    setError('')
    try {
      await deleteNote(confirmDelete.id)
      setConfirmDelete(null)
      if (view === 'editor') setView('list')
    } catch (err) {
      setError(err.message || 'Failed to delete note. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = notes.filter(n => {
    const q = debouncedSearch.toLowerCase()
    const matchesSearch = n.title.toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q)
    const matchesSubject = selectedSubject === 'all' || n.subject_id === selectedSubject
    return matchesSearch && matchesSubject
  })

  // Fix: actually use the imported skeleton while loading
  if (notesLoading || subjectsLoading) return <NotesSkeleton />

  /* ── Editor view ── */
  if (view === 'editor') {
    const subject = subjects.find(s => s.id === form.subjectId)
    return (
      <>
        <div className="space-y-4 h-full">
          <div className="flex items-center justify-between">
            {/* Fix: warn on unsaved changes before going back */}
            <button
              onClick={handleBack}
              className="text-gray-400 hover:text-white text-sm flex items-center gap-2 transition"
            >
              ← Back to Notes
            </button>
            <div className="flex gap-2">
              {editing && (
                <button
                  onClick={() => { setError(''); setConfirmDelete(editing) }}
                  className="px-4 py-2 text-sm bg-gray-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition"
                >
                  Delete
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!form.title.trim() || saving}
                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
              >
                {saving ? 'Saving…' : 'Save Note'}
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

          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        {/* Fix: unsaved changes confirmation */}
        {confirmBack && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setConfirmBack(false)}
          >
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
              <div className="text-center">
                <p className="text-3xl mb-3">⚠️</p>
                <h3 className="text-white font-semibold text-lg">Unsaved Changes</h3>
                <p className="text-gray-400 text-sm mt-1">
                  You have unsaved changes. Are you sure you want to go back? They will be lost.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmBack(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2 text-sm transition"
                >
                  Keep Editing
                </button>
                <button
                  onClick={() => { setConfirmBack(false); setView('list') }}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg py-2 text-sm transition"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm modal (from editor) */}
        {confirmDelete && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setConfirmDelete(null)}
          >
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
              <div className="text-center">
                <p className="text-3xl mb-3">🗑️</p>
                <h3 className="text-white font-semibold text-lg">Delete Note?</h3>
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
      </>
    )
  }

  /* ── List view ── */
  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Notes</h2>
            <p className="text-gray-400 text-sm mt-1">
              {notes.length} note{notes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={openNew}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + New Note
          </button>
        </div>

        <div className="flex gap-3 flex-wrap">
          {/* Fix: search input updates immediately, filter debounced */}
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
            <p className="text-white font-medium mb-1">
              {search ? 'No notes match your search' : 'No notes yet'}
            </p>
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
                  {/* Fix: opens confirm modal instead of deleting inline */}
                  <button
                    onClick={e => { e.stopPropagation(); setError(''); setConfirmDelete(note) }}
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

      {/* Delete confirm modal (from list) */}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setConfirmDelete(null)}
        >
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center">
              <p className="text-3xl mb-3">🗑️</p>
              <h3 className="text-white font-semibold text-lg">Delete Note?</h3>
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
    </>
  )
}