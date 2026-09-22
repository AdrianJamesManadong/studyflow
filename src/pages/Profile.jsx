import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'
import { User, Lock, AlertTriangle, Camera, Eye, EyeOff, Check, MapPin } from 'lucide-react'

// ─── Skeleton ────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`skeleton-shimmer rounded-md ${className}`} />
}

function ProfileSkeleton() {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }
        .skeleton-shimmer {
          background: linear-gradient(90deg, #EEF2FF 25%, #E6E4F2 50%, #EEF2FF 75%);
          background-size: 600px 100%;
          animation: shimmer 1.4s infinite linear;
        }
        .dark .skeleton-shimmer {
          background: linear-gradient(90deg, #1f2937 25%, #374151 50%, #1f2937 75%);
          background-size: 600px 100%;
          animation: shimmer 1.4s infinite linear;
        }
      `}</style>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-6 flex items-center gap-5 shadow-sm">
          <Skeleton className="w-20 h-20 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-6 space-y-4 shadow-sm">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>
    </>
  )
}

// ─── Password strength ────────────────────────────────────────────────────────
function getStrength(pw) {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const colors = ['', '#DC2626', '#F59E0B', '#22C55E', '#4F46E5']
  const labels = ['', 'Weak', 'Fair', 'Strong', 'Very strong']
  return { score, color: colors[score], label: labels[score] }
}

// Only formats storage will actually serve safely as an <img>. SVG is
// deliberately excluded: it can carry inline <script>/onload handlers, and
// since avatars are opened directly from a public bucket URL, an uploaded
// SVG would execute on that origin — stored XSS.
const ALLOWED_AVATAR_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const MIN_PASSWORD_LENGTH = 8

// ─── Main component ───────────────────────────────────────────────────────────
export default function Profile() {
  const { user } = useAuth()
  const fileInputRef = useRef(null)

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  // Profile form
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [school, setSchool] = useState('')
  const [yearLevel, setYearLevel] = useState('')
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
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Danger zone
  const [activeTab, setActiveTab] = useState('profile')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const strength = getStrength(newPassword)

  // Fix: user often arrives asynchronously (session resolves after mount),
  // so the form fields must sync from it via an effect rather than only
  // reading it once in useState's initializer, or they stay blank forever
  // when AuthContext starts as null.
  useEffect(() => {
    if (!user) return
    const m = user.user_metadata || {}
    setName(m.name || '')
    setBio(m.bio || '')
    setSchool(m.school || '')
    setYearLevel(m.year_level || '')
    setAvatarUrl(m.avatar_url || '')
  }, [user])

  // Fix: revoke the object URL for any preview we created, so selecting a
  // new avatar (or leaving the page) doesn't leak the previous blob.
  useEffect(() => {
    return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview) }
  }, [avatarPreview])

  // Fix: clear success-message timers on unmount so they don't try to
  // setState after the component is gone.
  useEffect(() => {
    if (!nameSuccess) return
    const t = setTimeout(() => setNameSuccess(false), 3000)
    return () => clearTimeout(t)
  }, [nameSuccess])

  useEffect(() => {
    if (!passSuccess) return
    const t = setTimeout(() => setPassSuccess(false), 3000)
    return () => clearTimeout(t)
  }, [passSuccess])

  // ── Avatar handlers ──────────────────────────────────────────────────────
  function handleAvatarSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    // Fix: allowlist instead of a type-prefix check, so SVG can't slip through.
    if (!ALLOWED_AVATAR_TYPES[file.type]) {
      setAvatarError('Use a JPG, PNG, WebP, or GIF image.')
      e.target.value = ''
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image must be smaller than 2 MB')
      e.target.value = ''
      return
    }
    setAvatarError('')
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function handleAvatarCancel() {
    setAvatarFile(null)
    setAvatarPreview(null)
    setAvatarError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleAvatarUpload() {
    if (!avatarFile || !user) return
    setAvatarUploading(true)
    setAvatarError('')

    // Fix: derive the extension from the validated MIME type rather than the
    // filename, so a file with no/wrong extension can't produce a bad path.
    const ext = ALLOWED_AVATAR_TYPES[avatarFile.type]
    const path = `avatars/${user.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })

    if (uploadError) {
      setAvatarError(uploadError.message)
      setAvatarUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('profiles').getPublicUrl(path)
    const publicUrl = urlData.publicUrl + `?t=${Date.now()}`

    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: publicUrl }
    })

    if (updateError) {
      setAvatarError(updateError.message)
    } else {
      setAvatarUrl(publicUrl)
      setAvatarFile(null)
      setAvatarPreview(null)
      // Fix: clear the file input so re-selecting the same file still fires onChange.
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    setAvatarUploading(false)
  }

  // ── Profile handler ──────────────────────────────────────────────────────
  async function handleUpdateProfile() {
    if (!name.trim()) return
    setNameLoading(true)
    setNameError('')
    setNameSuccess(false)

    const { error } = await supabase.auth.updateUser({
      data: {
        name: name.trim(),
        bio: bio.trim(),
        school: school.trim(),
        year_level: yearLevel,
      }
    })

    if (error) {
      setNameError(error.message)
    } else {
      setNameSuccess(true)
    }
    setNameLoading(false)
  }

  // ── Password handler ─────────────────────────────────────────────────────
  async function handleUpdatePassword() {
    setPassError('')
    setPassSuccess(false)

    if (!currentPassword) { setPassError('Enter your current password'); return }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPassError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      return
    }
    if (newPassword !== confirmPassword) { setPassError('Passwords do not match'); return }

    setPassLoading(true)

    // Fix: require re-entering the current password before changing it.
    // Supabase issues a session-scoped update with no re-auth check of its
    // own, so anyone at an unlocked, signed-in browser could otherwise lock
    // the real owner out.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (verifyError) {
      setPassError('Current password is incorrect')
      setPassLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPassError(error.message)
    } else {
      setPassSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
    setPassLoading(false)
  }

  // ── Delete account ───────────────────────────────────────────────────────
  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This will permanently delete all your data. This cannot be undone.'
    )
    if (!confirmed) return

    setDeleting(true)
    setDeleteError('')

    // Fix: supabase-js resolves with { error } on a failed query rather than
    // throwing, so the old try/catch never caught a failed delete — rows
    // could survive while the user got signed out anyway. Check each result.
    const tables = ['assignments', 'grades', 'notes', 'subjects']
    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq('user_id', user.id)
      if (error) {
        setDeleteError(`Couldn't delete ${table}: ${error.message}`)
        setDeleting(false)
        return
      }
    }

    // Fix: deleting the auth user itself requires the service-role key,
    // which must never live in client code. This calls a server-side Edge
    // Function that performs supabase.auth.admin.deleteUser(user.id).
    // See supabase/functions/delete-account/index.ts.
    const { error: fnError } = await supabase.functions.invoke('delete-account')
    if (fnError) {
      setDeleteError(
        'Your data was deleted, but the account itself could not be removed. Please contact support.'
      )
      setDeleting(false)
      return
    }

    await supabase.auth.signOut()
    setDeleting(false)
  }

  const tabs = [
    { id: 'profile',  label: 'Profile',     Icon: User },
    { id: 'password', label: 'Password',    Icon: Lock },
    { id: 'danger',   label: 'Danger zone', Icon: AlertTriangle },
  ]

  const yearOptions = [
    'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
    '1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduate',
  ]

  // Fix: gate on real data instead of a fixed 1s timer — shows the skeleton
  // for exactly as long as the session actually takes to resolve.
  if (!user) return <ProfileSkeleton />

  const displayAvatar = avatarPreview || avatarUrl

  return (
    <>
      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .panel-animate { animation: fadeSlide 0.2s ease; }
        .avatar-hover-overlay { opacity: 0; transition: opacity 0.2s; }
        .avatar-wrapper:hover .avatar-hover-overlay,
        .avatar-wrapper:focus-visible .avatar-hover-overlay { opacity: 1; }
      `}</style>

      <div className="max-w-2xl mx-auto space-y-4">

        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Profile</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your account settings</p>
        </div>

        {/* Avatar card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 flex items-center gap-5 shadow-sm">
          {/* Fix: button instead of div, so avatar change is keyboard-reachable and focusable */}
          <button
            type="button"
            className="relative avatar-wrapper flex-shrink-0 cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            onClick={() => !avatarPreview && fileInputRef.current?.click()}
            aria-label="Change avatar"
          >
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt={name}
                className="w-20 h-20 rounded-full object-cover border-2 border-indigo-200 dark:border-indigo-800"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl font-semibold">
                {name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            {!avatarPreview && (
              <div className="avatar-hover-overlay absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center gap-0.5">
                <Camera size={16} className="text-white" />
                <span className="text-white text-[10px] font-medium">Change</span>
              </div>
            )}
            {avatarPreview && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 border-2 border-white dark:border-gray-800 flex items-center justify-center">
                <span className="text-[9px] text-white font-bold">!</span>
              </div>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarSelect}
          />

          <div className="flex-1 min-w-0">
            <p className="text-gray-900 dark:text-white font-medium text-base leading-tight">{name || 'No name set'}</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 truncate">{user.email}</p>
            {school && (
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5 truncate flex items-center gap-1">
                <MapPin size={11} /> {school}{yearLevel ? ` · ${yearLevel}` : ''}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <p className="text-gray-400 dark:text-gray-500 text-xs font-mono">
                Member since {new Date(user.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
              <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-medium">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Avatar pending upload bar */}
        {avatarPreview && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 flex items-center gap-3 panel-animate">
            <Camera size={16} className="text-amber-600 dark:text-amber-400" />
            <p className="text-amber-700 dark:text-amber-400 text-sm flex-1">New avatar selected — save it below to apply.</p>
            <div className="flex gap-2">
              <button
                onClick={handleAvatarCancel}
                disabled={avatarUploading}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleAvatarUpload}
                disabled={avatarUploading}
                className="text-xs bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 px-3 py-1.5 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {avatarUploading ? (
                  <><span className="inline-block w-3 h-3 border-2 border-amber-400/40 border-t-amber-600 dark:border-t-amber-400 rounded-full animate-spin" /> Uploading…</>
                ) : 'Save avatar'}
              </button>
            </div>
          </div>
        )}

        {avatarError && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 flex items-center gap-2 panel-animate">
            <AlertTriangle size={14} className="text-red-500 dark:text-red-400" />
            <p className="text-red-600 dark:text-red-400 text-sm">{avatarError}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-1 shadow-sm">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.id
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
              <tab.Icon size={15} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Profile tab ── */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-6 space-y-5 panel-animate shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Personal info</h3>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition flex items-center gap-1"
              >
                <Camera size={13} /> Change avatar
              </button>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label htmlFor="profile-name" className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Full name</label>
              <input
                id="profile-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition"
              />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <label htmlFor="profile-email" className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email address</label>
              <input
                id="profile-email"
                value={user.email || ''}
                disabled
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">Email cannot be changed</p>
            </div>

            {/* School */}
            <div className="space-y-1.5">
              <label htmlFor="profile-school" className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">School / University</label>
              <input
                id="profile-school"
                value={school}
                onChange={e => setSchool(e.target.value)}
                placeholder="e.g. University of the Philippines"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition"
              />
            </div>

            {/* Year level */}
            <div className="space-y-1.5">
              <label htmlFor="profile-year" className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Year level</label>
              <select
                id="profile-year"
                value={yearLevel}
                onChange={e => setYearLevel(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition appearance-none cursor-pointer"
              >
                <option value="">Select year level…</option>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <label htmlFor="profile-bio" className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bio <span className="normal-case text-gray-400 dark:text-gray-500">(optional)</span></label>
              <textarea
                id="profile-bio"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="A short bio about yourself…"
                rows={3}
                maxLength={200}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition resize-none"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 text-right">{bio.length}/200</p>
            </div>

            {nameError && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5">
                <AlertTriangle size={14} className="text-red-500 dark:text-red-400" />
                <p className="text-red-600 dark:text-red-400 text-sm">{nameError}</p>
              </div>
            )}
            {nameSuccess && (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-2.5">
                <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
                <p className="text-emerald-600 dark:text-emerald-400 text-sm">Profile updated successfully</p>
              </div>
            )}

            <button
              onClick={handleUpdateProfile}
              disabled={nameLoading || !name.trim()}
              className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 disabled:opacity-40 disabled:cursor-not-allowed text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-medium px-5 py-2.5 rounded-lg transition text-sm"
            >
              {nameLoading ? (
                <><span className="inline-block w-3.5 h-3.5 border-2 border-indigo-300 dark:border-indigo-700 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />Saving…</>
              ) : 'Save changes'}
            </button>
          </div>
        )}

        {/* ── Password tab ── */}
        {activeTab === 'password' && (
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-6 space-y-5 panel-animate shadow-sm">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Change password</h3>

            <div className="space-y-1.5">
              <label htmlFor="pw-current" className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current password</label>
              <div className="relative">
                <input
                  id="pw-current"
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition pr-10"
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition">
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pw-new" className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">New password</label>
              <div className="relative">
                <input
                  id="pw-new"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition pr-10"
                />
                <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition">
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {newPassword.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? '' : 'bg-gray-200 dark:bg-gray-700'}`}
                        style={i <= strength.score ? { background: strength.color } : undefined}
                      />
                    ))}
                  </div>
                  <p
                    className={`text-xs ${strength.score > 0 ? '' : 'text-gray-400 dark:text-gray-500'}`}
                    style={strength.score > 0 ? { color: strength.color } : undefined}
                  >
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pw-confirm" className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Confirm new password</label>
              <div className="relative">
                <input
                  id="pw-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 transition pr-10"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition">
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">Passwords don't match</p>
              )}
              {confirmPassword.length > 0 && newPassword === confirmPassword && newPassword.length > 0 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1"><Check size={11} /> Passwords match</p>
              )}
            </div>

            {passError && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5">
                <AlertTriangle size={14} className="text-red-500 dark:text-red-400" />
                <p className="text-red-600 dark:text-red-400 text-sm">{passError}</p>
              </div>
            )}
            {passSuccess && (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-2.5">
                <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
                <p className="text-emerald-600 dark:text-emerald-400 text-sm">Password updated successfully</p>
              </div>
            )}

            <button
              onClick={handleUpdatePassword}
              disabled={passLoading || !currentPassword || !newPassword || !confirmPassword}
              className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 disabled:opacity-40 disabled:cursor-not-allowed text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-medium px-5 py-2.5 rounded-lg transition text-sm"
            >
              {passLoading ? (
                <><span className="inline-block w-3.5 h-3.5 border-2 border-indigo-300 dark:border-indigo-700 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />Updating…</>
              ) : 'Update password'}
            </button>
          </div>
        )}

        {/* ── Danger zone tab ── */}
        {activeTab === 'danger' && (
          <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-xl p-6 space-y-4 panel-animate shadow-sm">
            <h3 className="text-xs font-medium text-red-500 dark:text-red-400 uppercase tracking-wider">Danger zone</h3>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-gray-900 dark:text-white text-sm font-medium">Delete account</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 max-w-sm leading-relaxed">
                  Permanently removes all your subjects, assignments, grades, and notes, and closes your account. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="inline-flex items-center gap-2 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-medium px-5 py-2.5 rounded-lg transition text-sm flex-shrink-0"
              >
                {deleting ? (
                  <><span className="inline-block w-3.5 h-3.5 border-2 border-red-300 dark:border-red-700 border-t-red-600 dark:border-t-red-400 rounded-full animate-spin" />Deleting…</>
                ) : 'Delete account'}
              </button>
            </div>
            {deleteError && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5">
                <AlertTriangle size={14} className="text-red-500 dark:text-red-400" />
                <p className="text-red-600 dark:text-red-400 text-sm">{deleteError}</p>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  )
}