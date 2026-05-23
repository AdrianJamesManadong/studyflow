import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

export function useGrades() {
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGrades()
  }, [])

  async function fetchGrades() {
    setLoading(true)
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setGrades(data || [])
    setLoading(false)
  }

  async function addGrade(data) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: newItem, error } = await supabase
      .from('grades')
      .insert({
        user_id: user.id,
        title: data.title,
        subject_id: data.subjectId || null,
        score: data.score,
        max_score: data.maxScore,
        type: data.type,
      })
      .select()
      .single()
    if (!error) setGrades(prev => [newItem, ...prev])
  }

  async function editGrade(id, data) {
    const { data: updated, error } = await supabase
      .from('grades')
      .update({
        title: data.title,
        subject_id: data.subjectId || null,
        score: data.score,
        max_score: data.maxScore,
        type: data.type,
      })
      .eq('id', id)
      .select()
      .single()
    if (!error) setGrades(prev => prev.map(g => g.id === id ? updated : g))
  }

  async function deleteGrade(id) {
    const { error } = await supabase.from('grades').delete().eq('id', id)
    if (!error) setGrades(prev => prev.filter(g => g.id !== id))
  }

  function getSubjectAverage(subjectId) {
    const sg = grades.filter(g => g.subject_id === subjectId)
    if (sg.length === 0) return null
    const sum = sg.reduce((acc, g) => acc + (g.score / g.max_score) * 100, 0)
    return (sum / sg.length).toFixed(1)
  }

  function getOverallAverage() {
    if (grades.length === 0) return null
    const sum = grades.reduce((acc, g) => acc + (g.score / g.max_score) * 100, 0)
    return (sum / grades.length).toFixed(1)
  }

  function getLetterGrade(pct) {
    if (pct >= 97) return 'A+'
    if (pct >= 93) return 'A'
    if (pct >= 90) return 'A-'
    if (pct >= 87) return 'B+'
    if (pct >= 83) return 'B'
    if (pct >= 80) return 'B-'
    if (pct >= 77) return 'C+'
    if (pct >= 73) return 'C'
    if (pct >= 70) return 'C-'
    if (pct >= 60) return 'D'
    return 'F'
  }

  return { grades, loading, addGrade, editGrade, deleteGrade, getSubjectAverage, getOverallAverage, getLetterGrade }
}