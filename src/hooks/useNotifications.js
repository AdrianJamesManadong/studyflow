import { useEffect } from 'react'

export function useNotifications(assignments) {
  useEffect(() => {
    if (!('Notification' in window)) return

    // Request permission
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (!assignments || assignments.length === 0) return
    if (Notification.permission !== 'granted') return

    const now = new Date()

    assignments.forEach(a => {
      if (a.status === 'done') return

      const due = new Date(a.due_date)
      if (a.due_time) {
        const [h, m] = a.due_time.split(':')
        due.setHours(parseInt(h), parseInt(m))
      } else {
        due.setHours(23, 59, 0)
      }

      const msUntilDue = due - now
      const msUntil1HourBefore = msUntilDue - 60 * 60 * 1000
      const msUntil1DayBefore = msUntilDue - 24 * 60 * 60 * 1000

      // Already notified? check localStorage
      const notifiedKey = `sf_notified_${a.id}`
      const notified = JSON.parse(localStorage.getItem(notifiedKey) || '{}')

      // 1 day before
      if (msUntil1DayBefore > 0 && msUntil1DayBefore < 60000 && !notified.day) {
        setTimeout(() => {
          new Notification('📝 Assignment Due Tomorrow', {
            body: `"${a.title}" is due tomorrow!`,
            icon: '/favicon.ico',
          })
          localStorage.setItem(notifiedKey, JSON.stringify({ ...notified, day: true }))
        }, msUntil1DayBefore)
      }

      // 1 hour before
      if (msUntil1HourBefore > 0 && msUntil1HourBefore < 60000 && !notified.hour) {
        setTimeout(() => {
          new Notification('⚠️ Assignment Due Soon', {
            body: `"${a.title}" is due in 1 hour!`,
            icon: '/favicon.ico',
          })
          localStorage.setItem(notifiedKey, JSON.stringify({ ...notified, hour: true }))
        }, msUntil1HourBefore)
      }

      // Overdue
      if (msUntilDue < 0 && !notified.overdue) {
        new Notification('🚨 Assignment Overdue', {
          body: `"${a.title}" was due ${due.toLocaleDateString()}!`,
          icon: '/favicon.ico',
        })
        localStorage.setItem(notifiedKey, JSON.stringify({ ...notified, overdue: true }))
      }
    })
  }, [assignments])
}