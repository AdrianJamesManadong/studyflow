import { useState, useEffect, useRef, useCallback } from 'react'

// Fix: outside component — never recreated
const DEFAULT_DURATIONS = {
  focus: 25 * 60,
  short: 5  * 60,
  long:  15 * 60,
}

const MODE_META = {
  focus: { label: 'Focus',       color: 'text-indigo-400',  ring: 'stroke-indigo-500',  btn: 'bg-indigo-600 hover:bg-indigo-500'  },
  short: { label: 'Short Break', color: 'text-emerald-400', ring: 'stroke-emerald-500', btn: 'bg-emerald-600 hover:bg-emerald-500' },
  long:  { label: 'Long Break',  color: 'text-sky-400',     ring: 'stroke-sky-500',     btn: 'bg-sky-600 hover:bg-sky-500'         },
}

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

// Fix: safe localStorage helpers — won't crash on quota errors or SSR
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

const RADIUS        = 120
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function Pomodoro() {
  const [mode, setMode]           = useState('focus')
  const [durations, setDurations] = useState(readDurations)
  const [timeLeft, setTimeLeft]   = useState(() => readDurations().focus)
  const [running, setRunning]     = useState(false)
  const [sessions, setSessions]   = useState(0)
  const [history, setHistory]     = useState(readHistory)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState({
    focus: DEFAULT_DURATIONS.focus / 60,
    short: DEFAULT_DURATIONS.short / 60,
    long:  DEFAULT_DURATIONS.long  / 60,
  })

  const intervalRef = useRef(null)
  const sessionsRef = useRef(sessions)  // Fix: ref to always have latest sessions in closure

  // Keep ref in sync
  useEffect(() => { sessionsRef.current = sessions }, [sessions])

  // Fix: handleComplete extracted as useCallback, reads sessions from ref not closure
  const handleComplete = useCallback((completedMode) => {
    playBeep()
    if (completedMode === 'focus') {
      const newSessions = sessionsRef.current + 1
      setSessions(newSessions)
      const entry   = { mode: 'focus', completedAt: new Date().toISOString() }
      const updated = [entry, ...readHistory()].slice(0, 20)
      setHistory(updated)
      writeHistory(updated)
    }
  }, [])

  // Fix: effect only depends on `running` — mode change is handled by switchMode resetting state.
  // completedMode passed via ref to avoid stale closure.
  const modeRef = useRef(mode)
  useEffect(() => { modeRef.current = mode }, [mode])

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
    return () => { document.title = 'Pomodoro Timer' }
  }, [timeLeft, running, mode])

  function switchMode(newMode) {
    clearInterval(intervalRef.current)
    setMode(newMode)
    setTimeLeft(durations[newMode])
    setRunning(false)
  }

  function reset() {
    clearInterval(intervalRef.current)
    setTimeLeft(durations[mode])
    setRunning(false)
  }

  function openSettings() {
    setSettingsForm({
      focus: durations.focus / 60,
      short: durations.short / 60,
      long:  durations.long  / 60,
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
    setTimeLeft(next[mode])
    setRunning(false)
    setShowSettings(false)
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
    <div className="space-y-8 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Pomodoro Timer</h2>
          <p className="text-gray-400 text-sm mt-1">Stay focused, take breaks, get things done.</p>
        </div>
        <button
          onClick={openSettings}
          className="text-gray-500 hover:text-white text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg transition"
          title="Customize durations"
        >
          ⚙ Settings
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {Object.entries(MODE_META).map(([key, val]) => (
          <button
            key={key}
            onClick={() => switchMode(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition
              ${mode === key ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {val.label}
          </button>
        ))}
      </div>

      {/* Timer ring */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <svg width="280" height="280" className="-rotate-90">
            <circle cx="140" cy="140" r={RADIUS} fill="none" stroke="#1f2937" strokeWidth="8" />
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
            <span className="text-gray-500 text-sm mt-1">{current.label}</span>
            <span className="text-gray-600 text-xs mt-0.5">
              {Math.round(((total - timeLeft) / total) * 100)}%
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={reset}
            className="w-12 h-12 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition text-lg"
            title="Reset"
          >
            ↺
          </button>
          <button
            onClick={() => setRunning(r => !r)}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-lg transition shadow-lg ${current.btn}`}
          >
            {running ? '⏸' : '▶'}
          </button>
          <button
            onClick={() => switchMode(mode === 'focus' ? 'short' : 'focus')}
            className="w-12 h-12 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition text-lg"
            title="Skip"
          >
            ⏭
          </button>
        </div>
      </div>

      {/* Session dots */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition ${i < (sessions % 4) ? 'bg-indigo-500' : 'bg-gray-700'}`}
          />
        ))}
        <span className="text-gray-500 text-sm ml-2">
          {sessions} session{sessions !== 1 ? 's' : ''} today
        </span>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Recent Sessions</h3>
            <button
              onClick={() => { setHistory([]); writeHistory([]) }}
              className="text-xs text-gray-600 hover:text-red-400 transition"
            >
              Clear
            </button>
          </div>
          <div className="space-y-2">
            {history.slice(0, 5).map((h, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-gray-300">Focus session completed</span>
                </div>
                <span className="text-gray-500">{timeAgo(h.completedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowSettings(false)}
        >
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm space-y-5">
            <h3 className="text-white font-semibold text-lg">Timer Settings</h3>

            {[
              { key: 'focus', label: 'Focus Duration'      },
              { key: 'short', label: 'Short Break Duration' },
              { key: 'long',  label: 'Long Break Duration'  },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm text-gray-400 mb-1">{label} (minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={settingsForm[key]}
                  onChange={e => setSettingsForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            ))}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg py-2 text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg py-2 text-sm transition"
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