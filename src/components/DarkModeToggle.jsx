import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

/*
  Sun and moon are stacked in the same spot. The active one spins in while
  the other spins out and shrinks away, so the icon feels like it's changing
  form instead of being swapped.

  Props (both optional, so <DarkModeToggle /> works exactly like before):
    showLabel  show "Light mode" / "Dark mode" text next to the icon
    className  extra classes for the button
*/
export default function DarkModeToggle({ showLabel = false, className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const nextMode = isDark ? 'light' : 'dark'

  const iconBase =
    'absolute inset-0 transition-all duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextMode} mode`}
      title={`Switch to ${nextMode} mode`}
      className={`group flex items-center gap-2.5 text-xs font-medium rounded-lg px-3 py-1.5
        text-gray-500 dark:text-gray-400
        hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white
        active:scale-95 transition-all duration-200 motion-reduce:transition-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
        focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900
        ${className}`}
    >
      <span className="relative block w-[18px] h-[18px] flex-shrink-0 transition-transform duration-300 group-hover:rotate-12 motion-reduce:transition-none">
        <Sun
          size={18}
          aria-hidden="true"
          className={`${iconBase} text-amber-500 dark:text-amber-400 ${
            isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
          }`}
        />
        <Moon
          size={18}
          aria-hidden="true"
          className={`${iconBase} text-indigo-600 ${
            isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
          }`}
        />
      </span>

      {showLabel && <span className="whitespace-nowrap">{isDark ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  )
}