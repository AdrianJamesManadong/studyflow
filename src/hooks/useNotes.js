import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

export function useNotes() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotes()
  }, [])

async function fetchNotes() {
  setLoading(true)
  const { data: { user } } = await supabase.auth.getUser() // 👈 add this
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', user.id)                                // 👈 add this
    .order('updated_at', { ascending: false })
  if (!error) setNotes(data || [])
  setLoading(false)
}

  async function addNote(data) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: newItem, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title: data.title,
        content: data.content || '',
        subject_id: data.subjectId || null,
      })
      .select()
      .single()
    if (!error) setNotes(prev => [newItem, ...prev])
  }

  async function editNote(id, data) {
    const { data: updated, error } = await supabase
      .from('notes')
      .update({
        title: data.title,
        content: data.content || '',
        subject_id: data.subjectId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    if (!error) setNotes(prev => prev.map(n => n.id === id ? updated : n))
  }

  async function deleteNote(id) {
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (!error) setNotes(prev => prev.filter(n => n.id !== id))
  }

  return { notes, loading, addNote, editNote, deleteNote }
}