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

// A subject can meet more than once a week, possibly in different rooms
// at different times (e.g. lecture Mon/Wed in Rm 302, lab Fri in the Chem Lab).
// Each entry in `schedules` is one such block: { days, startTime, endTime, room }.
// Stored in the DB as a single `schedules` jsonb column (see migration note below).

// Maps the row coming back from Supabase (snake_case) into the shape
// the Subjects component expects (camelCase, schedules as an array).
function fromRow(row) {
  let schedules = Array.isArray(row.schedules) ? row.schedules : []

  // Back-compat: rows saved before the `schedules` column existed only have
  // the old single room/days/start_time/end_time columns. Fold those into
  // a one-item schedules array so old data still displays correctly.
  if (schedules.length === 0 && (row.days?.length || row.room || row.start_time)) {
    schedules = [{
      days: row.days || [],
      startTime: row.start_time || '',
      endTime: row.end_time || '',
      room: row.room || '',
    }]
  }

  return {
    ...row,
    professor: row.professor || '',
    units: row.units,
    schedules,
  }
}

// Maps the component's payload into DB column names.
function toRow(payload) {
  const color = COLORS.find(c => c.name === payload.color) || COLORS[0]
  const schedules = (payload.schedules || []).map(s => ({
    days: s.days || [],
    startTime: s.startTime || '',
    endTime: s.endTime || '',
    room: s.room || '',
  }))

  return {
    name: payload.name,
    color,
    professor: payload.professor || null,
    units: payload.units ?? null,
    schedules,
    // Keep the legacy columns in sync with the first schedule block, so
    // anything still reading the old columns directly (e.g. old reports,
    // other views) doesn't silently break. Safe to drop once nothing
    // else depends on them.
    days: schedules[0]?.days || [],
    room: schedules[0]?.room || null,
    start_time: schedules[0]?.startTime || null,
    end_time: schedules[0]?.endTime || null,
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

  // payload: { name, color, professor, units, schedules: [{ days, startTime, endTime, room }] }
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

  // payload: { name, color, professor, units, schedules: [{ days, startTime, endTime, room }] }
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