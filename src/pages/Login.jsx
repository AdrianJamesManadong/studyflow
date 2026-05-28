import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'
import GuideModal from '../components/GuideModal'

export default function Login() {
  const { register, handleSubmit, formState: { errors }, getValues } = useForm()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [forgotError, setForgotError] = useState('')

  async function onSubmit(data) {
    try {
      setServerError('')
      await login(data.email, data.password)
      navigate('/dashboard')
    } catch (err) {
      setServerError(err.message)
    }
  }

  async function handleForgotPassword() {
    if (!forgotEmail.trim()) { setForgotError('Please enter your email address'); return }
    if (!/^\S+@\S+$/.test(forgotEmail)) { setForgotError('Please enter a valid email'); return }

    setForgotLoading(true)
    setForgotError('')

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setForgotError(error.message)
    } else {
      setForgotSuccess(true)
    }
    setForgotLoading(false)
  }

  function handleOpenForgot() {
    setForgotEmail(getValues('email') || '')
    setForgotError('')
    setForgotSuccess(false)
    setShowForgot(true)
  }

  function handleCloseForgot() {
    setShowForgot(false)
    setForgotSuccess(false)
    setForgotError('')
    setForgotEmail('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}
    >
      <style>{`
        @keyframes float-y {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes arrow-point {
          0%, 100% { transform: translateX(0px) translateY(0px); }
          50% { transform: translateX(3px) translateY(-3px); }
        }
        @keyframes bubble-pop {
          0% { opacity: 0; transform: scale(0.8) translateY(6px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes soft-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.04); }
        }
        @keyframes spin-ring {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .float-y { animation: float-y 3s ease-in-out infinite; }
        .arrow-point { animation: arrow-point 1.4s ease-in-out infinite; }
        .bubble-pop { animation: bubble-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards; opacity: 0; }
        .fade-1 { animation: fade-up 0.5s ease 0s forwards; opacity: 0; }
        .fade-2 { animation: fade-up 0.5s ease 0.1s forwards; opacity: 0; }
        .fade-3 { animation: fade-up 0.5s ease 0.18s forwards; opacity: 0; }
        .soft-pulse { animation: soft-pulse 5s ease-in-out infinite; }
        .spin-ring { animation: spin-ring 20s linear infinite; }
        .spin-ring-rev { animation: spin-ring 14s linear infinite reverse; }
        .modal-in { animation: modal-in 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards; }

        .input-field {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.2s;
        }
        .input-field:focus {
          outline: none;
          background: rgba(255,255,255,0.06);
          border-color: rgba(129, 140, 248, 0.5);
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
        .btn-primary:hover {
          background: linear-gradient(135deg, #5b52f0, #7c3aed);
          box-shadow: 0 6px 28px rgba(79,70,229,0.5);
          transform: translateY(-1px);
        }
        .btn-primary:active { transform: translateY(0); }
        .guide-btn {
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.25);
          transition: all 0.2s;
        }
        .guide-btn:hover {
          background: rgba(99,102,241,0.2);
          border-color: rgba(99,102,241,0.45);
        }
        .stat-pill {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
        }
        .forgot-input {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          transition: all 0.2s;
        }
        .forgot-input:focus {
          outline: none;
          background: rgba(255,255,255,0.07);
          border-color: rgba(129,140,248,0.5);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
        .back-home {
          color: #64748b;
          transition: color 0.2s;
        }
        .back-home:hover { color: #cbd5e1; }
      `}</style>

      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="soft-pulse absolute top-[-120px] left-[-100px] w-[420px] h-[420px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)' }} />
        <div className="soft-pulse absolute bottom-[-100px] right-[-80px] w-[380px] h-[380px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(109,40,217,0.15) 0%, transparent 70%)', animationDelay: '2s' }} />
        <div className="spin-ring absolute top-12 right-16 w-28 h-28 rounded-full hidden lg:block"
          style={{ border: '1px dashed rgba(99,102,241,0.15)' }} />
        <div className="spin-ring-rev absolute bottom-16 left-16 w-16 h-16 rounded-full hidden lg:block"
          style={{ border: '1px dashed rgba(139,92,246,0.15)' }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Floating decorations */}
      <div className="float-y absolute top-16 left-[12%] text-xl opacity-25 pointer-events-none hidden lg:block" style={{ animationDelay: '0s' }}>📖</div>
      <div className="float-y absolute top-1/3 left-8 text-lg opacity-20 pointer-events-none hidden lg:block" style={{ animationDelay: '0.8s' }}>📝</div>
      <div className="float-y absolute bottom-24 left-[14%] text-xl opacity-20 pointer-events-none hidden lg:block" style={{ animationDelay: '1.6s' }}>🎓</div>
      <div className="float-y absolute top-20 right-[12%] text-lg opacity-20 pointer-events-none hidden lg:block" style={{ animationDelay: '0.4s' }}>📊</div>
      <div className="float-y absolute bottom-20 right-[13%] text-xl opacity-25 pointer-events-none hidden lg:block" style={{ animationDelay: '1.2s' }}>✏️</div>

      <div className="w-full max-w-[420px] relative z-10">

        {/* ── Back to home ── */}
        <div className="mb-4 fade-1">
          <Link to="/" className="back-home inline-flex items-center gap-1.5 text-xs">
            <span>←</span>
            <span>Back to home</span>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-7 fade-1">
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 18px rgba(79,70,229,0.4)' }}>
              <span className="text-lg">📚</span>
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white tracking-tight leading-none">StudyFlow</h1>
              <p className="text-indigo-400 text-[11px] font-medium mt-0.5 tracking-wide uppercase">Student Project Management</p>
            </div>
          </div>

          <p className="text-slate-400 text-sm">Welcome back! Ready to tackle your projects?</p>

          <div className="flex items-center justify-center gap-2 mt-3">
            {[
              { icon: '🎯', label: 'Track tasks' },
              { icon: '📈', label: 'Monitor grades' },
              { icon: '🗒️', label: 'Take notes' },
            ].map(s => (
              <div key={s.label} className="stat-pill flex items-center gap-1.5 px-2.5 py-1 rounded-full">
                <span className="text-xs">{s.icon}</span>
                <span className="text-slate-400 text-[11px]">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-start justify-center mt-5">
            <button
              onClick={() => setShowGuide(true)}
              className="guide-btn text-xs text-indigo-300 hover:text-indigo-200 px-4 py-2 rounded-full flex items-center gap-2"
            >
              <span>✨</span>
              <span className="font-medium">How does StudyFlow work?</span>
            </button>
            <div className="float-y flex items-start ml-1 pointer-events-none select-none">
              <svg width="26" height="22" viewBox="0 0 26 22" fill="none" className="arrow-point text-indigo-400 mt-1 flex-shrink-0">
                <path d="M22 18 C16 13, 7 9, 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
                <path d="M7 3 L3 3 L4 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <div className="bubble-pop ml-0.5"
                style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: '12px 12px 12px 2px', padding: '6px 10px' }}>
                <p className="text-indigo-300 text-[11px] font-semibold whitespace-nowrap">New here? 👋</p>
                <p className="text-indigo-400/60 text-[10px] whitespace-nowrap">Tap to get started!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="card rounded-2xl p-7 fade-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Sign in to your account</h2>
              <p className="text-slate-500 text-xs mt-0.5">Enter your credentials to continue</p>
            </div>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(239,68,68,0.45)' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(234,179,8,0.45)' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(34,197,94,0.45)' }} />
            </div>
          </div>

          <div className="space-y-4 fade-3">

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email address</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm">📧</span>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
                  })}
                  type="email"
                  placeholder="janedoe@gmail.com"
                  className="input-field w-full rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-600 text-sm"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <span>⚠️</span>{errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm">🔒</span>
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input-field w-full rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-slate-600 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition text-sm"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <span>⚠️</span>{errors.password.message}
                </p>
              )}
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={handleOpenForgot}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 transition font-medium"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {/* Server error */}
            {serverError && (
              <div className="flex items-start gap-2 rounded-xl px-4 py-3"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <span className="flex-shrink-0">🚨</span>
                <p className="text-red-400 text-sm">{serverError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit(onSubmit)}
              className="btn-primary w-full text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 mt-1"
            >
              <span>Sign in</span>
              <span className="text-indigo-300 text-base">→</span>
            </button>

          </div>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <span className="text-slate-600 text-xs">or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>

          <p className="text-slate-500 text-sm text-center">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition">
              Register for free →
            </Link>
          </p>
        </div>

        <p className="text-center text-slate-700 text-xs mt-4 fade-3">🔒 Secured with Supabase Auth</p>
      </div>

      {/* ── Forgot Password Modal ── */}
      {showForgot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) handleCloseForgot() }}
        >
          <div
            className="modal-in w-full max-w-sm rounded-2xl p-6 space-y-5"
            style={{
              background: 'rgba(15,23,42,0.95)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 30px 70px rgba(0,0,0,0.6)',
            }}
          >
            {!forgotSuccess ? (
              <>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
                      <span className="text-lg">🔑</span>
                    </div>
                    <h3 className="text-white font-semibold text-base">Reset your password</h3>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                      Enter your email and we'll send you a link to reset your password.
                    </p>
                  </div>
                  <button onClick={handleCloseForgot} className="text-slate-600 hover:text-slate-300 transition text-lg leading-none mt-0.5">✕</button>
                </div>

                {/* Email input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-400">Email address</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm">📧</span>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => { setForgotEmail(e.target.value); setForgotError('') }}
                      onKeyDown={e => e.key === 'Enter' && handleForgotPassword()}
                      placeholder="janedoe@gmail.com"
                      className="forgot-input w-full rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-600 text-sm"
                      autoFocus
                    />
                  </div>
                  {forgotError && (
                    <p className="text-red-400 text-xs flex items-center gap-1 mt-1">
                      <span>⚠️</span>{forgotError}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCloseForgot}
                    className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white transition"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleForgotPassword}
                    disabled={forgotLoading}
                    className="flex-1 btn-primary py-2.5 rounded-xl text-sm text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? (
                      <><span className="inline-block w-3.5 h-3.5 border-2 border-indigo-300/30 border-t-indigo-300 rounded-full animate-spin" />Sending…</>
                    ) : 'Send reset link'}
                  </button>
                </div>
              </>
            ) : (
              /* Success state */
              <div className="text-center py-2 space-y-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <span className="text-2xl">📬</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base">Check your inbox!</h3>
                  <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
                    We sent a password reset link to{' '}
                    <span className="text-indigo-300 font-medium">{forgotEmail}</span>.
                    Check your spam folder if you don't see it.
                  </p>
                </div>
                <button
                  onClick={handleCloseForgot}
                  className="btn-primary w-full py-2.5 rounded-xl text-sm text-white font-semibold"
                >
                  Back to sign in
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
    </div>
  )
}