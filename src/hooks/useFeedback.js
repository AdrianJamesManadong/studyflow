import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'

export function useFeedback() {
  const [posts, setPosts]       = useState([])
  const [likedIds, setLikedIds] = useState(new Set())
  const [comments, setComments] = useState({})
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('feedback_posts')
        .select('*, feedback_likes(count), feedback_comments(count)')
        .order('created_at', { ascending: false })
      if (error) throw error

      const mapped = (data ?? []).map(p => ({
        ...p,
        like_count:    p.feedback_likes?.[0]?.count ?? 0,
        comment_count: p.feedback_comments?.[0]?.count ?? 0,
      }))
      setPosts(mapped)

      const { data: myLikes, error: likesErr } = await supabase
        .from('feedback_likes')
        .select('post_id')
        .eq('user_id', session.user.id)
      if (likesErr) throw likesErr
      setLikedIds(new Set((myLikes ?? []).map(l => l.post_id)))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  async function addPost({ content, category, isAnonymous, authorName }) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    try {
      const { data: newPost, error } = await supabase
        .from('feedback_posts')
        .insert({
          user_id:      session.user.id,
          author_name:  isAnonymous ? null : authorName,
          is_anonymous: isAnonymous,
          category,
          content,
        })
        .select()
        .single()
      if (error) throw error
      setPosts(prev => [{ ...newPost, like_count: 0, comment_count: 0 }, ...prev])
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  async function deletePost(id) {
    try {
      const { error } = await supabase.from('feedback_posts').delete().eq('id', id)
      if (error) throw error
      setPosts(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  async function toggleLike(postId) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')
    const alreadyLiked = likedIds.has(postId)

    setLikedIds(prev => {
      const next = new Set(prev)
      alreadyLiked ? next.delete(postId) : next.add(postId)
      return next
    })
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, like_count: p.like_count + (alreadyLiked ? -1 : 1) } : p
    ))

    try {
      if (alreadyLiked) {
        const { error } = await supabase
          .from('feedback_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', session.user.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('feedback_likes')
          .insert({ post_id: postId, user_id: session.user.id })
        if (error) throw error
      }
    } catch (err) {
      setLikedIds(prev => {
        const next = new Set(prev)
        alreadyLiked ? next.add(postId) : next.delete(postId)
        return next
      })
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, like_count: p.like_count + (alreadyLiked ? 1 : -1) } : p
      ))
      setError(err.message)
    }
  }

  async function fetchComments(postId) {
    try {
      const { data, error } = await supabase
        .from('feedback_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      if (error) throw error
      setComments(prev => ({ ...prev, [postId]: data ?? [] }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function addComment(postId, { content, isAnonymous, authorName, isAdmin = false }) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    try {
      const { data: newComment, error } = await supabase
        .from('feedback_comments')
        .insert({
          post_id:      postId,
          user_id:      session.user.id,
          author_name:  isAdmin ? 'StudyFlow Admin' : (isAnonymous ? null : authorName),
          is_anonymous: isAnonymous,
          is_admin:     isAdmin,
          content,
        })
        .select()
        .single()
      if (error) throw error
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), newComment],
      }))
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p
      ))
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  async function deleteComment(postId, commentId) {
    try {
      const { error } = await supabase.from('feedback_comments').delete().eq('id', commentId)
      if (error) throw error
      setComments(prev => ({
        ...prev,
        [postId]: (prev[postId] ?? []).filter(c => c.id !== commentId),
      }))
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p
      ))
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  return {
    posts, likedIds, comments, loading, error,
    refetch: fetchPosts,
    addPost, deletePost, toggleLike,
    fetchComments, addComment, deleteComment,
  }
}