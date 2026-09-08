import { useState, useEffect, useCallback } from 'react'
import { useNotes } from '../hooks/useNotes'
import { useSubjects } from '../hooks/useSubjects'
import { NotesSkeleton } from '../components/Skeleton'
import {
  ArrowLeft,
  Trash2,
  Plus,
  Search,
  StickyNote,
  AlertTriangle,
  X,
} from 'lucide-react'

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
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)

  // Fix: debounce search input by 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Escape key: close confirm modals or go back from editor
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return
      if (confirmDelete)    { setConfirmDelete(null);    return }
      if (confirmDeleteAll) { setConfirmDeleteAll(false); return }
      if (confirmBack)      { setConfirmBack(false);      return }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [confirmDelete, confirmDeleteAll, confirmBack])

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

  // Deletes ALL notes (not just the filtered/visible ones)
  async function handleDeleteAll() {
    setDeleting(true)
    setError('')
    try {
      for (const note of notes) {
        await deleteNote(note.id)
      }
      setConfirmDeleteAll(false)
    } catch (err) {
      setError(err.message || 'Failed to delete all notes. Please try again.')
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
              className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <ArrowLeft size={15} /> Back to Notes
            </button>
            <div className="flex gap-2">
              {editing && (
                <button
                  onClick={() => { setError(''); setConfirmDelete(editing) }}
                  className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!form.title.trim() || saving}
                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-sm transition-colors"
              >
                {saving ? 'Saving…' : 'Save Note'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={form.subjectId}
              onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition"
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
            className="w-full bg-transparent text-3xl font-bold text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none border-b border-gray-200 dark:border-gray-700 pb-3"
          />

          <textarea
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="Start writing your note here..."
            className="w-full bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none resize-none leading-relaxed"
            style={{ minHeight: '60vh' }}
          />

          {error && <p className="text-red-600 dark:text-red-400 text-xs">{error}</p>}
        </div>

        {/* Fix: unsaved changes confirmation */}
        {confirmBack && (
          <div
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setConfirmBack(false)}
          >
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle size={22} className="text-amber-500 dark:text-amber-400" />
                </div>
                <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Unsaved Changes</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                  You have unsaved changes. Are you sure you want to go back? They will be lost.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmBack(false)}
                  className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg py-2 text-sm font-medium transition-colors"
                >
                  Keep Editing
                </button>
                <button
                  onClick={() => { setConfirmBack(false); setView('list') }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg py-2 text-sm transition-colors"
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
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setConfirmDelete(null)}
          >
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-center mx-auto mb-3">
                  <Trash2 size={20} className="text-red-500 dark:text-red-400" />
                </div>
                <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Delete Note?</h3>
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
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg py-2 text-sm transition-colors disabled:opacity-40"
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notes</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {notes.length} note{notes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {notes.length > 0 && (
              <button
                onClick={() => { setError(''); setConfirmDeleteAll(true) }}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800 px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                Delete All
              </button>
            )}
            <button
              onClick={openNew}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <Plus size={15} /> New Note
            </button>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          {/* Fix: search input updates immediately, filter debounced */}
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-4 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition text-sm"
            />
          </div>
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition"
          >
            <option value="all">All subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {filtered.length === 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center mx-auto mb-3">
              <StickyNote size={20} className="text-indigo-500 dark:text-indigo-400" />
            </div>
            <p className="text-gray-900 dark:text-white font-medium mb-1">
              {search ? 'No notes match your search' : 'No notes yet'}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Click "New Note" to start writing.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(note => {
            const subject = subjects.find(s => s.id === note.subject_id)
            return (
              <div
                key={note.id}
                onClick={() => openEdit(note)}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl p-5 cursor-pointer transition-all shadow-sm hover:shadow-md group space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-gray-900 dark:text-white font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                    {note.title}
                  </h3>
                  {/* Fix: opens confirm modal instead of deleting inline */}
                  <button
                    onClick={e => { e.stopPropagation(); setError(''); setConfirmDelete(note) }}
                    className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </div>

                {note.content && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-3 leading-relaxed">{note.content}</p>
                )}

                <div className="flex items-center justify-between">
                  {subject ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${subject.color.light} ${subject.color.border} ${subject.color.text}`}>
                      {subject.name}
                    </span>
                  ) : <span />}
                  <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(note.updated_at)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Delete confirm modal (from list) */}
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
              <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Delete Note?</h3>
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
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg py-2 text-sm transition-colors disabled:opacity-40"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All confirm modal */}
      {confirmDeleteAll && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setConfirmDeleteAll(false)}
        >
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-center mx-auto mb-3">
                <Trash2 size={20} className="text-red-500 dark:text-red-400" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Delete All Notes?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                This will permanently delete all{' '}
                <span className="text-gray-900 dark:text-white font-medium">{notes.length}</span> note{notes.length !== 1 ? 's' : ''}. This cannot be undone.
              </p>
              {error && <p className="text-red-600 dark:text-red-400 text-xs mt-2">{error}</p>}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteAll(false)}
                disabled={deleting}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg py-2 text-sm transition-colors disabled:opacity-40"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}