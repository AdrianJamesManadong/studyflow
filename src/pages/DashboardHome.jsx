import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useSubjects } from '../hooks/useSubjects'
import { useAssignments } from '../hooks/useAssignments'
import { useNotes } from '../hooks/useNotes'
import { useGrades } from '../hooks/useGrades'
import { useMemo, useEffect, useState, useCallback, useRef } from 'react'
import { DashboardSkeleton } from '../components/Skeleton'
import { supabase } from '../utils/supabase'
import {
  BookOpen,
  ClipboardList,
  BarChart3,
  NotebookPen,
  Timer,
  Bot,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Server,
  ArrowRight,
  PartyPopper,
  Check,
} from 'lucide-react'

/* ─── animation helper ─── */
const fadeUp = (delay = 0) => ({
  animation: `fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms both`,
})

/* ─── stable color map (outside component — never recreated) ───
   Light "StudyFlow Professional Palette" — mirrors Login/Register/GuideModal
   + dark variants added directly into the class strings */
const COLOR_MAP = {
  indigo:  { card: 'border-indigo-100 hover:border-indigo-300 dark:border-indigo-900 dark:hover:border-indigo-700',   glow: 'rgba(79,70,229,0.10)',   accent: 'text-indigo-600 dark:text-indigo-400',  bar: 'bg-indigo-600'  },
  amber:   { card: 'border-amber-100 hover:border-amber-300 dark:border-amber-900 dark:hover:border-amber-700',     glow: 'rgba(245,158,11,0.10)',  accent: 'text-amber-600 dark:text-amber-400',   bar: 'bg-amber-500'   },
  emerald: { card: 'border-emerald-100 hover:border-emerald-300 dark:border-emerald-900 dark:hover:border-emerald-700', glow: 'rgba(34,197,94,0.10)',   accent: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' },
  violet:  { card: 'border-violet-100 hover:border-violet-300 dark:border-violet-900 dark:hover:border-violet-700',   glow: 'rgba(124,58,237,0.10)',  accent: 'text-violet-600 dark:text-violet-400',  bar: 'bg-violet-600'  },
}

/* ─── stable ann config (outside component) ─── */
const ANN_CONFIG = {
  info:    { Icon: Server,        dotColor: 'bg-blue-500',    topBg: 'bg-blue-50 dark:bg-blue-950/40',    fromColor: 'text-blue-600 dark:text-blue-400',    iconColor: 'text-blue-600 dark:text-blue-400'    },
  warning: { Icon: AlertTriangle, dotColor: 'bg-amber-500',   topBg: 'bg-amber-50 dark:bg-amber-950/40',   fromColor: 'text-amber-600 dark:text-amber-400',   iconColor: 'text-amber-600 dark:text-amber-400'   },
  success: { Icon: CheckCircle2,  dotColor: 'bg-emerald-500', topBg: 'bg-emerald-50 dark:bg-emerald-950/40', fromColor: 'text-emerald-600 dark:text-emerald-400', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  danger:  { Icon: AlertCircle,   dotColor: 'bg-red-500',     topBg: 'bg-red-50 dark:bg-red-950/40',     fromColor: 'text-red-600 dark:text-red-400',     iconColor: 'text-red-600 dark:text-red-400'     },
}

/* ─── stable quick actions (outside component) ─── */
const QUICK_ACTIONS = [
  { label: 'Add Subject',    Icon: BookOpen,      path: '/dashboard/subjects'    },
  { label: 'New Assignment', Icon: ClipboardList, path: '/dashboard/assignments' },
  { label: 'Log Grade',      Icon: BarChart3,     path: '/dashboard/grades'      },
  { label: 'Write Note',     Icon: NotebookPen,   path: '/dashboard/notes'       },
  { label: 'Pomodoro Timer', Icon: Timer,         path: '/dashboard/pomodoro'    },
  { label: 'AI Assistant',   Icon: Bot,           path: '/dashboard/ai'          },
]

/* ─── pure helpers (outside component) ─── */
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

function getFirstName(user) {
  const name = user?.user_metadata?.name
  if (name && name.trim()) return name.trim().split(/\s+/)[0]
  const email = user?.email
  if (email) return email.split('@')[0]
  return 'Student'
}

// Returns start-of-today as a fresh Date (recalculated each call)
function getTodayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export default function DashboardHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { subjects, loading: subjectsLoading } = useSubjects()
  const { assignments, loading: assignmentsLoading, markDone } = useAssignments()
  const { notes, loading: notesLoading } = useNotes()
  // FIX #1: pull the raw `grades` array out too, so we have a stable, correct
  // dependency for the average-grade memo below (previously only `assignments`
  // was in the deps, so logging/editing a grade without an assignment change
  // in the same tick left this card showing a stale average).
  const { grades, getOverallAverage, getLetterGrade, loading: gradesLoading } = useGrades()

  const isLoading = subjectsLoading || assignmentsLoading || notesLoading || gradesLoading

  const [announcements, setAnnouncements] = useState([])
  const [annLoading, setAnnLoading]       = useState(true)
  const [annError, setAnnError]           = useState(false)
  const [hoveredStat, setHoveredStat]     = useState(null)
  const [completingId, setCompletingId]   = useState(null)

  // Fix: use a ref to track mount state — prevents setState on unmounted component
  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  // Fix: store as a millisecond timestamp (primitive number) so useMemo dep comparisons
  // are stable — a new Date() object would never be strictly equal to the previous one,
  // causing all downstream memos to recompute every render even when the day hasn't changed.
  // We re-derive a Date inside each memo via `new Date(todayStartMs)` where needed.
  const todayStartMs = getTodayStart().getTime()

  // Announcements fetch with unmount-safe cleanup + error state
  useEffect(() => {
    let cancelled = false
    setAnnLoading(true)
    setAnnError(false)
    supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setAnnError(true)
        else if (data) setAnnouncements(data)
        setAnnLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Memoised derived data
  const pendingAssignments = useMemo(
    () => assignments.filter(a => a.status !== 'done'),
    [assignments]
  )

  const overdueAssignments = useMemo(
    () => { const t = new Date(todayStartMs); return pendingAssignments.filter(a => new Date(a.due_date) < t) },
    [pendingAssignments, todayStartMs]
  )

  const dueTodayAssignments = useMemo(
    () => pendingAssignments.filter(a => {
      const d = new Date(a.due_date)
      d.setHours(0, 0, 0, 0)
      return d.getTime() === todayStartMs
    }),
    [pendingAssignments, todayStartMs]
  )

  const upcoming = useMemo(
    () => assignments
      .filter(a => a.status !== 'done' && new Date(a.due_date) >= new Date(todayStartMs))
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 5),
    [assignments, todayStartMs]
  )

  // FIX #1: `grades` is now in the dependency array. getOverallAverage() itself
  // is still called inside the memo rather than being a dep (its reference may
  // not be stable if useGrades doesn't wrap it in useCallback), but now the
  // memo actually recomputes whenever the underlying grades data changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const overallAverage = useMemo(() => getOverallAverage(), [assignments, grades])
  const overallFloat   = useMemo(
    () => (overallAverage ? parseFloat(overallAverage) : null),
    [overallAverage]
  )

  // Fix: same pattern for getLetterGrade — call inside memo, depend on the value not the fn
  const letterGrade = useMemo(
    () => (overallFloat != null ? getLetterGrade(overallFloat) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overallFloat]
  )

  const getDaysUntil = useCallback((dateStr) => {
    const due = new Date(dateStr)
    due.setHours(0, 0, 0, 0)
    const diff = Math.round((due.getTime() - todayStartMs) / (1000 * 60 * 60 * 24))
    if (diff === 0) return { label: 'Today',    color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800' }
    if (diff === 1) return { label: 'Tomorrow', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800' }
    if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800' }
    return { label: `${diff}d left`, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700' }
  }, [todayStartMs])

  // Fix: use isMounted ref to avoid setState after unmount on slow markDone calls
  const handleMarkDone = useCallback(async (e, id) => {
    e.stopPropagation()
    if (typeof markDone !== 'function') return   // guard: hook must expose markDone
    setCompletingId(id)
    try {
      await markDone(id)
    } catch (err) {
      console.error('Failed to mark assignment done:', err)
    } finally {
      if (isMounted.current) setCompletingId(null)
    }
  }, [markDone])

  const stats = useMemo(() => [
    {
      label: 'Subjects',
      value: subjects.length,
      Icon: BookOpen,
      color: 'indigo',
      path: '/dashboard/subjects',
      sub: subjects.length === 0 ? '→ Add your first subject' : `${subjects.length} active`,
    },
    {
      label: 'Assignments Due',
      value: pendingAssignments.length,
      Icon: ClipboardList,
      color: 'amber',
      path: '/dashboard/assignments',
      sub: overdueAssignments.length > 0
        ? `${overdueAssignments.length} overdue`
        : dueTodayAssignments.length > 0
          ? `${dueTodayAssignments.length} due today`
          : 'All caught up!',
      subColor: overdueAssignments.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Average Grade',
      value: overallAverage ? `${overallAverage}%` : '—',
      Icon: BarChart3,
      color: 'emerald',
      path: '/dashboard/grades',
      sub: letterGrade ?? '→ Log your first grade',
      subColor: letterGrade ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500',
    },
    {
      label: 'Notes',
      value: notes.length,
      Icon: NotebookPen,
      color: 'violet',
      path: '/dashboard/notes',
      sub: notes.length === 0 ? '→ Start writing' : `${notes.length} saved`,
    },
  ], [subjects, pendingAssignments, overdueAssignments, dueTodayAssignments, overallAverage, letterGrade, notes])

  const firstName = useMemo(() => getFirstName(user), [user])

  if (isLoading) return <DashboardSkeleton />

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .6; transform: scale(1.4); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes spin-check {
          from { transform: scale(0) rotate(-45deg); opacity: 0; }
          to   { transform: scale(1) rotate(0deg);   opacity: 1; }
        }
        .stat-card { transition: transform .2s cubic-bezier(.22,1,.36,1), box-shadow .2s ease; }
        .stat-card:hover  { transform: translateY(-3px) scale(1.025); }
        .stat-card:active { transform: scale(.97); }
        .action-btn { transition: transform .18s cubic-bezier(.22,1,.36,1), background .18s, border-color .18s; }
        .action-btn:hover  { transform: translateY(-2px); }
        .action-btn:active { transform: scale(.95); }
        .row-item { transition: border-color .2s, background .2s, transform .15s; }
        .row-item:hover, .row-item:focus-visible { transform: translateX(3px); }
        .row-item:focus-visible { outline: 2px solid rgba(79,70,229,0.5); outline-offset: 2px; }
        .ann-card { transition: transform .2s ease, box-shadow .2s ease; }
        .ann-card:hover { transform: translateY(-1px); }
        .done-btn { transition: color .15s, background .15s, transform .15s; }
        .done-btn:hover { transform: scale(1.15); }
      `}</style>

      <div className="space-y-8 max-w-5xl mx-auto pb-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between" style={fadeUp(0)}>
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              Good {getGreeting()}, {firstName}
              <Sparkles aria-hidden="true" size={22} className="text-amber-500" />
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {' · '}Here's what's going on with your studies.
            </p>
          </div>
          {overdueAssignments.length > 0 && (
            <button
              onClick={() => navigate('/dashboard/assignments')}
              className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm px-4 py-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-950/60 hover:border-red-300 dark:hover:border-red-700 transition-all duration-200 hover:-translate-y-0.5"
            >
              <AlertTriangle
                aria-hidden="true"
                size={16}
                style={{ animation: 'pulse-dot 1.5s ease-in-out infinite', display: 'inline-block' }}
              />
              {overdueAssignments.length} overdue
            </button>
          )}
        </div>

        {/* ── Announcements ── */}
        {annLoading && (
          <div className="space-y-2.5" style={fadeUp(60)}>
            {[1, 2].map(n => (
              <div key={n} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl h-16 animate-pulse" />
            ))}
          </div>
        )}

        {annError && !annLoading && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-2" style={fadeUp(60)}>
            <AlertTriangle aria-hidden="true" size={14} />
            Couldn't load announcements. Check your connection.
          </div>
        )}

        {!annLoading && !annError && announcements.length > 0 && (
          <div className="space-y-2.5" style={fadeUp(60)}>
            {announcements.map((a, i) => {
              const cfg = ANN_CONFIG[a.type] ?? ANN_CONFIG.info
              const ts = new Date(a.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })
              return (
                <div
                  key={a.id}
                  className="ann-card bg-white/90 dark:bg-gray-800/90 backdrop-blur border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm"
                  style={fadeUp(60 + i * 40)}
                >
                  <div className={`flex items-center gap-2 px-3.5 py-2 border-b border-gray-100 dark:border-gray-700 ${cfg.topBg}`}>
                    <span
                      aria-hidden="true"
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotColor}`}
                      style={{ animation: 'pulse-dot 2s ease-in-out infinite' }}
                    />
                    <ShieldCheck aria-hidden="true" size={12} className={cfg.fromColor} />
                    <span className={`text-[11px] font-semibold uppercase tracking-widest ${cfg.fromColor}`}>
                      System · Admin
                    </span>
                    <span className="flex-1" />
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">{ts}</span>
                  </div>
                  <div className="flex gap-3 items-start px-3.5 py-3">
                    <cfg.Icon aria-hidden="true" size={18} className={`flex-shrink-0 mt-0.5 ${cfg.iconColor}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">{a.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{a.message}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat, i) => {
            const c = COLOR_MAP[stat.color]
            const isHovered = hoveredStat === stat.label
            return (
              <button
                key={stat.label}
                onClick={() => navigate(stat.path)}
                onMouseEnter={() => setHoveredStat(stat.label)}
                onMouseLeave={() => setHoveredStat(null)}
                className={`stat-card relative rounded-2xl p-5 text-left border bg-white dark:bg-gray-800 backdrop-blur overflow-hidden ${c.card}`}
                style={{
                  ...fadeUp(120 + i * 50),
                  boxShadow: isHovered
                    ? `0 0 0 1px ${c.glow.replace('0.10', '0.28')}, 0 8px 32px ${c.glow.replace('0.10', '0.18')}`
                    : `0 1px 3px rgba(31,41,55,0.06), 0 0 0 1px ${c.glow}`,
                }}
              >
                <div
                  className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl transition-opacity duration-300"
                  style={{ background: c.glow.replace('0.10', '0.5'), opacity: isHovered ? 0.6 : 0.25 }}
                />
                <div className="relative">
                  <stat.Icon
                    aria-hidden="true"
                    size={24}
                    className={`block mb-3 ${c.accent}`}
                    style={{ animation: isHovered ? 'float 2s ease-in-out infinite' : 'none' }}
                  />
                  <div className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">{stat.value}</div>
                  <div className={`text-xs font-semibold mt-1 uppercase tracking-wider ${c.accent}`}>{stat.label}</div>
                  {stat.sub && (
                    <div className={`text-xs mt-1.5 ${stat.subColor || 'text-gray-400 dark:text-gray-500'}`}>
                      {stat.sub}
                    </div>
                  )}
                </div>
                <div
                  className={`absolute bottom-0 left-0 h-0.5 ${c.bar} transition-all duration-300`}
                  style={{ width: isHovered ? '100%' : '0%' }}
                />
              </button>
            )
          })}
        </div>

        {/* ── Quick Actions ── */}
        <div style={fadeUp(340)}>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
            {QUICK_ACTIONS.map((action, i) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="action-btn group flex flex-col items-center gap-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 rounded-2xl px-3 py-4 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-center shadow-sm"
                style={fadeUp(340 + i * 30)}
              >
                <action.Icon
                  aria-hidden="true"
                  size={22}
                  className="transition-transform duration-200 group-hover:scale-110"
                />
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Upcoming Assignments ── */}
        <div style={fadeUp(520)}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Upcoming Assignments
            </h3>
            {upcoming.length > 0 && (
              <button
                onClick={() => navigate('/dashboard/assignments')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1 group"
              >
                View all
                <ArrowRight aria-hidden="true" size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            )}
          </div>

          {upcoming.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-10 text-center shadow-sm">
              <PartyPopper
                aria-hidden="true"
                size={36}
                className="mb-3 block mx-auto text-indigo-600 dark:text-indigo-400"
                style={{ animation: 'float 3s ease-in-out infinite' }}
              />
              <p className="text-gray-900 dark:text-white font-semibold">You're all caught up!</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">No upcoming assignments. Enjoy the free time!</p>
              <button
                onClick={() => navigate('/dashboard/assignments')}
                className="mt-4 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-4 py-2 rounded-xl transition-all hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:-translate-y-0.5"
              >
                + Add Assignment
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((a, i) => {
                const { label: daysLabel, color: daysColor, bg: daysBg } = getDaysUntil(a.due_date)
                const isCompleting = completingId === a.id
                return (
                  // FIX #3: was a plain <div onClick>. Now a real interactive
                  // element — role="button" + tabIndex so it's keyboard-reachable,
                  // onKeyDown for Enter/Space activation, and a visible focus ring
                  // (see .row-item:focus-visible in the <style> block above).
                  <div
                    key={a.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate('/dashboard/assignments')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate('/dashboard/assignments')
                      }
                    }}
                    className="row-item bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 rounded-2xl px-5 py-3.5 flex items-center justify-between cursor-pointer shadow-sm group"
                    style={fadeUp(520 + i * 40)}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Quick-complete — only renders if useAssignments exposes markDone */}
                      {typeof markDone === 'function' && (
                        <button
                          onClick={(e) => handleMarkDone(e, a.id)}
                          disabled={isCompleting}
                          title="Mark as done"
                          aria-label={`Mark "${a.title}" as done`}
                          className={`done-btn w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0
                            ${a.priority === 'high'   ? 'border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-400 dark:hover:border-red-700' :
                              a.priority === 'medium' ? 'border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-400 dark:hover:border-amber-700' :
                              'border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-400 dark:hover:border-emerald-700'}
                            ${isCompleting ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          {isCompleting && (
                            <Check
                              aria-hidden="true"
                              size={10}
                              className="text-emerald-600 dark:text-emerald-400"
                              style={{ animation: 'spin-check 0.3s ease-out both' }}
                            />
                          )}
                        </button>
                      )}

                      <div>
                        <p className="text-sm text-gray-900 dark:text-white font-medium group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                          {a.title}
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                          {a.subject_name?.trim() && <span className="text-gray-500 dark:text-gray-400">{a.subject_name.trim()} · </span>}
                          Due {new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${daysBg} ${daysColor}`}>
                        {daysLabel}
                      </span>
                      <span className={`text-xs px-2.5 py-1 rounded-full capitalize border
                        ${a.priority === 'high'   ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' :
                          a.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' :
                          'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'}`}>
                        {a.priority}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </>
  )
}