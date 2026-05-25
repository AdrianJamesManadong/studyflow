import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'

// Shared mapper — single source of truth for DB columns
const toRow = (data) => ({
  title: data.title,
  subject_id: data.subjectId || null,
  due_date: data.dueDate,
  due_time: data.dueTime || null,
  priority: data.priority,
  status: data.status,
  notes: data.notes || null,
})

export function useAssignments() {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

const fetchAssignments = useCallback(async () => {
  setLoading(true)
  setError(null)
  try {
    const { data: { session } } = await supabase.auth.getSession() // 👈 add this
    if (!session) throw new Error('Not authenticated')             // 👈 add this
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('user_id', session.user.id)                             // 👈 add this
      .order('due_date', { ascending: true })
    if (error) throw error
    setAssignments(data ?? [])
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}, [])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  async function addAssignment(data) {
    // Use cached session instead of a network round-trip
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    try {
      const { data: newItem, error } = await supabase
        .from('assignments')
        .insert({ user_id: session.user.id, ...toRow(data) })
        .select()
        .single()
      if (error) throw error
      setAssignments(prev => [...prev, newItem])
    } catch (err) {
      setError(err.message)
      throw err  // re-throw so the form can react (e.g. show inline error)
    }
  }

  async function editAssignment(id, data) {
    try {
      const { data: updated, error } = await supabase
        .from('assignments')
        .update(toRow(data))
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      setAssignments(prev => prev.map(a => a.id === id ? updated : a))
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  async function deleteAssignment(id) {
    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', id)
      if (error) throw error
      setAssignments(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  async function toggleStatus(id) {
    // Guard against missing assignment
    const assignment = assignments.find(a => a.id === id)
    if (!assignment) return

    const newStatus = assignment.status === 'done' ? 'pending' : 'done'
    try {
      const { data: updated, error } = await supabase
        .from('assignments')
        .update({ status: newStatus })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      setAssignments(prev => prev.map(a => a.id === id ? updated : a))
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  return {
    assignments,
    loading,
    error,
    refetch: fetchAssignments,   // expose for manual refresh
    addAssignment,
    editAssignment,
    deleteAssignment,
    toggleStatus,
  }
}