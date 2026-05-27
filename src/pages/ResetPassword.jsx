import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase'

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

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  const strength = getStrength(password)

  // Supabase fires an AUTH event when the reset link is clicked.
  // We listen for it to confirm the session is valid before showing the form.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setValidSession(true)
      setCheckingSession(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setValidSession(true)
        setCheckingSession(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleReset() {
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 3000)
    }
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}
    >
      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes soft-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%       { opacity: 0.8; transform: scale(1.04); }
        }
        .fade-up   { animation: fade-up 0.5s ease forwards; }
        .soft-pulse { animation: soft-pulse 5s ease-in-out infinite; }
        .input-field {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.2s;
        }
        .input-field:focus {
          outline: none;
          background: rgba(255,255,255,0.06);
          border-color: rgba(129,140,248,0.5);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
        .card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(20px);
          box-shadow: 0 30px 70px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .btn-primary {
          background: linear-gradient(135deg, #4f46e5, #6d28d9);
          box-shadow: 0 4px 20px rgba(79,70,229,0.35);
          transition: all 0.2s;
        }
        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #5b52f0, #7c3aed);
          box-shadow: 0 6px 28px rgba(79,70,229,0.5);
          transform: translateY(-1px);
        }
      `}</style>

      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="soft-pulse absolute top-[-120px] left-[-100px] w-[420px] h-[420px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)' }} />
        <div className="soft-pulse absolute bottom-[-100px] right-[-80px] w-[380px] h-[380px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(109,40,217,0.15) 0%, transparent 70%)', animationDelay: '2s' }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="w-full max-w-[420px] relative z-10 fade-up">

        {/* Logo */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 18px rgba(79,70,229,0.4)' }}>
              <span className="text-lg">📚</span>
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white tracking-tight leading-none">StudyFlow</h1>
              <p className="text-indigo-400 text-[11px] font-medium mt-0.5 tracking-wide uppercase">Student Project Management</p>
            </div>
          </div>
        </div>

        <div className="card rounded-2xl p-7">

          {checkingSession ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Verifying your reset link…</p>
            </div>

          ) : !validSession ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-white font-semibold text-base">Invalid or expired link</h3>
                <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
                  This password reset link is no longer valid. Please request a new one.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="btn-primary w-full py-2.5 rounded-xl text-sm text-white font-semibold"
              >
                Back to login
              </button>
            </div>

          ) : success ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <h3 className="text-white font-semibold text-base">Password updated!</h3>
                <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
                  Your password has been changed successfully. Redirecting you to your dashboard…
                </p>
              </div>
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full animate-[grow_3s_linear_forwards]"
                  style={{ background: 'linear-gradient(90deg, #4f46e5, #7c3aed)', width: '100%', transformOrigin: 'left', animation: 'none', transition: 'width 3s linear' }} />
              </div>
            </div>

          ) : (
            <>
              <div className="mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
                  <span className="text-lg">🔑</span>
                </div>
                <h2 className="text-lg font-semibold text-white">Set a new password</h2>
                <p className="text-slate-500 text-xs mt-0.5">Choose a strong password for your account</p>
              </div>

              <div className="space-y-4">

                {/* New password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-400">New password</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm">🔒</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      placeholder="••••••••"
                      className="input-field w-full rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-slate-600 text-sm"
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition text-sm">
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="h-0.5 flex-1 rounded-full transition-all duration-300"
                            style={{ background: i <= strength.score ? strength.color : '#374151' }} />
                        ))}
                      </div>
                      <p className="text-xs" style={{ color: strength.score > 0 ? strength.color : '#6b7280' }}>
                        {strength.label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-400">Confirm new password</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm">🔒</span>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setError('') }}
                      onKeyDown={e => e.key === 'Enter' && handleReset()}
                      placeholder="••••••••"
                      className="input-field w-full rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-slate-600 text-sm"
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition text-sm">
                      {showConfirm ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {confirm.length > 0 && password !== confirm && (
                    <p className="text-xs text-red-400 mt-1">Passwords don't match</p>
                  )}
                  {confirm.length > 0 && password === confirm && password.length > 0 && (
                    <p className="text-xs text-emerald-400 mt-1">✓ Passwords match</p>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 rounded-xl px-4 py-3"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <span className="flex-shrink-0">🚨</span>
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleReset}
                  disabled={loading || !password || !confirm}
                  className="btn-primary w-full text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><span className="inline-block w-3.5 h-3.5 border-2 border-indigo-300/30 border-t-indigo-300 rounded-full animate-spin" />Updating…</>
                  ) : (
                    <><span>Update password</span><span className="text-indigo-300">→</span></>
                  )}
                </button>

              </div>
            </>
          )}
        </div>

        <p className="text-center text-slate-700 text-xs mt-4">🔒 Secured with Supabase Auth</p>
      </div>
    </div>
  )
}