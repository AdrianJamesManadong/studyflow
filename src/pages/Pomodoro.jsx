import { useState, useEffect, useRef } from 'react'

const MODES = {
  focus: { label: 'Focus', duration: 25 * 60, color: 'text-indigo-400', ring: 'stroke-indigo-500' },
  short: { label: 'Short Break', duration: 5 * 60, color: 'text-emerald-400', ring: 'stroke-emerald-500' },
  long: { label: 'Long Break', duration: 15 * 60, color: 'text-sky-400', ring: 'stroke-sky-500' },
}

export default function Pomodoro() {
  const [mode, setMode] = useState('focus')
  const [timeLeft, setTimeLeft] = useState(MODES.focus.duration)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sf_pomodoro_history') || '[]') } catch { return [] }
  })
  const intervalRef = useRef(null)
  const current = MODES[mode]

  // Timer logic
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            handleComplete()
            return 0
          }
          return t - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, mode])

  function handleComplete() {
    if (mode === 'focus') {
      const newSessions = sessions + 1
      setSessions(newSessions)
      const entry = { mode: 'focus', completedAt: new Date().toISOString() }
      const updated = [entry, ...history].slice(0, 20)
      setHistory(updated)
      localStorage.setItem('sf_pomodoro_history', JSON.stringify(updated))
    }
    // Play a subtle beep
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
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

  function switchMode(newMode) {
    setMode(newMode)
    setTimeLeft(MODES[newMode].duration)
    setRunning(false)
  }

  function reset() {
    setTimeLeft(MODES[mode].duration)
    setRunning(false)
  }

  // Format time
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')

  // SVG ring progress
  const total = MODES[mode].duration
  const radius = 120
  const circumference = 2 * Math.PI * radius
  const progress = ((total - timeLeft) / total) * circumference

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Pomodoro Timer</h2>
        <p className="text-gray-400 text-sm mt-1">Stay focused, take breaks, get things done.</p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {Object.entries(MODES).map(([key, val]) => (
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
            {/* Background ring */}
            <circle
              cx="140" cy="140" r={radius}
              fill="none"
              stroke="#1f2937"
              strokeWidth="8"
            />
            {/* Progress ring */}
            <circle
              cx="140" cy="140" r={radius}
              fill="none"
              className={current.ring}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>

          {/* Time display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-6xl font-bold tabular-nums ${current.color}`}>
              {mins}:{secs}
            </span>
            <span className="text-gray-500 text-sm mt-1">{current.label}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={reset}
            className="w-12 h-12 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition text-lg"
          >
            ↺
          </button>
          <button
            onClick={() => setRunning(r => !r)}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-lg transition shadow-lg
              ${running
                ? 'bg-gray-700 hover:bg-gray-600'
                : mode === 'focus' ? 'bg-indigo-600 hover:bg-indigo-500'
                : mode === 'short' ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-sky-600 hover:bg-sky-500'
              }`}
          >
            {running ? '⏸' : '▶'}
          </button>
          <button
            onClick={() => switchMode(mode === 'focus' ? 'short' : 'focus')}
            className="w-12 h-12 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition text-lg"
          >
            ⏭
          </button>
        </div>
      </div>

      {/* Session count */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition ${i < (sessions % 4) ? 'bg-indigo-500' : 'bg-gray-700'}`}
          />
        ))}
        <span className="text-gray-500 text-sm ml-2">{sessions} session{sessions !== 1 ? 's' : ''} today</span>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-3">Recent Sessions</h3>
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

    </div>
  )
}