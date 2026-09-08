import { useEffect } from 'react'

const CHECK_INTERVAL = 30 * 1000 // check every 30s

export function useNotifications(assignments) {
  useEffect(() => {
    if (!('Notification' in window)) return

    // Request permission
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (!('Notification' in window)) return
    if (!assignments || assignments.length === 0) return

    function checkAssignments() {
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

        // Already notified? check localStorage.
        // Flags are reset automatically if the due date/time changes (e.g. the
        // assignment was edited), so old notifications don't suppress new ones.
        const notifiedKey = `sf_notified_${a.id}`
        const dueTimestamp = due.getTime()
        let notified = JSON.parse(localStorage.getItem(notifiedKey) || '{}')
        if (notified.dueTimestamp !== dueTimestamp) {
          notified = { dueTimestamp }
        }

        // Within 1 day of due date (but more than 1 hour away, so it doesn't
        // overlap/contradict the "due soon" notification below)
        if (
          msUntilDue > 60 * 60 * 1000 &&
          msUntilDue <= 24 * 60 * 60 * 1000 &&
          !notified.day
        ) {
          const isSameCalendarDay = due.toDateString() === now.toDateString()
          const hoursLeft = Math.round(msUntilDue / (60 * 60 * 1000))

          const title = isSameCalendarDay
            ? '📝 Assignment Due Today'
            : '📝 Assignment Due Tomorrow'
          const body = isSameCalendarDay
            ? `"${a.title}" is due today in about ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'}!`
            : `"${a.title}" is due tomorrow!`

          new Notification(title, { body, icon: '/favicon.ico' })
          localStorage.setItem(notifiedKey, JSON.stringify({ ...notified, day: true }))
        }

        // Within 1 hour of due date
        if (msUntilDue > 0 && msUntilDue <= 60 * 60 * 1000 && !notified.hour) {
          new Notification('⚠️ Assignment Due Soon', {
            body: `"${a.title}" is due in 1 hour!`,
            icon: '/favicon.ico',
          })
          localStorage.setItem(notifiedKey, JSON.stringify({ ...notified, hour: true }))
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
    }

    checkAssignments() // run immediately when assignments change
    const intervalId = setInterval(checkAssignments, CHECK_INTERVAL)
    return () => clearInterval(intervalId) // cleanup on unmount or assignments change
  }, [assignments])
}