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

export function useSubjects() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubjects()
  }, [])

  async function fetchSubjects() {
    setLoading(true)
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error) setSubjects(data || [])
    setLoading(false)
  }

  async function addSubject(name, colorName) {
  const color = COLORS.find(c => c.name === colorName) || COLORS[0]
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('subjects')
    .insert({ name, color, user_id: user.id })
    .select()
    .single()
  if (!error) setSubjects(prev => [...prev, data])
}

  async function editSubject(id, name, colorName) {
    const color = COLORS.find(c => c.name === colorName) || COLORS[0]
    const { data, error } = await supabase
      .from('subjects')
      .update({ name, color })
      .eq('id', id)
      .select()
      .single()
    if (!error) setSubjects(prev => prev.map(s => s.id === id ? data : s))
  }

  async function deleteSubject(id) {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id)
    if (!error) setSubjects(prev => prev.filter(s => s.id !== id))
  }

  return { subjects, loading, addSubject, editSubject, deleteSubject, COLORS }
}