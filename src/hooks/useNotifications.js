import { useEffect, useRef } from 'react'

const CHECK_INTERVAL = 30 * 1000 // check every 30s
const MIN  = 60 * 1000
const HOUR = 60 * MIN
const DAY  = 24 * HOUR
const CLASS_SOON = 15 * MIN // how far ahead to warn about an upcoming class

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Same fallback as Calendar.jsx: a subject can have several schedule blocks,
// or (for older data) a single flat days/startTime/endTime/room set.
function getSubjectSchedules(subject) {
  if (Array.isArray(subject.schedules) && subject.schedules.length > 0) return subject.schedules
  if (subject.days?.length || subject.startTime || subject.room) {
    return [{
      days: subject.days || [],
      startTime: subject.startTime || '',
      endTime: subject.endTime || '',
      room: subject.room || '',
    }]
  }
  return []
}

// Per-kind notification rules. Each rule fires once per item per occurrence —
// "occurrence" is tracked via the localStorage flag built below.
const RULES = {
  assignment: [
    {
      key: 'day', test: ms => ms > HOUR && ms <= DAY,
      build: (item, now) => {
        const sameDay = item.due.toDateString() === now.toDateString()
        const hoursLeft = Math.round((item.due - now) / HOUR)
        return {
          title: sameDay ? '📝 Assignment Due Today' : '📝 Assignment Due Tomorrow',
          body: sameDay
            ? `"${item.title}" is due today in about ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'}!`
            : `"${item.title}" is due tomorrow!`,
        }
      },
    },
    {
      key: 'hour', test: ms => ms > 0 && ms <= HOUR,
      build: item => ({ title: '⚠️ Assignment Due Soon', body: `"${item.title}" is due in 1 hour!` }),
    },
    {
      key: 'overdue', test: ms => ms < 0,
      build: item => ({ title: '🚨 Assignment Overdue', body: `"${item.title}" was due ${item.due.toLocaleDateString()}!` }),
    },
  ],
  reminder: [
    {
      key: 'day', test: ms => ms > HOUR && ms <= DAY,
      build: (item, now) => {
        const sameDay = item.due.toDateString() === now.toDateString()
        return {
          title: sameDay ? '🔔 Reminder Due Today' : '🔔 Reminder Due Tomorrow',
          body: sameDay ? `"${item.title}" is due today!` : `"${item.title}" is due tomorrow!`,
        }
      },
    },
    {
      key: 'hour', test: ms => ms > 0 && ms <= HOUR,
      build: item => ({ title: '⚠️ Reminder Due Soon', body: `"${item.title}" is due in 1 hour!` }),
    },
    {
      key: 'overdue', test: ms => ms < 0,
      build: item => ({ title: '🚨 Reminder Overdue', body: `"${item.title}" was due ${item.due.toLocaleDateString()}!` }),
    },
  ],
  event: [
    {
      key: 'day', test: ms => ms > HOUR && ms <= DAY,
      build: (item, now) => {
        const sameDay = item.due.toDateString() === now.toDateString()
        return {
          title: sameDay ? '📅 Event Today' : '📅 Event Tomorrow',
          body: sameDay ? `"${item.title}" is today!` : `"${item.title}" is tomorrow!`,
        }
      },
    },
    {
      key: 'hour', test: ms => ms > 0 && ms <= HOUR,
      build: item => ({ title: '⏰ Event Starting Soon', body: `"${item.title}" starts in about 1 hour!` }),
    },
  ],
  class: [
    {
      key: 'soon', test: ms => ms > 0 && ms <= CLASS_SOON,
      build: item => {
        const mins = Math.max(1, Math.round((item.due - Date.now()) / MIN))
        return {
          title: '🎓 Class Starting Soon',
          body: `${item.title} starts in ${mins} minute${mins === 1 ? '' : 's'}${item.room ? ` · ${item.room}` : ''}`,
        }
      },
    },
  ],
}

const NAV_PATH = {
  assignment: '/dashboard/assignments',
  reminder:   '/dashboard/reminders',
  event:      '/dashboard/calendar',
  class:      '/dashboard/calendar',
}

export function useNotifications({ assignments = [], reminders = [], events = [], subjects = [] } = {}) {
  // Keep the latest data in a ref so the interval below runs once on mount
  // and reads fresh data each tick, instead of being torn down and rebuilt
  // every time any of these arrays gets a new reference (e.g. on refetch).
  const dataRef = useRef({ assignments, reminders, events, subjects })
  useEffect(() => {
    dataRef.current = { assignments, reminders, events, subjects }
  }, [assignments, reminders, events, subjects])

  useEffect(() => {
    if (!('Notification' in window)) return
    // Permission is requested explicitly from the NotificationBell button
    // (a real user gesture) — not auto-requested here.

    function buildItems() {
      const { assignments, reminders, events, subjects } = dataRef.current
      const now = new Date()
      const items = []

      assignments.forEach(a => {
        if (a.status === 'done' || !a.due_date) return
        const due = new Date(a.due_date)
        if (a.due_time) {
          const [h, m] = a.due_time.split(':')
          due.setHours(parseInt(h), parseInt(m))
        } else {
          due.setHours(23, 59, 0)
        }
        items.push({ id: `assignment-${a.id}`, kind: 'assignment', title: a.title, due })
      })

      reminders.forEach(r => {
        if (r.is_done || !r.due_date) return
        const due = new Date(r.due_date)
        if (r.due_time) {
          const [h, m] = r.due_time.split(':')
          due.setHours(parseInt(h), parseInt(m))
        } else {
          due.setHours(23, 59, 0)
        }
        items.push({ id: `reminder-${r.id}`, kind: 'reminder', title: r.title, due })
      })

      events.forEach(e => {
        if (!e.date) return
        const due = new Date(e.date)
        if (e.time) {
          const [h, m] = e.time.split(':')
          due.setHours(parseInt(h), parseInt(m))
        } else {
          due.setHours(9, 0, 0) // untimed events default to a morning nudge
        }
        items.push({ id: `event-${e.id}`, kind: 'event', title: e.title, due })
      })

      // Classes are recurring by weekday — only today's occurrences are
      // relevant to "starting soon" notifications, and the storage key
      // below bakes in today's date so each day's class re-notifies fresh.
      const todayStr = toDateStr(now)
      const todayAbbr = DAY_ABBR[now.getDay()]
      subjects.forEach(s => {
        getSubjectSchedules(s).forEach((block, idx) => {
          if (!block.startTime || !(block.days || []).includes(todayAbbr)) return
          const [h, m] = block.startTime.split(':')
          const due = new Date(now)
          due.setHours(parseInt(h), parseInt(m), 0, 0)
          items.push({ id: `class-${s.id}-${idx}-${todayStr}`, kind: 'class', title: s.name, due, room: block.room })
        })
      })

      return items
    }

    function focusAndGoTo(kind) {
      window.focus()
      const path = NAV_PATH[kind]
      if (path && window.location.pathname !== path) window.location.href = path
    }

    function pruneStaleNotifiedKeys(activeIds) {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (!key || !key.startsWith('sf_notified_')) continue
        const id = key.slice('sf_notified_'.length)
        if (!activeIds.has(id)) localStorage.removeItem(key)
      }
    }

    function checkAll() {
      if (Notification.permission !== 'granted') return
      const now = new Date()
      const items = buildItems()
      pruneStaleNotifiedKeys(new Set(items.map(it => it.id)))

      items.forEach(item => {
        const rules = RULES[item.kind]
        if (!rules) return
        const msUntilDue = item.due - now
        const notifiedKey = `sf_notified_${item.id}`
        const dueTimestamp = item.due.getTime()
        let notified = JSON.parse(localStorage.getItem(notifiedKey) || '{}')
        // Flags reset automatically if the due time changes (e.g. edited),
        // so old notifications don't suppress new ones for the same item.
        if (notified.dueTimestamp !== dueTimestamp) notified = { dueTimestamp }

        for (const rule of rules) {
          if (notified[rule.key]) continue
          if (!rule.test(msUntilDue)) continue
          const { title, body } = rule.build(item, now)
          const n = new Notification(title, { body, icon: '/favicon.ico', tag: `${item.id}-${rule.key}` })
          n.onclick = () => focusAndGoTo(item.kind)
          notified = { ...notified, [rule.key]: true }
          localStorage.setItem(notifiedKey, JSON.stringify(notified))
        }
      })
    }

    checkAll() // run immediately on mount
    const intervalId = setInterval(checkAll, CHECK_INTERVAL)
    return () => clearInterval(intervalId)
  }, []) // mount once — the ref keeps this fresh without restarting the timer
}