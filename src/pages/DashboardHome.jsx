import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useSubjects } from '../hooks/useSubjects'
import { useAssignments } from '../hooks/useAssignments'
import { useNotes } from '../hooks/useNotes'
import { useGrades } from '../hooks/useGrades'
import { useMemo, useEffect, useState } from 'react'
import { DashboardSkeleton } from '../components/Skeleton'
import { supabase } from '../utils/supabase'

export default function DashboardHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { subjects, loading: subjectsLoading } = useSubjects()
  const { assignments, loading: assignmentsLoading } = useAssignments()
  const { notes, loading: notesLoading } = useNotes()
  const { getOverallAverage, getLetterGrade, loading: gradesLoading } = useGrades()
  const isLoading = subjectsLoading || assignmentsLoading || notesLoading || gradesLoading

  const [announcements, setAnnouncements] = useState([])

  useEffect(() => {
    supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => { if (data) setAnnouncements(data) })
  }, [])

  const today = useMemo(() => new Date(), [])
  const todayStr = today.toDateString()

  const pendingAssignments = assignments.filter(a => a.status !== 'done')
  const overdueAssignments = pendingAssignments.filter(a => new Date(a.due_date) < today)
  const dueTodayAssignments = pendingAssignments.filter(
    a => new Date(a.due_date).toDateString() === todayStr
  )
  const overall = getOverallAverage()

  const stats = [
    {
      label: 'Subjects',
      value: subjects.length,
      icon: '📚',
      color: 'indigo',
      path: '/dashboard/subjects',
      sub: subjects.length === 0 ? 'Add your first subject' : `${subjects.length} active`,
    },
    {
      label: 'Assignments Due',
      value: pendingAssignments.length,
      icon: '📝',
      color: 'amber',
      path: '/dashboard/assignments',
      sub: overdueAssignments.length > 0
        ? `${overdueAssignments.length} overdue`
        : dueTodayAssignments.length > 0
          ? `${dueTodayAssignments.length} due today`
          : 'All caught up!',
      subColor: overdueAssignments.length > 0 ? 'text-red-400' : 'text-emerald-400',
    },
    {
      label: 'Average Grade',
      value: overall ? `${overall}%` : '—',
      icon: '📊',
      color: 'emerald',
      path: '/dashboard/grades',
      sub: overall ? getLetterGrade(parseFloat(overall)) : 'No grades yet',
      subColor: overall ? 'text-emerald-400' : 'text-gray-500',
    },
    {
      label: 'Notes',
      value: notes.length,
      icon: '🗒️',
      color: 'purple',
      path: '/dashboard/notes',
      sub: notes.length === 0 ? 'Start writing' : `${notes.length} saved`,
    },
  ]

  const colorMap = {
    indigo: 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500/40',
    amber:  'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/40',
    emerald:'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40',
    purple: 'bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/40',
  }

  const quickActions = [
    { label: 'Add Subject',    icon: '📚', path: '/dashboard/subjects' },
    { label: 'New Assignment', icon: '📝', path: '/dashboard/assignments' },
    { label: 'Log Grade',      icon: '📊', path: '/dashboard/grades' },
    { label: 'Write Note',     icon: '🗒️', path: '/dashboard/notes' },
    { label: 'Pomodoro Timer', icon: '🍅', path: '/dashboard/pomodoro' },
    { label: 'AI Assistant',   icon: '🤖', path: '/dashboard/ai' },
  ]

  const upcoming = assignments
    .filter(a => a.status !== 'done' && new Date(a.due_date) >= new Date(todayStr))
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5)

  const getDaysUntil = (dateStr) => {
    const diff = Math.ceil((new Date(dateStr) - new Date(todayStr)) / (1000 * 60 * 60 * 24))
    if (diff === 0) return { label: 'Today', color: 'text-amber-400' }
    if (diff === 1) return { label: 'Tomorrow', color: 'text-amber-400' }
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: 'text-red-400' }
    return { label: `${diff}d left`, color: 'text-gray-500' }
  }

  const annConfig = {
    info:    { icon: 'ti-server',         dotColor: 'bg-blue-400',    topBg: 'bg-blue-500/10',    fromColor: 'text-blue-400',    iconColor: 'text-blue-400'    },
    warning: { icon: 'ti-alert-triangle', dotColor: 'bg-amber-400',   topBg: 'bg-amber-500/10',   fromColor: 'text-amber-400',   iconColor: 'text-amber-400'   },
    success: { icon: 'ti-circle-check',   dotColor: 'bg-emerald-400', topBg: 'bg-emerald-500/10', fromColor: 'text-emerald-400', iconColor: 'text-emerald-400' },
    danger:  { icon: 'ti-alert-circle',   dotColor: 'bg-red-400',     topBg: 'bg-red-500/10',     fromColor: 'text-red-400',     iconColor: 'text-red-400'     },
  }

  const firstName = user?.user_metadata?.name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Student'

  if (isLoading) return <DashboardSkeleton />

  return (
    <div className="space-y-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">
            Good {getGreeting()}, {firstName} 👋
          </h2>
          <p className="text-gray-400 mt-1">Here's what's going on with your studies.</p>
        </div>
        {overdueAssignments.length > 0 && (
          <button
            onClick={() => navigate('/dashboard/assignments')}
            className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2 rounded-xl hover:bg-red-500/20 transition"
          >
            ⚠️ {overdueAssignments.length} overdue
          </button>
        )}
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="space-y-2.5">
          {announcements.map(a => {
            const cfg = annConfig[a.type] ?? annConfig.info
            const ts = new Date(a.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })
            return (
              <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {/* Top bar */}
                <div className={`flex items-center gap-2 px-3.5 py-2 border-b border-gray-800 ${cfg.topBg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotColor}`} />
                  <i className={`ti ti-shield-check text-xs ${cfg.fromColor}`} />
                  <span className={`text-[11px] font-medium uppercase tracking-wide ${cfg.fromColor}`}>
                    System · Admin
                  </span>
                  <span className="flex-1" />
                  <span className="text-[11px] text-gray-600">{ts}</span>
                </div>
                {/* Body */}
                <div className="flex gap-3 items-start px-3.5 py-3">
                  <i className={`ti ${cfg.icon} text-lg flex-shrink-0 mt-0.5 ${cfg.iconColor}`} />
                  <div>
                    <p className="text-sm font-medium text-white mb-0.5">{a.title}</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{a.message}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(stat => (
          <button
            key={stat.label}
            onClick={() => navigate(stat.path)}
            className={`rounded-xl p-5 text-left transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] ${colorMap[stat.color]}`}
          >
            <div className="text-2xl mb-3">{stat.icon}</div>
            <div className="text-3xl font-bold text-white">{stat.value}</div>
            <div className="text-sm mt-1 opacity-80">{stat.label}</div>
            {stat.sub && (
              <div className={`text-xs mt-1 ${stat.subColor || 'text-gray-500'}`}>
                {stat.sub}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
          {quickActions.map(action => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 bg-gray-900 border border-gray-800 hover:border-indigo-500/50 hover:bg-gray-800 rounded-xl px-3 py-4 text-xs text-gray-400 hover:text-white transition text-center"
            >
              <span className="text-2xl">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming Assignments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Upcoming Assignments</h3>
          {upcoming.length > 0 && (
            <button
              onClick={() => navigate('/dashboard/assignments')}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition"
            >
              View all →
            </button>
          )}
        </div>

        {upcoming.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-white font-medium">You're all caught up!</p>
            <p className="text-gray-500 text-sm mt-1">No upcoming assignments. Enjoy the free time!</p>
            <button
              onClick={() => navigate('/dashboard/assignments')}
              className="mt-4 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-4 py-2 rounded-lg transition hover:bg-indigo-500/10"
            >
              + Add Assignment
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map(a => {
              const { label: daysLabel, color: daysColor } = getDaysUntil(a.due_date)
              return (
                <div
                  key={a.id}
                  onClick={() => navigate('/dashboard/assignments')}
                  className="bg-gray-900 border border-gray-800 hover:border-indigo-500/30 rounded-xl px-5 py-3 flex items-center justify-between cursor-pointer transition group"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0
                      ${a.priority === 'high' ? 'bg-red-400' :
                        a.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'}`}
                    />
                    <div>
                      <p className="text-white font-medium group-hover:text-indigo-300 transition">{a.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        Due {new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${daysColor}`}>{daysLabel}</span>
                    <span className={`text-xs px-2 py-1 rounded-full capitalize
                      ${a.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                        a.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-emerald-500/10 text-emerald-400'}`}>
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
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}