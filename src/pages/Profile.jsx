import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'

// Skeleton shimmer component
function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-800/60 ${className}`}
      style={{
        background: 'linear-gradient(90deg, #1f2937 25%, #374151 50%, #1f2937 75%)',
        backgroundSize: '600px 100%',
        animation: 'shimmer 1.4s infinite linear',
      }}
    />
  )
}

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl space-y-4">
      {/* Avatar skeleton */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center gap-5">
        <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-3/5" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      {/* Tabs skeleton */}
      <Skeleton className="h-12 w-full rounded-xl" />
      {/* Panel skeleton */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <Skeleton className="h-4 w-1/4" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-1/5" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-1/6" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  )
}

// Password strength util
function getStrength(pw) {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const colors = ['', '#E24B4A', '#EF9F27', '#1D9E75', '#0F6E56']
  const labels = ['', 'Weak', 'Fair', 'Strong', 'Very strong']
  return { score, color: colors[score], label: labels[score] }
}

export default function Profile() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')

  // Profile form
  const [name, setName] = useState(user?.name || '')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameSuccess, setNameSuccess] = useState(false)
  const [nameError, setNameError] = useState('')

  // Password form
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passLoading, setPassLoading] = useState(false)
  const [passSuccess, setPassSuccess] = useState(false)
  const [passError, setPassError] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const strength = getStrength(newPassword)

  // Simulate data loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200)
    return () => clearTimeout(timer)
  }, [])

  async function handleUpdateName() {
    if (!name.trim()) return
    setNameLoading(true)
    setNameError('')
    setNameSuccess(false)

    const { error } = await supabase.auth.updateUser({
      data: { name: name.trim() }
    })

    if (error) {
      setNameError(error.message)
    } else {
      setNameSuccess(true)
      setTimeout(() => setNameSuccess(false), 3000)
    }
    setNameLoading(false)
  }

  async function handleUpdatePassword() {
    setPassError('')
    setPassSuccess(false)

    if (newPassword.length < 6) {
      setPassError('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPassError('Passwords do not match')
      return
    }

    setPassLoading(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPassError(error.message)
    } else {
      setPassSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPassSuccess(false), 3000)
    }
    setPassLoading(false)
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This will permanently delete all your data. This cannot be undone.'
    )
    if (!confirmed) return

    try {
      await supabase.from('assignments').delete().eq('user_id', user.id)
      await supabase.from('grades').delete().eq('user_id', user.id)
      await supabase.from('notes').delete().eq('user_id', user.id)
      await supabase.from('subjects').delete().eq('user_id', user.id)
      await supabase.auth.signOut()
      alert('Your data has been deleted and you have been signed out.')
    } catch (err) {
      alert('Something went wrong. Please try again.')
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'password', label: 'Password', icon: '🔒' },
    { id: 'danger', label: 'Danger zone', icon: '⚠️' },
  ]

  if (loading) return <ProfileSkeleton />

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .panel-animate { animation: fadeSlide 0.2s ease; }
      `}</style>

      <div className="max-w-2xl space-y-4">

        {/* Page header */}
        <div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">Profile</h2>
          <p className="text-gray-400 text-sm mt-1">Manage your account settings</p>
        </div>

        {/* Avatar card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-indigo-600/20 border-2 border-indigo-500/40 flex items-center justify-center text-indigo-300 text-xl font-semibold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-base leading-tight">{user?.name}</p>
            <p className="text-gray-400 text-sm mt-0.5 truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <p className="text-gray-600 text-xs font-mono">
                Member since {new Date(user?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
              <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.id
                  ? 'bg-gray-800 text-white border border-gray-700'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5 panel-animate">
            <h3 className="text-white font-medium text-sm tracking-wide uppercase text-gray-400">Update profile</h3>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Full name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Email address</label>
              <input
                value={user?.email}
                disabled
                className="w-full bg-gray-800/40 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-700">Email cannot be changed</p>
            </div>

            {nameError && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
                <span className="text-red-400 text-sm">⚠</span>
                <p className="text-red-400 text-sm">{nameError}</p>
              </div>
            )}

            {nameSuccess && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2.5">
                <span className="text-emerald-400 text-sm">✓</span>
                <p className="text-emerald-400 text-sm">Name updated successfully</p>
              </div>
            )}

            <button
              onClick={handleUpdateName}
              disabled={nameLoading || !name.trim() || name === user?.name}
              className="inline-flex items-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 disabled:opacity-30 disabled:cursor-not-allowed text-indigo-300 border border-indigo-500/30 font-medium px-5 py-2.5 rounded-lg transition text-sm"
            >
              {nameLoading ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </button>
          </div>
        )}

        {/* Password tab */}
        {activeTab === 'password' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5 panel-animate">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Change password</h3>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">New password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition text-sm"
                  aria-label="Toggle password visibility"
                >
                  {showNew ? '🙈' : '👁️'}
                </button>
              </div>

              {/* Strength meter */}
              {newPassword.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className="h-0.5 flex-1 rounded-full transition-all duration-300"
                        style={{ background: i <= strength.score ? strength.color : '#374151' }}
                      />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: strength.score > 0 ? strength.color : '#6b7280' }}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Confirm new password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition text-sm"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {passError && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
                <span className="text-red-400 text-sm">⚠</span>
                <p className="text-red-400 text-sm">{passError}</p>
              </div>
            )}

            {passSuccess && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2.5">
                <span className="text-emerald-400 text-sm">✓</span>
                <p className="text-emerald-400 text-sm">Password updated successfully</p>
              </div>
            )}

            <button
              onClick={handleUpdatePassword}
              disabled={passLoading || !newPassword || !confirmPassword}
              className="inline-flex items-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 disabled:opacity-30 disabled:cursor-not-allowed text-indigo-300 border border-indigo-500/30 font-medium px-5 py-2.5 rounded-lg transition text-sm"
            >
              {passLoading ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                  Updating…
                </>
              ) : (
                'Update password'
              )}
            </button>
          </div>
        )}

        {/* Danger zone tab */}
        {activeTab === 'danger' && (
          <div className="bg-gray-900 border border-red-500/20 rounded-xl p-6 space-y-4 panel-animate">
            <h3 className="text-xs font-medium text-red-500/70 uppercase tracking-wider">Danger zone</h3>

            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-white text-sm font-medium">Delete account</p>
                <p className="text-gray-500 text-xs mt-1 max-w-sm leading-relaxed">
                  Permanently removes all your subjects, assignments, grades, and notes. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="inline-flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-medium px-5 py-2.5 rounded-lg transition text-sm flex-shrink-0"
              >
                Delete account
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  )
}