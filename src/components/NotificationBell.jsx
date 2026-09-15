import { useState, useRef, useEffect } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'

function getInitialPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied'
  return Notification.permission
}

export default function NotificationBell() {
  const [permission, setPermission] = useState(getInitialPermission)
  const [showTooltip, setShowTooltip] = useState(false)
  const supported = typeof window !== 'undefined' && 'Notification' in window
  const containerRef = useRef(null)

  // Close the popover on outside click or Escape — matches the pattern used
  // by the other overlays in the app.
  useEffect(() => {
    if (!showTooltip) return
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowTooltip(false)
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') setShowTooltip(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [showTooltip])

  async function requestPermission() {
    if (!supported) return
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') {
      new Notification('🎉 Notifications enabled!', {
        body: "You'll be reminded when assignments are due.",
        icon: '/favicon.ico',
      })
    }
  }

  if (!supported) return null

  const Icon = permission === 'granted' ? BellRing : permission === 'denied' ? BellOff : Bell
  const label =
    permission === 'granted' ? 'Notifications on' :
    permission === 'denied'  ? 'Notifications blocked' :
    'Enable notifications'

  function handleClick() {
    if (permission === 'granted') {
      setShowTooltip(t => !t)
    } else if (permission === 'denied') {
      setShowTooltip(t => !t) // show "how to unblock" info instead of no-op
    } else {
      requestPermission()
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleClick}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Icon aria-hidden="true" size={14} />
        <span className="hidden sm:inline">{label}</span>
      </button>

      {showTooltip && permission === 'granted' && (
        <div className="absolute right-0 top-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 w-56 z-50 shadow-xl">
          <p className="text-gray-900 dark:text-white text-xs font-medium mb-1 flex items-center gap-1.5">
            <BellRing aria-hidden="true" size={13} /> Notifications Active
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-xs">You'll be notified:</p>
          <ul className="text-gray-500 dark:text-gray-400 text-xs mt-1 space-y-0.5 list-disc list-inside">
            <li>1 day before due date</li>
            <li>1 hour before due date</li>
            <li>When overdue</li>
          </ul>
          <button
            onClick={() => setShowTooltip(false)}
            className="mt-2 text-xs text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
          >
            Close
          </button>
        </div>
      )}

      {showTooltip && permission === 'denied' && (
        <div className="absolute right-0 top-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 w-64 z-50 shadow-xl">
          <p className="text-gray-900 dark:text-white text-xs font-medium mb-1 flex items-center gap-1.5">
            <BellOff aria-hidden="true" size={13} /> Notifications blocked
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
            Your browser is blocking notifications for this site. Turn them back on from your browser's site settings, then reload the page.
          </p>
          <button
            onClick={() => setShowTooltip(false)}
            className="mt-2 text-xs text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}