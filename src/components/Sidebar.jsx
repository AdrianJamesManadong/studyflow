import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Bell,
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
  ChevronLeft,
} from 'lucide-react'

// UI-only gate: this just hides the Admin link. The real protection for admin
// pages/data must live server-side (Supabase RLS / policies), not here.
const ADMIN_EMAIL = 'adrianjames082506@gmail.com'
const COLLAPSE_KEY = 'studyflow_sidebar_collapsed'
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === 'true'
  } catch {
    return false
  }
}

// Same fallback chain the rest of the app uses (name -> user_metadata.name -> email prefix)
function getDisplayName(user) {
  return (
    user?.name?.trim() ||
    user?.user_metadata?.name?.trim() ||
    user?.email?.split('@')[0] ||
    ''
  )
}

/*
  Keeps Tab inside `containerRef` while `active`, moves focus in when it opens,
  and hands focus back to whatever had it before when it closes.
  The listener is on the container (not window) so a modal stacked on top of the
  drawer doesn't get its Tab key hijacked by the drawer's trap.
*/
function useFocusTrap(active, containerRef) {
  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    const previouslyFocused = document.activeElement
    const getFocusable = () =>
      Array.from(container.querySelectorAll(FOCUSABLE)).filter(el => el.getClientRects().length > 0)

    const onKeyDown = e => {
      if (e.key !== 'Tab') return
      const items = getFocusable()
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const current = document.activeElement
      if (!container.contains(current)) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && current === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && current === last) {
        e.preventDefault()
        first.focus()
      }
    }

    container.addEventListener('keydown', onKeyDown)

    // Move focus in (unless something inside already grabbed it, e.g. autoFocus)
    const raf = requestAnimationFrame(() => {
      if (!container.contains(document.activeElement)) getFocusable()[0]?.focus()
    })

    return () => {
      cancelAnimationFrame(raf)
      container.removeEventListener('keydown', onKeyDown)
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [active, containerRef])
}

/* Avatar lives outside the component so it doesn't remount on every render.
   Falls back to the initial if the image URL is missing or fails to load. */
function Avatar({ avatarUrl, name }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [avatarUrl])

  return avatarUrl && !failed ? (
    <img
      src={avatarUrl}
      alt=""
      onError={() => setFailed(true)}
      className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
      referrerPolicy="no-referrer"
    />
  ) : (
    <div
      aria-hidden="true"
      className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
    >
      {(name || 'U')[0].toUpperCase()}
    </div>
  )
}

/*
  Shared body for the desktop sidebar and the mobile drawer.
  Every icon sits at the same x-position (center of the 80px collapsed rail),
  so collapsing never makes icons jump. Only the labels fade.
*/
function SidebarBody({ groups, collapsed, user, name, pathname, onClose, onSignOut }) {
  const navRef = useRef(null)
  const linkRefs = useRef({})
  const [pill, setPill] = useState({ top: 0, height: 0, visible: false })
  const [animate, setAnimate] = useState(false)
  const [tip, setTip] = useState(null)

  const isActive = path =>
    path === '/dashboard' ? pathname === path : pathname === path || pathname.startsWith(path + '/')

  const activePath = groups.flat().find(i => isActive(i.path))?.path

  const measure = useCallback(() => {
    const el = activePath ? linkRefs.current[activePath] : null
    if (!el || el.offsetHeight === 0) {
      setPill(p => (p.visible ? { ...p, visible: false } : p))
      return
    }
    setPill(p =>
      p.top === el.offsetTop && p.height === el.offsetHeight && p.visible
        ? p
        : { top: el.offsetTop, height: el.offsetHeight, visible: true }
    )
  }, [activePath])

  useLayoutEffect(() => {
    measure()
  }, [measure, groups.length])

  // Re-measure if the nav gets resized (breakpoint change, collapse, etc.)
  useEffect(() => {
    if (!navRef.current || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(navRef.current)
    return () => ro.disconnect()
  }, [measure])

  // Turn transitions on only after first paint so the pill doesn't fly in from the top
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    setTip(null)
  }, [collapsed])

  // Tooltips are position:fixed so the scrolling nav can't clip them
  const showTip = (e, label) => {
    if (!collapsed) return
    const r = e.currentTarget.getBoundingClientRect()
    setTip({ label, top: r.top + r.height / 2, left: r.right + 16 })
  }
  const hideTip = () => setTip(null)

  const labelClass = `truncate whitespace-nowrap transition-opacity duration-200 motion-reduce:transition-none ${
    collapsed ? 'opacity-0' : 'opacity-100'
  }`

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-16 pl-[22px] pr-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm shadow-indigo-600/30">
          SF
        </div>
        <div
          className={`min-w-0 flex-1 overflow-hidden transition-opacity duration-200 motion-reduce:transition-none ${
            collapsed ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <h1 className="text-lg font-bold leading-tight text-gray-900 dark:text-white tracking-tight whitespace-nowrap">
            <span className="text-indigo-600 dark:text-indigo-400">Study</span>Flow
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            Hey, {name ? name.split(' ')[0] : 'there'} <span aria-hidden="true">👋</span>
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 -mr-1 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Close menu"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav
        ref={navRef}
        onScroll={hideTip}
        aria-label="Main"
        className="relative flex-1 px-3 py-3 overflow-y-auto overflow-x-hidden"
      >
        {/* One pill that glides to whichever page is active */}
        <span
          aria-hidden="true"
          className="absolute left-3 right-3 rounded-lg bg-indigo-600 shadow-md shadow-indigo-600/25 dark:shadow-none pointer-events-none"
          style={{
            top: pill.top,
            height: pill.height,
            opacity: pill.visible ? 1 : 0,
            transition: animate
              ? 'top 380ms cubic-bezier(0.3, 1.25, 0.5, 1), height 250ms ease, opacity 200ms ease'
              : 'none',
          }}
        />

        {groups.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && (
              <div className="h-5 flex items-center px-3" aria-hidden="true">
                <div className="h-px w-full bg-gray-100 dark:bg-gray-800" />
              </div>
            )}
            <div className="space-y-1">
              {group.map(item => {
                const active = isActive(item.path)
                return (
                  <Link
                    key={item.path}
                    ref={el => {
                      if (el) linkRefs.current[item.path] = el
                    }}
                    to={item.path}
                    aria-current={active ? 'page' : undefined}
                    onMouseEnter={e => showTip(e, item.label)}
                    onFocus={e => showTip(e, item.label)}
                    onMouseLeave={hideTip}
                    onBlur={hideTip}
                    className={`group relative z-10 flex items-center gap-3 h-10 pl-[19px] pr-3 rounded-lg text-sm transition-colors duration-200 motion-reduce:transition-none
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900
                      ${
                        active
                          ? 'text-white font-medium'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                      }`}
                  >
                    <item.Icon
                      size={18}
                      aria-hidden="true"
                      className={`flex-shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
                        active ? '' : 'group-hover:scale-110'
                      }`}
                    />
                    <span className={labelClass}>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User / Sign out */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3 h-12 pl-[10px] pr-3">
          <Avatar avatarUrl={user?.avatarUrl} name={name} />
          <div
            className={`flex-1 min-w-0 transition-opacity duration-200 motion-reduce:transition-none ${
              collapsed ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <p className="text-sm text-gray-900 dark:text-white font-medium truncate">{name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          onMouseEnter={e => showTip(e, 'Sign out')}
          onFocus={e => showTip(e, 'Sign out')}
          onMouseLeave={hideTip}
          onBlur={hideTip}
          className="group w-full flex items-center gap-3 h-10 pl-[19px] pr-3 mt-1 rounded-lg text-sm text-left text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <LogOut
            size={18}
            aria-hidden="true"
            className="flex-shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none"
          />
          <span className={labelClass}>Sign out</span>
        </button>
      </div>

      {/* Collapsed-rail tooltip */}
      {tip && (
        <div
          role="tooltip"
          className="sf-tip pointer-events-none fixed z-[70] whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
          style={{ top: tip.top, left: tip.left }}
        >
          {tip.label}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')

  const drawerRef = useRef(null)
  const modalRef = useRef(null)

  const name = getDisplayName(user)
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL

  const groups = useMemo(
    () => [
      [
        { label: 'Dashboard', Icon: LayoutDashboard, path: '/dashboard' },
        { label: 'Subjects', Icon: BookOpen, path: '/dashboard/subjects' },
        { label: 'Assignments', Icon: ClipboardList, path: '/dashboard/assignments' },
        { label: 'Reminders', Icon: Bell, path: '/dashboard/reminders' },
        { label: 'Grades', Icon: BarChart3, path: '/dashboard/grades' },
      ],
      [
        { label: 'Notes', Icon: NotebookPen, path: '/dashboard/notes' },
        { label: 'Calendar', Icon: Calendar, path: '/dashboard/calendar' },
        { label: 'Pomodoro', Icon: Timer, path: '/dashboard/pomodoro' },
        { label: 'AI Assistant', Icon: Bot, path: '/dashboard/ai' },
      ],
      [
        { label: 'Feedback', Icon: MessageCircle, path: '/dashboard/feedback' },
        { label: 'About', Icon: Sparkles, path: '/dashboard/about' },
        { label: 'Profile', Icon: User, path: '/dashboard/profile' },
        ...(isAdmin ? [{ label: 'Admin', Icon: Shield, path: '/dashboard/admin' }] : []),
      ],
    ],
    [isAdmin]
  )

  // Keyboard users get a focus trap + focus restore in the drawer and the modal
  useFocusTrap(open, drawerRef)
  useFocusTrap(showSignOutConfirm, modalRef)

  // Remember collapsed state
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, String(collapsed))
    } catch {
      /* storage unavailable, ignore */
    }
  }, [collapsed])

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // If the window grows past the lg breakpoint while the drawer is open, close it
  // (otherwise the body scroll lock would stay on with no visible drawer).
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = e => {
      if (e.matches) setOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Lock page scroll behind the drawer / modal (restores whatever it was before)
  useEffect(() => {
    if (!open && !showSignOutConfirm) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open, showSignOutConfirm])

  // Escape closes the modal first, then the drawer
  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape') return
      if (showSignOutConfirm) {
        if (!signingOut) setShowSignOutConfirm(false)
      } else if (open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, showSignOutConfirm, signingOut])

  function openSignOut() {
    setSignOutError('')
    setShowSignOutConfirm(true)
  }

  async function handleConfirmLogout() {
    if (signingOut) return
    setSigningOut(true)
    setSignOutError('')
    try {
      await logout()
      setSigningOut(false)
      setShowSignOutConfirm(false)
      // replace: so the Back button can't return to the dashboard after signing out
      navigate('/login', { replace: true })
    } catch {
      setSignOutError("Couldn't sign you out. Check your connection and try again.")
      setSigningOut(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes sf-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sf-pop {
          from { opacity: 0; transform: translateY(10px) scale(0.96) }
          to   { opacity: 1; transform: none }
        }
        @keyframes sf-tip {
          from { opacity: 0; transform: translate(-6px, -50%) }
          to   { opacity: 1; transform: translate(0, -50%) }
        }
        .sf-fade { animation: sf-fade 200ms ease-out both }
        .sf-pop  { animation: sf-pop 260ms cubic-bezier(0.2, 0.9, 0.3, 1.15) both }
        .sf-tip  { animation: sf-tip 150ms ease-out both }
        @media (prefers-reduced-motion: reduce) {
          .sf-fade, .sf-pop, .sf-tip { animation: none }
        }
      `}</style>

      {/* Mobile menu button */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 w-10 h-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white active:scale-95 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu size={18} aria-hidden="true" />
      </button>

      {/* Mobile overlay (always mounted so it can fade both ways) */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Mobile drawer: never collapsed, `invisible` keeps it out of the tab order while closed */}
      <aside
        ref={drawerRef}
        aria-hidden={!open}
        className={`lg:hidden fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 z-50 transform transition-[transform,visibility] duration-300 ease-out motion-reduce:transition-none
          ${open ? 'translate-x-0 visible shadow-2xl' : '-translate-x-full invisible'}`}
      >
        <SidebarBody
          groups={groups}
          collapsed={false}
          user={user}
          name={name}
          pathname={pathname}
          onClose={() => setOpen(false)}
          onSignOut={openSignOut}
        />
      </aside>

      {/* Desktop sidebar: sticky + full viewport height so the user/sign-out
          block stays on screen even when the page content is long. */}
      <aside
        className={`hidden lg:flex lg:flex-col flex-shrink-0 sticky top-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 transition-[width] duration-300 ease-in-out motion-reduce:transition-none
          ${collapsed ? 'w-20' : 'w-64'}`}
      >
        <SidebarBody
          groups={groups}
          collapsed={collapsed}
          user={user}
          name={name}
          pathname={pathname}
          onSignOut={openSignOut}
        />

        {/* Collapse toggle: one chevron that rotates */}
        <button
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className="absolute top-5 -right-3 z-10 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-white hover:bg-indigo-600 hover:border-indigo-600 active:scale-90 transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <ChevronLeft
            size={14}
            aria-hidden="true"
            className={`transition-transform duration-300 motion-reduce:transition-none ${
              collapsed ? 'rotate-180' : ''
            }`}
          />
        </button>
      </aside>

      {/* Sign out confirmation modal */}
      {showSignOutConfirm && (
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-title"
          aria-describedby="signout-desc"
          onClick={e => {
            if (e.target === e.currentTarget && !signingOut) setShowSignOutConfirm(false)
          }}
          className="sf-fade fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
        >
          <div className="sf-pop w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6">
              <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center mb-4">
                <LogOut size={20} className="text-red-500" aria-hidden="true" />
              </div>
              <h3 id="signout-title" className="text-base font-bold text-gray-900 dark:text-white mb-1">
                Sign out?
              </h3>
              <p id="signout-desc" className="text-sm text-gray-500 dark:text-gray-400">
                You'll need to sign in again to get back to your dashboard.
              </p>
              {signOutError && (
                <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
                  {signOutError}
                </p>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                autoFocus
                onClick={() => setShowSignOutConfirm(false)}
                disabled={signingOut}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                disabled={signingOut}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {signingOut ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin motion-reduce:animate-none"
                    />
                    Signing out…
                  </>
                ) : (
                  'Sign out'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}