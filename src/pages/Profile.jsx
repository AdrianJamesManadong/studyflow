import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'

export default function Profile() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')

  // Profile form
  const [name, setName] = useState(user?.name || '')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameSuccess, setNameSuccess] = useState(false)
  const [nameError, setNameError] = useState('')

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passLoading, setPassLoading] = useState(false)
  const [passSuccess, setPassSuccess] = useState(false)
  const [passError, setPassError] = useState('')
  const [showNew, setShowNew] = useState(false)
const [showConfirm, setShowConfirm] = useState(false)

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

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      setPassError(error.message)
    } else {
      setPassSuccess(true)
      setCurrentPassword('')
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
    // Delete all user data first
    await supabase.from('assignments').delete().eq('user_id', user.id)
    await supabase.from('grades').delete().eq('user_id', user.id)
    await supabase.from('notes').delete().eq('user_id', user.id)
    await supabase.from('subjects').delete().eq('user_id', user.id)

    // Sign out — actual account deletion requires admin access
    await supabase.auth.signOut()
    alert('Your data has been deleted and you have been signed out.')
  } catch (err) {
    alert('Something went wrong. Please try again.')
  }
}

  return (
    <div className="max-w-2xl space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Profile</h2>
        <p className="text-gray-400 text-sm mt-1">Manage your account settings</p>
      </div>

      {/* Avatar + info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <p className="text-white font-semibold text-lg">{user?.name}</p>
          <p className="text-gray-400 text-sm">{user?.email}</p>
          <p className="text-gray-600 text-xs mt-1">
            Member since {new Date(user?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-900 border border-gray-800 rounded-xl p-1">
        {['profile', 'password', 'danger'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition
              ${activeTab === tab ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {tab === 'danger' ? '⚠️ Danger Zone' : tab === 'password' ? '🔒 Password' : '👤 Profile'}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h3 className="text-white font-semibold">Update Profile</h3>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Full Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              value={user?.email}
              disabled
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-600 mt-1">Email cannot be changed</p>
          </div>

          {nameError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5">
              <p className="text-red-400 text-sm">{nameError}</p>
            </div>
          )}

          {nameSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2.5">
              <p className="text-emerald-400 text-sm">✓ Name updated successfully!</p>
            </div>
          )}

          <button
            onClick={handleUpdateName}
            disabled={nameLoading || !name.trim() || name === user?.name}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-lg transition text-sm"
          >
            {nameLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Password Tab */}
{activeTab === 'password' && (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
    <h3 className="text-white font-semibold">Change Password</h3>

    <div>
      <label className="block text-sm text-gray-400 mb-1">New Password</label>
      <div className="relative">
        <input
          type={showNew ? 'text' : 'password'}
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition pr-10"
        />
        <button
          type="button"
          onClick={() => setShowNew(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
        >
          {showNew ? '🙈' : '👁️'}
        </button>
      </div>
    </div>

    <div>
      <label className="block text-sm text-gray-400 mb-1">Confirm New Password</label>
      <div className="relative">
        <input
          type={showConfirm ? 'text' : 'password'}
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition pr-10"
        />
        <button
          type="button"
          onClick={() => setShowConfirm(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
        >
          {showConfirm ? '🙈' : '👁️'}
        </button>
      </div>
    </div>

    {passError && (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5">
        <p className="text-red-400 text-sm">{passError}</p>
      </div>
    )}

    {passSuccess && (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2.5">
        <p className="text-emerald-400 text-sm">✓ Password updated successfully!</p>
      </div>
    )}

    <button
      onClick={handleUpdatePassword}
      disabled={passLoading || !newPassword || !confirmPassword}
      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-lg transition text-sm"
    >
      {passLoading ? 'Updating...' : 'Update Password'}
    </button>
  </div>
)}

      {/* Danger Zone Tab */}
      {activeTab === 'danger' && (
        <div className="bg-gray-900 border border-red-500/20 rounded-xl p-6 space-y-4">
          <h3 className="text-red-400 font-semibold">Danger Zone</h3>
          <p className="text-gray-400 text-sm">
            Once you delete your account, all your data including subjects, assignments, grades, and notes will be permanently deleted. This action cannot be undone.
          </p>
          <button
            onClick={handleDeleteAccount}
            className="bg-red-600 hover:bg-red-500 text-white font-semibold px-6 py-2.5 rounded-lg transition text-sm"
          >
            Delete Account
          </button>
        </div>
      )}

    </div>
  )
}