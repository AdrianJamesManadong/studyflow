import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

// payload (camelCase from the form) -> DB row (snake_case)
function toRow(payload) {
  return {
    title: payload.title,
    subject_id: payload.subjectId || null,
    assignment_id: payload.assignmentId || null,
    due_date: payload.dueDate || null,
    due_time: payload.dueTime || null,
    priority: payload.priority || 'medium',
    notes: payload.notes || null,
    is_done: payload.isDone ?? false,
  }
}

export function useReminders() {
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReminders()
  }, [])

  async function fetchReminders() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('reminders')
      .select(`
        *,
        subjects ( id, name, color ),
        assignments ( id, title )
      `)
      .eq('user_id', user.id)
      .order('due_date', { ascending: true, nullsFirst: false })
    if (!error) setReminders(data || [])
    setLoading(false)
  }

  // payload: { title, subjectId, assignmentId, dueDate, dueTime, priority, notes, isDone }
  async function addReminder(payload) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('reminders')
      .insert({ ...toRow(payload), user_id: user.id })
      .select(`*, subjects ( id, name, color ), assignments ( id, title )`)
      .single()
    if (error) throw error
    setReminders(prev => [...prev, data])
  }

  async function editReminder(id, payload) {
    const { data, error } = await supabase
      .from('reminders')
      .update(toRow(payload))
      .eq('id', id)
      .select(`*, subjects ( id, name, color ), assignments ( id, title )`)
      .single()
    if (error) throw error
    setReminders(prev => prev.map(r => r.id === id ? data : r))
  }

  async function toggleDone(id) {
    const current = reminders.find(r => r.id === id)
    const { data, error } = await supabase
      .from('reminders')
      .update({ is_done: !current?.is_done })
      .eq('id', id)
      .select(`*, subjects ( id, name, color ), assignments ( id, title )`)
      .single()
    if (error) throw error
    setReminders(prev => prev.map(r => r.id === id ? data : r))
  }

  async function deleteReminder(id) {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
    if (error) throw error
    setReminders(prev => prev.filter(r => r.id !== id))
  }

  return { reminders, loading, addReminder, editReminder, toggleDone, deleteReminder }
}