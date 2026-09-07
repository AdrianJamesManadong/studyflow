import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  BarChart3,
  NotebookPen,
  Calendar,
  Timer,
  Bot,
  MessageCircle,
  Sparkles,
  User,
  Shield,
  X,
  LogOut,
  Menu,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'

const ADMIN_EMAIL = 'adrianjames082506@gmail.com'
const COLLAPSE_KEY = 'studyflow_sidebar_collapsed'

export default function Sidebar() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(COLLAPSE_KEY) === 'true'
  })

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed)
  }, [collapsed])

  const navItems = [
    { label: 'Dashboard',    Icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Subjects',     Icon: BookOpen,         path: '/dashboard/subjects' },
    { label: 'Assignments',  Icon: ClipboardList,    path: '/dashboard/assignments' },
    { label: 'Grades',       Icon: BarChart3,        path: '/dashboard/grades' },
    { label: 'Notes',        Icon: NotebookPen,      path: '/dashboard/notes' },
    { label: 'Calendar',     Icon: Calendar,         path: '/dashboard/calendar' },
    { label: 'Pomodoro',     Icon: Timer,            path: '/dashboard/pomodoro' },
    { label: 'AI Assistant', Icon: Bot,              path: '/dashboard/ai' },
    { label: 'Feedback',     Icon: MessageCircle,    path: '/dashboard/feedback' },
    { label: 'About',        Icon: Sparkles,         path: '/dashboard/about' },
    { label: 'Profile',      Icon: User,             path: '/dashboard/profile' },
    ...(user?.email === ADMIN_EMAIL ? [{ label: 'Admin', Icon: Shield, path: '/dashboard/admin' }] : []),
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
      <div className={`py-5 border-b border-gray-100 dark:border-gray-800 flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-6'}`}>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              <span className="text-indigo-600 dark:text-indigo-400">Study</span>Flow
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">Hey, {user?.name?.split(' ')[0]} 👋</p>
          </div>
        )}
        {collapsed && (
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            SF
          </div>
        )}
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
          aria-label="Close menu"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map(item => {
          const isActive = pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleNav}
              title={collapsed ? item.label : undefined}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                ${collapsed ? 'justify-center' : ''}
                ${isActive
                  ? 'bg-indigo-600 text-white font-medium shadow-sm shadow-indigo-200 dark:shadow-none'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <item.Icon size={17} className="flex-shrink-0" aria-hidden="true" />
              {!collapsed && <span className="truncate">{item.label}</span>}

              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-700 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User / Logout */}
      <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800">
        <div className={`flex items-center gap-3 px-3 py-2 mb-1 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 dark:text-white font-medium truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign out' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400 transition-colors
            ${collapsed ? 'justify-center' : 'text-left'}`}
        >
          <LogOut size={17} className="flex-shrink-0" aria-hidden="true" />
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white shadow-sm transition-colors"
        aria-label="Open menu"
      >
        <Menu size={18} aria-hidden="true" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={`lg:hidden fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 z-50 transform transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex lg:flex-col min-h-screen bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 relative transition-[width] duration-300 ease-in-out
        ${collapsed ? 'w-20' : 'w-64'}`}>
        {sidebarContent}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute top-6 -right-3 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-white hover:bg-indigo-600 hover:border-indigo-600 transition-colors shadow-md"
        >
          {collapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}
        </button>
      </aside>
    </>
  )
}