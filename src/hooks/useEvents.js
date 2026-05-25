import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

export function useEvents() {
  const [events, setEvents] = useState([])

  useEffect(() => {
    fetchEvents()
  }, [])

 async function fetchEvents() {
  const { data: { user } } = await supabase.auth.getUser() // 👈 add this
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', user.id)                                // 👈 add this
    .order('date', { ascending: true })
  if (!error) setEvents(data || [])
}

  async function addEvent(data) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: newItem, error } = await supabase
      .from('events')
      .insert({ user_id: user.id, ...data })
      .select()
      .single()
    if (!error) setEvents(prev => [...prev, newItem])
  }

  async function deleteEvent(id) {
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (!error) setEvents(prev => prev.filter(e => e.id !== id))
  }

  return { events, addEvent, deleteEvent }
}