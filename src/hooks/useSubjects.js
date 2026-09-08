import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'


const COLORS = [
  { name: 'indigo', bg: 'bg-indigo-500', light: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400' },
  { name: 'rose', bg: 'bg-rose-500', light: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400' },
  { name: 'amber', bg: 'bg-amber-500', light: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  { name: 'emerald', bg: 'bg-emerald-500', light: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  { name: 'sky', bg: 'bg-sky-500', light: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-400' },
  { name: 'purple', bg: 'bg-purple-500', light: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
  { name: 'pink', bg: 'bg-pink-500', light: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400' },
  { name: 'orange', bg: 'bg-orange-500', light: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
]

// Maps the row coming back from Supabase (snake_case) into the shape
// the Subjects component expects (camelCase, days as an array).
function fromRow(row) {
  return {
    ...row,
    professor: row.professor || '',
    units: row.units,
    room: row.room || '',
    days: row.days || [],
    startTime: row.start_time || '',
    endTime: row.end_time || '',
  }
}

// Maps the component's payload into DB column names.
function toRow(payload) {
  const color = COLORS.find(c => c.name === payload.color) || COLORS[0]
  return {
    name: payload.name,
    color,
    professor: payload.professor || null,
    units: payload.units ?? null,
    room: payload.room || null,
    days: payload.days || [],
    start_time: payload.startTime || null,
    end_time: payload.endTime || null,
  }
}

export function useSubjects() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubjects()
  }, [])

  async function fetchSubjects() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (!error) setSubjects((data || []).map(fromRow))
    setLoading(false)
  }

  // payload: { name, color, professor, units, room, days, startTime, endTime }
  async function addSubject(payload) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('subjects')
      .insert({ ...toRow(payload), user_id: user.id })
      .select()
      .single()
    if (error) throw error
    setSubjects(prev => [...prev, fromRow(data)])
  }

  // payload: { name, color, professor, units, room, days, startTime, endTime }
  async function editSubject(id, payload) {
    const { data, error } = await supabase
      .from('subjects')
      .update(toRow(payload))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setSubjects(prev => prev.map(s => s.id === id ? fromRow(data) : s))
  }

  async function deleteSubject(id) {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id)
    if (error) throw error
    setSubjects(prev => prev.filter(s => s.id !== id))
  }

  return { subjects, loading, addSubject, editSubject, deleteSubject, COLORS }
}