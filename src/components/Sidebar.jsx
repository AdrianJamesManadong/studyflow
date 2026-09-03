import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ADMIN_EMAIL = 'adrianjames082506@gmail.com'

export default function Sidebar() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const navItems = [
    { label: 'Dashboard', icon: '⊞', path: '/dashboard' },
    { label: 'Subjects', icon: '📚', path: '/dashboard/subjects' },
    { label: 'Assignments', icon: '📝', path: '/dashboard/assignments' },
    { label: 'Grades', icon: '📊', path: '/dashboard/grades' },
    { label: 'Notes', icon: '🗒️', path: '/dashboard/notes' },
    { label: 'Calendar', icon: '📅', path: '/dashboard/calendar' },
    { label: 'Pomodoro', icon: '⏱️', path: '/dashboard/pomodoro' },
    { label: 'AI Assistant', icon: '🤖', path: '/dashboard/ai' },
    { label: 'Feedback', icon: '💬', path: '/dashboard/feedback' },
    { label: 'About', icon: '✨', path: '/dashboard/about' },
    { label: 'Profile', icon: '👤', path: '/dashboard/profile' },
    ...(user?.email === ADMIN_EMAIL ? [{ label: 'Admin', icon: '🛡️', path: '/dashboard/admin' }] : []),
  ]

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function handleNav() {
    setOpen(false)
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">StudyFlow</h1>
          <p className="text-xs text-gray-500 mt-0.5">Hey, {user?.name?.split(' ')[0]} 👋</p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden text-gray-500 hover:text-white transition"
        >
          ✕
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const isActive = pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleNav}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition
                ${isActive
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User / Logout */}
      <div className="px-3 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 transition"
        >
          <span>🚪</span> Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition"
      >
        ☰
      </button>

      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={`lg:hidden fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-gray-800 z-50 transform transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </aside>

      <aside className="hidden lg:flex lg:flex-col w-64 min-h-screen bg-gray-900 border-r border-gray-800">
        {sidebarContent}
      </aside>
    </>
  )
}