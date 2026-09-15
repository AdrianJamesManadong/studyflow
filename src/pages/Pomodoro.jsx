import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Settings, RotateCcw, Play, Pause, SkipForward, Download, ChevronDown, ChevronUp, Cloud, HardDrive } from 'lucide-react'
import { supabase } from '../utils/supabase'

// Fix: outside component — never recreated
const DEFAULT_DURATIONS = {
  focus: 25 * 60,
  short: 5  * 60,
  long:  15 * 60,
}

const MODE_META = {
  focus: { label: 'Focus',       color: 'text-indigo-600 dark:text-indigo-400',  ring: 'stroke-indigo-500',  btn: 'bg-indigo-600 hover:bg-indigo-700',  dot: 'bg-indigo-500'  },
  short: { label: 'Short Break', color: 'text-emerald-600 dark:text-emerald-400', ring: 'stroke-emerald-500', btn: 'bg-emerald-600 hover:bg-emerald-700', dot: 'bg-emerald-500' },
  long:  { label: 'Long Break',  color: 'text-sky-600 dark:text-sky-400',     ring: 'stroke-sky-500',     btn: 'bg-sky-600 hover:bg-sky-700',         dot: 'bg-sky-500'     },
}

const HISTORY_LIMIT = 50

// Fix: outside component
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function sameDay(dateStr, ref) {
  return new Date(dateStr).toDateString() === ref.toDateString()
}

function dayLabel(d) {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Group a (already newest-first) history array into day buckets, preserving order.
function groupByDay(hist) {
  const groups = []
  let lastKey = null
  for (const h of hist) {
    const d = new Date(h.completedAt)
    const key = d.toDateString()
    if (key !== lastKey) {
      groups.push({ key, label: dayLabel(d), items: [] })
      lastKey = key
    }
    groups[groups.length - 1].items.push(h)
  }
  return groups
}

// Longest run of consecutive days (ending today or yesterday) with >=1 focus session.
function computeStreak(hist) {
  const days = new Set(hist.filter(h => h.mode === 'focus').map(h => new Date(h.completedAt).toDateString()))
  if (days.size === 0) return 0
  let streak = 0
  const cursor = new Date()
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1)
  while (days.has(cursor.toDateString())) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// ---- Local (guest) persistence — used when nobody's logged in ----
function readHistory() {
  try { return JSON.parse(localStorage.getItem('sf_pomodoro_history') || '[]') } catch { return [] }
}
function writeHistory(data) {
  try { localStorage.setItem('sf_pomodoro_history', JSON.stringify(data)) } catch {}
}
function readDurations() {
  try {
    const saved = JSON.parse(localStorage.getItem('sf_pomodoro_durations') || 'null')
    if (saved && typeof saved === 'object') return { ...DEFAULT_DURATIONS, ...saved }
  } catch {}
  return { ...DEFAULT_DURATIONS }
}
function writeDurations(data) {
  try { localStorage.setItem('sf_pomodoro_durations', JSON.stringify(data)) } catch {}
}
function readAutoStart() {
  try { return JSON.parse(localStorage.getItem('sf_pomodoro_autostart') || 'false') } catch { return false }
}
function writeAutoStart(val) {
  try { localStorage.setItem('sf_pomodoro_autostart', JSON.stringify(val)) } catch {}
}

// ---- Remote (Supabase) persistence — used when a user is logged in ----
async function fetchRemoteHistory(userId) {
  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('id, mode, completed_at, duration_sec, label')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(HISTORY_LIMIT)
  if (error) { console.error('pomodoro: fetch history failed', error); return [] }
  return data.map(row => ({
    id: row.id,
    mode: row.mode,
    completedAt: row.completed_at,
    durationSec: row.duration_sec,
    label: row.label,
  }))
}

async function insertRemoteSession(userId, entry) {
  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .insert({
      user_id: userId,
      mode: entry.mode,
      completed_at: entry.completedAt,
      duration_sec: entry.durationSec,
      label: entry.label,
    })
    .select('id')
    .single()
  if (error) { console.error('pomodoro: save session failed', error); return null }
  return data.id
}

async function clearRemoteHistory(userId) {
  const { error } = await supabase.from('pomodoro_sessions').delete().eq('user_id', userId)
  if (error) console.error('pomodoro: clear history failed', error)
}

function playBeep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.8)
  } catch {}
}

function requestNotifyPermission() {
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  } catch {}
}

function notify(completedMode) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const label = MODE_META[completedMode].label
    new Notification(`${label} complete!`, {
      body: completedMode === 'focus' ? "Nice work — take a break." : "Break's over — back to focus.",
    })
  } catch {}
}

function exportHistoryCSV(history) {
  const rows = [
    ['Mode', 'Completed At', 'Duration (min)', 'Task'],
    ...history.map(h => [
      MODE_META[h.mode]?.label ?? h.mode,
      h.completedAt,
      Math.round((h.durationSec || 0) / 60),
      h.label || '',
    ]),
  ]
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'pomodoro-history.csv'
  a.click()
  URL.revokeObjectURL(url)
}

const RADIUS        = 120
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function StatChip({ label, value, sub }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-center">
      <div className="text-xs text-gray-400 dark:text-gray-500">{label}</div>
      <div className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{sub}</div>
    </div>
  )
}

export default function Pomodoro() {
  const [mode, setMode]           = useState('focus')
  const [durations, setDurations] = useState(readDurations)
  const [timeLeft, setTimeLeft]   = useState(() => readDurations().focus)
  const [running, setRunning]     = useState(false)
  const [history, setHistory]     = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [userId, setUserId]       = useState(null)
  const [label, setLabel]         = useState('')
  const [autoStart, setAutoStart] = useState(readAutoStart)
  const [showSettings, setShowSettings] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [settingsForm, setSettingsForm] = useState({
    focus: DEFAULT_DURATIONS.focus / 60,
    short: DEFAULT_DURATIONS.short / 60,
    long:  DEFAULT_DURATIONS.long  / 60,
    autoStart: false,
  })

  const intervalRef  = useRef(null)
  const modeRef       = useRef(mode)
  const durationsRef  = useRef(durations)
  const labelRef      = useRef(label)
  const autoStartRef  = useRef(autoStart)
  const historyRef    = useRef(history)
  const userIdRef      = useRef(userId)
  const isSavingRef    = useRef(false) // guards against a session being saved twice (e.g. a leftover interval from hot-reload)

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { durationsRef.current = durations }, [durations])
  useEffect(() => { labelRef.current = label }, [label])
  useEffect(() => { autoStartRef.current = autoStart }, [autoStart])
  useEffect(() => { historyRef.current = history }, [history])
  useEffect(() => { userIdRef.current = userId }, [userId])

  // Load whoever's logged in (if anyone) and pull their history accordingly.
  // Logged in  -> Supabase, synced across devices.
  // Logged out -> localStorage, same as before, so guests still get a working timer.
  useEffect(() => {
    let cancelled = false
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      setUserId(user?.id ?? null)
      if (user?.id) {
        const remote = await fetchRemoteHistory(user.id)
        if (!cancelled) setHistory(remote)
      } else {
        setHistory(readHistory())
      }
      if (!cancelled) setHistoryLoading(false)
    }
    init()

    // Keep in sync if the user logs in/out while this component is mounted.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null
      setUserId(uid)
      if (uid) {
        fetchRemoteHistory(uid).then(remote => { if (!cancelled) setHistory(remote) })
      } else {
        setHistory(readHistory())
      }
    })

    return () => { cancelled = true; sub?.subscription?.unsubscribe() }
  }, [])

  // Derived stats — recomputed from history, so refreshing the page never loses progress.
  const stats = useMemo(() => {
    const now = new Date()
    const todayFocus = history.filter(h => h.mode === 'focus' && sameDay(h.completedAt, now))
    const todayMinutes = Math.round(todayFocus.reduce((s, h) => s + (h.durationSec || 0), 0) / 60)
    return {
      todayCount:    todayFocus.length,
      todayMinutes,
      allTimeFocus:  history.filter(h => h.mode === 'focus').length,
      streak:        computeStreak(history),
    }
  }, [history])

  const historyGroups = useMemo(() => groupByDay(history), [history])
  const visibleGroups = useMemo(() => {
    if (historyExpanded) return historyGroups
    let count = 0
    const out = []
    for (const g of historyGroups) {
      if (count >= 6) break
      const items = g.items.slice(0, 6 - count)
      out.push({ ...g, items })
      count += items.length
    }
    return out
  }, [historyGroups, historyExpanded])

  // Fix: handleComplete extracted as useCallback, reads latest values via refs to avoid stale closures.
  // Persists to Supabase when logged in, otherwise falls back to localStorage.
  // Also decides + applies the next mode (short vs. long break every 4th focus session) and,
  // if enabled, auto-starts it.
  const handleComplete = useCallback(async (completedMode) => {
    // If two timers somehow fire at once (e.g. a stray interval from hot-reload),
    // only the first one through the door actually saves.
    if (isSavingRef.current) return
    isSavingRef.current = true

    playBeep()
    notify(completedMode)

    const entry = {
      mode: completedMode,
      completedAt: new Date().toISOString(),
      durationSec: durationsRef.current[completedMode],
      label: completedMode === 'focus' ? (labelRef.current.trim() || null) : null,
    }

    // Decide the next mode from what we already have in memory, before persisting.
    let next = 'focus'
    if (completedMode === 'focus') {
      const now = new Date()
      const todayCount = historyRef.current.filter(h => h.mode === 'focus' && sameDay(h.completedAt, now)).length + 1
      next = todayCount % 4 === 0 ? 'long' : 'short'
      setLabel('')
    }

    if (userIdRef.current) {
      const id = await insertRemoteSession(userIdRef.current, entry)
      setHistory(h => [{ ...entry, id }, ...h].slice(0, HISTORY_LIMIT))
    } else {
      const updated = [entry, ...readHistory()].slice(0, HISTORY_LIMIT)
      setHistory(updated)
      writeHistory(updated)
    }

    setMode(next)
    setTimeLeft(durationsRef.current[next])
    setRunning(autoStartRef.current)
    isSavingRef.current = false
  }, [])

  useEffect(() => {
    if (!running) {
      clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current)
          setRunning(false)
          // Fix: schedule handleComplete outside the state updater to avoid side effects in pure updater
          setTimeout(() => handleComplete(modeRef.current), 0)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running, handleComplete])

  // Fix: update document title with countdown — standard Pomodoro UX
  useEffect(() => {
    const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
    const secs = String(timeLeft % 60).padStart(2, '0')
    document.title = running ? `${mins}:${secs} — ${MODE_META[mode].label}` : 'Pomodoro Timer'
    return () => { document.title = 'StudyFlow' }
  }, [timeLeft, running, mode])

  function switchMode(newMode) {
    clearInterval(intervalRef.current)
    setMode(newMode)
    setTimeLeft(durations[newMode])
    setRunning(false)
  }

  // Skip abandons the current session (not logged to history) and moves to the mode
  // that would follow if it *had* completed, so the short/long break cycle stays correct.
  function skip() {
    clearInterval(intervalRef.current)
    let next = 'focus'
    if (mode === 'focus') {
      next = (stats.todayCount + 1) % 4 === 0 ? 'long' : 'short'
    }
    setMode(next)
    setTimeLeft(durations[next])
    setRunning(false)
  }

  function reset() {
    clearInterval(intervalRef.current)
    setTimeLeft(durations[mode])
    setRunning(false)
  }

  function togglePlay() {
    requestNotifyPermission()
    setRunning(r => !r)
  }

  function openSettings() {
    setSettingsForm({
      focus: durations.focus / 60,
      short: durations.short / 60,
      long:  durations.long  / 60,
      autoStart,
    })
    setShowSettings(true)
  }

  function saveSettings() {
    const focus = Math.max(1, Math.min(99, parseInt(settingsForm.focus) || 25))
    const short = Math.max(1, Math.min(99, parseInt(settingsForm.short) || 5))
    const long  = Math.max(1, Math.min(99, parseInt(settingsForm.long)  || 15))
    const next  = { focus: focus * 60, short: short * 60, long: long * 60 }
    setDurations(next)
    writeDurations(next)
    setAutoStart(settingsForm.autoStart)
    writeAutoStart(settingsForm.autoStart)
    setTimeLeft(next[mode])
    setRunning(false)
    setShowSettings(false)
  }

  async function clearHistory() {
    if (!window.confirm("Clear all Pomodoro history? This can't be undone.")) return
    if (userIdRef.current) {
      await clearRemoteHistory(userIdRef.current)
    } else {
      writeHistory([])
    }
    setHistory([])
    setHistoryExpanded(false)
  }

  // Escape closes settings
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setShowSettings(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const current      = MODE_META[mode]
  const total        = durations[mode]
  const progress     = ((total - timeLeft) / total) * CIRCUMFERENCE
  const mins         = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs         = String(timeLeft % 60).padStart(2, '0')

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pomodoro Timer</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 flex items-center gap-1.5">
            {userId
              ? <><Cloud size={13} /> Synced to your account</>
              : <><HardDrive size={13} /> Saved on this device — log in to sync</>}
          </p>
        </div>
        <button
          onClick={openSettings}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          title="Customize durations"
        >
          <Settings size={14} /> Settings
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatChip label="Today" value={stats.todayCount} sub={`${stats.todayMinutes}m focused`} />
        <StatChip label="Streak" value={`${stats.streak}🔥`} sub={stats.streak > 0 ? 'day streak' : 'start today'} />
        <StatChip label="All-time" value={stats.allTimeFocus} sub="focus sessions" />
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
        {Object.entries(MODE_META).map(([key, val]) => (
          <button
            key={key}
            onClick={() => switchMode(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
              ${mode === key ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            {val.label}
          </button>
        ))}
      </div>

      {/* Timer ring */}
      <div className="flex flex-col items-center gap-6">
        {mode === 'focus' && (
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="What are you focusing on? (optional)"
            maxLength={60}
            className="w-full max-w-sm text-center bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-indigo-500 outline-none text-sm text-gray-600 dark:text-gray-300 py-1.5 transition-colors"
          />
        )}

        <div className="relative">
          <svg width="280" height="280" className="-rotate-90">
            <circle cx="140" cy="140" r={RADIUS} fill="none" className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="8" />
            <circle
              cx="140" cy="140" r={RADIUS}
              fill="none"
              className={current.ring}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE - progress}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-6xl font-bold tabular-nums ${current.color}`}>
              {mins}:{secs}
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-sm mt-1">{current.label}</span>
            <span className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
              {Math.round(((total - timeLeft) / total) * 100)}%
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={reset}
            className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-colors"
            title="Reset"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={togglePlay}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-lg transition-colors shadow-md ${current.btn}`}
          >
            {running ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="ml-1" />}
          </button>
          <button
            onClick={skip}
            className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-colors"
            title="Skip"
          >
            <SkipForward size={18} fill="currentColor" />
          </button>
        </div>
      </div>

      {/* Session dots */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${i < (stats.todayCount % 4 === 0 && stats.todayCount > 0 ? 4 : stats.todayCount % 4) ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}`}
          />
        ))}
        <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">
          {stats.todayCount} session{stats.todayCount !== 1 ? 's' : ''} today
        </span>
      </div>

      {/* History */}
      {historyLoading ? (
        <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">Loading history…</div>
      ) : history.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-900 dark:text-white font-semibold">History</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => exportHistoryCSV(history)}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center gap-1"
                title="Export as CSV"
              >
                <Download size={12} /> Export
              </button>
              <button
                onClick={clearHistory}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {visibleGroups.map(group => (
              <div key={group.key}>
                <div className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1.5">{group.label}</div>
                <div className="space-y-2">
                  {group.items.map((h, i) => (
                    <div key={h.id ?? i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${MODE_META[h.mode]?.dot ?? 'bg-gray-400'}`} />
                        <span className="text-gray-700 dark:text-gray-300 truncate">
                          {MODE_META[h.mode]?.label ?? h.mode}
                          {h.label ? <span className="text-gray-400 dark:text-gray-500"> · {h.label}</span> : null}
                        </span>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 shrink-0 ml-2">
                        {Math.round((h.durationSec || 0) / 60)}m · {timeAgo(h.completedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {historyGroups.reduce((s, g) => s + g.items.length, 0) > 6 && (
            <button
              onClick={() => setHistoryExpanded(e => !e)}
              className="mt-3 text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
            >
              {historyExpanded ? <>Show less <ChevronUp size={12} /></> : <>Show all ({history.length}) <ChevronDown size={12} /></>}
            </button>
          )}
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowSettings(false)}
        >
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-5 shadow-xl">
            <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Timer Settings</h3>

            {[
              { key: 'focus', label: 'Focus Duration'      },
              { key: 'short', label: 'Short Break Duration' },
              { key: 'long',  label: 'Long Break Duration'  },
            ].map(({ key, label: fieldLabel }) => (
              <div key={key}>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">{fieldLabel} (minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={settingsForm[key]}
                  onChange={e => setSettingsForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition"
                />
              </div>
            ))}

            <label className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settingsForm.autoStart}
                onChange={e => setSettingsForm(f => ({ ...f, autoStart: e.target.checked }))}
                className="w-4 h-4 rounded accent-indigo-600"
              />
              Auto-start the next session
            </label>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg py-2 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg py-2 text-sm shadow-sm transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}