import { useState } from 'react'

function getInitialPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied'
  return Notification.permission
}

export default function NotificationBell() {
  const [permission, setPermission] = useState(getInitialPermission)
  const [showTooltip, setShowTooltip] = useState(false)
  const supported = typeof window !== 'undefined' && 'Notification' in window

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

  const icon = permission === 'granted' ? '🔔' : '🔕'
  const label = permission === 'granted' ? 'Notifications on' : 'Enable notifications'

  return (
    <div className="relative">
      <button
        onClick={permission !== 'granted' ? requestPermission : () => setShowTooltip(t => !t)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        {icon} <span className="hidden sm:inline">{label}</span>
      </button>

      {showTooltip && permission === 'granted' && (
        <div className="absolute right-0 top-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 w-56 z-50 shadow-xl">
          <p className="text-gray-900 dark:text-white text-xs font-medium mb-1">🔔 Notifications Active</p>
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
    </div>
  )
}