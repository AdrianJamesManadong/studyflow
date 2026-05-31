import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'
import GuideModal from '../components/GuideModal'

const C = {
  bg:        '#080812',
  surface:   '#0f0f1e',
  surface2:  '#13132a',
  border:    '#1c1c38',
  borderHi:  '#2e2e58',
  indigo:    '#5b50f0',
  indigoMid: '#7c74f5',
  indigoFg:  '#a5a0fa',
  emerald:   '#10b981',
  amber:     '#f59e0b',
  violet:    '#8b5cf6',
  text:      '#eeeef8',
  textSoft:  '#b0b0cc',
  muted:     '#5a5a7a',
}

export default function Login() {
  const { register, handleSubmit, formState: { errors }, getValues, watch } = useForm()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError]   = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showGuide,    setShowGuide]    = useState(false)
  const [isMobile,     setIsMobile]     = useState(window.innerWidth < 768)
  const [isLoading,    setIsLoading]    = useState(false)
  const [shaking,      setShaking]      = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)

  const [toast, setToast] = useState(null)

  const [failCount,    setFailCount]    = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState(null)
  const [countdown,    setCountdown]    = useState(0)

  const passwordHideTimer = useRef(null)

  const [showForgot,    setShowForgot]    = useState(false)
  const [forgotEmail,   setForgotEmail]   = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [forgotError,   setForgotError]   = useState('')

  const emailValue = watch('email', '')
  const emailValid = emailValue && /^\S+@\S+\.\S+$/.test(emailValue)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!lockoutUntil) return
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        setLockoutUntil(null)
        setCountdown(0)
        setFailCount(0)
      } else {
        setCountdown(remaining)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lockoutUntil])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    return () => { if (passwordHideTimer.current) clearTimeout(passwordHideTimer.current) }
  }, [])

  function triggerShake() {
    setShaking(true)
    setTimeout(() => setShaking(false), 600)
  }

  function togglePassword() {
    if (showPassword) {
      setShowPassword(false)
      clearTimeout(passwordHideTimer.current)
    } else {
      setShowPassword(true)
      passwordHideTimer.current = setTimeout(() => setShowPassword(false), 3000)
    }
  }

  async function handleGoogleLogin() {
    try {
      setServerError('')
      setOauthLoading(true)
      if (!supabase?.auth) throw new Error('Auth service unavailable. Please refresh and try again.')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      })
      if (error) throw error
    } catch (err) {
      setServerError(err.message)
      setOauthLoading(false)
    }
  }

  async function onSubmit(data) {
    if (lockoutUntil && Date.now() < lockoutUntil) return
    try {
      setServerError('')
      setIsLoading(true)
      const [result] = await Promise.all([
        login(data.email, data.password),
        new Promise(r => setTimeout(r, 800)),
      ])
      const name = result?.user?.user_metadata?.name || data.email.split('@')[0]
      setToast({ message: `Welcome back, ${name}! 👋`, type: 'success' })
      setTimeout(() => navigate('/dashboard'), 1200)
    } catch (err) {
      setServerError(err.message)
      triggerShake()
      setIsLoading(false)
      const newCount = failCount + 1
      setFailCount(newCount)
      if (newCount >= 3) {
        const until = Date.now() + 30_000
        setLockoutUntil(until)
        setCountdown(30)
        setServerError('Too many failed attempts. Please wait 30 seconds.')
      }
    }
  }

  function handlePasswordKeyDown(e) {
    if (e.key === 'Enter') handleSubmit(onSubmit)()
  }

  async function handleForgotPassword() {
    if (!forgotEmail.trim()) { setForgotError('Please enter your email address'); return }
    if (!/^\S+@\S+$/.test(forgotEmail)) { setForgotError('Please enter a valid email'); return }
    setForgotLoading(true)
    setForgotError('')
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) { setForgotError(error.message) } else { setForgotSuccess(true) }
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

  const isLocked = lockoutUntil && Date.now() < lockoutUntil

  const inputBase = {
    width: '100%',
    background: C.surface2,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: '12px 16px 12px 44px',
    color: C.text,
    fontSize: 14,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 500,
    outline: 'none',
    transition: 'border-color .2s, box-shadow .2s',
    boxSizing: 'border-box',
  }
  const labelStyle = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '1.2px',
    textTransform: 'uppercase',
    color: C.muted,
    marginBottom: 7,
  }
  const errorStyle = {
    fontSize: 12,
    color: '#f87171',
    marginTop: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontWeight: 600,
  }

  return (
    <div style={{
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: C.bg,
      color: C.text,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflowX: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.indigo}44; border-radius: 4px; }

        .login-input:focus {
          border-color: ${C.indigoMid} !important;
          box-shadow: 0 0 0 3px ${C.indigo}22 !important;
        }
        .login-input-ok {
          border-color: ${C.emerald}66 !important;
          box-shadow: 0 0 0 3px ${C.emerald}14 !important;
        }
        .login-eye-btn:hover { color: ${C.textSoft} !important; }
        .cta-btn:hover  { opacity: .88 !important; transform: translateY(-1px); }
        .cta-btn:active { transform: translateY(0) !important; }
        .cta-btn:disabled { opacity: .6 !important; cursor: not-allowed !important; transform: none !important; }
        .nav-btn:hover  { color: ${C.textSoft} !important; }
        .register-link:hover { color: ${C.indigoFg} !important; }
        .forgot-link:hover   { color: ${C.indigoFg} !important; }
        .guide-btn:hover { background: ${C.surface2} !important; border-color: ${C.borderHi} !important; }
        .feat-card-sm:hover {
          background: ${C.surface2} !important;
          border-color: ${C.indigo}44 !important;
          transform: translateY(-2px);
        }
        .cancel-btn:hover { border-color: ${C.borderHi} !important; color: ${C.textSoft} !important; }

        .google-btn {
          width: 100%;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          background: ${C.surface2};
          border: 1px solid ${C.border};
          border-radius: 10px;
          padding: 13px 16px;
          color: ${C.textSoft};
          font-size: 14px; font-weight: 600;
          font-family: 'Plus Jakarta Sans', sans-serif;
          cursor: pointer;
          transition: background .2s, border-color .2s, color .2s, transform .15s;
        }
        .google-btn:hover:not(:disabled) {
          background: ${C.surface};
          border-color: ${C.borderHi};
          color: ${C.text};
          transform: translateY(-1px);
        }
        .google-btn:disabled { cursor: not-allowed; opacity: .55; }

        @keyframes fadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes modalIn {
          from { opacity:0; transform:scale(.96) translateY(12px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15%     { transform: translateX(-9px); }
          30%     { transform: translateX(8px); }
          45%     { transform: translateX(-6px); }
          60%     { transform: translateX(5px); }
          75%     { transform: translateX(-3px); }
          90%     { transform: translateX(2px); }
        }
        .shake { animation: shake .55s cubic-bezier(.36,.07,.19,.97) both; }

        @keyframes toastIn {
          from { opacity:0; transform:translateY(16px) scale(.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        .toast-in { animation: toastIn .3s cubic-bezier(.34,1.56,.64,1) forwards; }

        .fu1 { animation: fadeUp .55s ease .05s both; }
        .fu2 { animation: fadeUp .55s ease .12s both; }
        .fu3 { animation: fadeUp .55s ease .20s both; }
        .fu4 { animation: fadeUp .55s ease .28s both; }
        .fu5 { animation: fadeUp .55s ease .36s both; }
        .fu6 { animation: fadeUp .55s ease .44s both; }
        .modal-in { animation: modalIn .25s cubic-bezier(.34,1.56,.64,1) both; }
        .spin-anim { animation: spin .7s linear infinite; }

        @media (max-width: 767px) {
          .nav-links { display: none !important; }
          .main-layout {
            flex-direction: column !important;
            padding: 28px 20px 60px !important;
            gap: 32px !important;
          }
          .left-panel {
            flex: unset !important;
            position: static !important;
            width: 100% !important;
          }
          .left-panel h1 { font-size: 28px !important; }
          .feat-grid { display: none !important; }
          .right-panel { max-width: 100% !important; width: 100% !important; }
          .card-padding { padding: 20px 20px !important; }
          .card-header  { padding: 20px 20px 16px !important; }
          .card-footer  { padding: 14px 20px 18px !important; }
          .footer-bar   { padding: 18px 20px !important; flex-direction: column !important; gap: 6px !important; text-align: center !important; }
          .nav-bar      { padding: 14px 20px !important; }
          .forgot-modal { max-width: calc(100vw - 32px) !important; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className="toast-in" style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 100,
          display: 'flex', alignItems: 'center', gap: 10,
          background: toast.type === 'success' ? `${C.emerald}18` : '#f8717118',
          border: `1px solid ${toast.type === 'success' ? C.emerald + '44' : '#f8717144'}`,
          borderRadius: 12, padding: '14px 18px',
          boxShadow: '0 16px 40px rgba(0,0,0,.5)',
          backdropFilter: 'blur(12px)',
          maxWidth: 320,
        }}>
          <span style={{ fontSize: 20 }}>{toast.type === 'success' ? '✅' : '🚨'}</span>
          <p style={{ fontSize: 13, fontWeight: 700, color: toast.type === 'success' ? C.emerald : '#f87171' }}>{toast.message}</p>
        </div>
      )}

      {/* Ambient blobs */}
      <div style={{ position:'fixed', top:'-20%', left:'-15%', width:600, height:600, borderRadius:'50%', background:`radial-gradient(circle,${C.indigo}12,transparent 70%)`, pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', top:'50%', right:'-15%', width:480, height:480, borderRadius:'50%', background:`radial-gradient(circle,#7c3aed10,transparent 70%)`, pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', bottom:'5%', left:'25%', width:360, height:360, borderRadius:'50%', background:`radial-gradient(circle,#0ea5e90d,transparent 70%)`, pointerEvents:'none', zIndex:0 }} />

      {/* NAV */}
      <nav className="nav-bar" style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 52px',
        background: 'rgba(8,8,18,.8)',
        backdropFilter: 'blur(24px)',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', userSelect: 'none' }}>
            <span style={{ color: C.indigo }}>Study</span>Flow
          </span>
        </Link>
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link to="/" className="nav-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.muted, textDecoration: 'none', fontWeight: 500 }}>← Home</Link>
          <Link to="/register" style={{
            background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 15px',
            fontSize: 13, color: C.muted, textDecoration: 'none', fontWeight: 500,
            transition: 'border-color .2s, color .2s',
          }}>Register</Link>
        </div>
        <div style={{ display: isMobile ? 'flex' : 'none', alignItems: 'center', gap: 12 }}>
          <Link to="/" style={{ fontSize: 12, color: C.muted, textDecoration: 'none', fontWeight: 600 }}>← Home</Link>
          <Link to="/register" style={{
            background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 12px',
            fontSize: 12, color: C.muted, textDecoration: 'none', fontWeight: 600,
          }}>Register</Link>
        </div>
      </nav>

      {/* MAIN LAYOUT */}
      <div className="main-layout" style={{
        position: 'relative', zIndex: 1,
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        maxWidth: 1280,
        width: '100%',
        margin: '0 auto',
        padding: '56px 52px 80px',
        gap: 72,
        alignItems: 'flex-start',
      }}>

        {/* LEFT — Info panel */}
        <div className="left-panel" style={{ flex: '0 0 380px', position: 'sticky', top: 80 }}>
          <div className="fu1" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
            color: C.indigoFg, background: `${C.indigo}18`, border: `1px solid ${C.indigo}30`,
            borderRadius: 100, padding: '5px 14px', marginBottom: 22,
          }}>✦ Welcome Back</div>

          <h1 className="fu2" style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.08, letterSpacing: '-1.5px', marginBottom: 16 }}>
            Pick up right<br />
            <span style={{ background: `linear-gradient(105deg,${C.indigo},${C.indigoFg})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              where you left off.
            </span>
          </h1>

          <p className="fu2" style={{ fontSize: 15, color: C.muted, lineHeight: 1.75, marginBottom: 32, maxWidth: 360 }}>
            Sign back in to access your subjects, assignments, grades, notes, and AI assistant — everything exactly as you left it.
          </p>

          <div className="feat-grid fu3" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
            {[
              { icon: '🗂️', label: 'Subjects',     desc: 'Your colour-coded courses',      color: C.indigo },
              { icon: '📋', label: 'Assignments',  desc: 'Tasks & upcoming deadlines',     color: C.emerald },
              { icon: '📊', label: 'Grades',       desc: 'Scores & running averages',      color: C.amber },
              { icon: '🤖', label: 'AI Assistant', desc: 'Your personal study companion',  color: C.violet },
            ].map(f => (
              <div key={f.label} className="feat-card-sm" style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: '13px 16px',
                transition: 'background .2s, border-color .2s, transform .2s',
                cursor: 'default',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${f.color}15`, border: `1px solid ${f.color}28`, fontSize: 18,
                }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="fu4" style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 20 }}>
            {['🆓 Always Free','🔒 Supabase Auth','🤖 AI-Powered','📅 Calendar'].map(t => (
              <span key={t} style={{
                fontSize: 11, color: C.indigoFg,
                background: `${C.indigo}14`, border: `1px solid ${C.indigo}28`,
                borderRadius: 6, padding: '4px 9px', fontWeight: 600,
              }}>{t}</span>
            ))}
          </div>

          <div className="fu4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: C.emerald, boxShadow: `0 0 7px ${C.emerald}99` }} />
            ))}
            <span style={{ fontSize: 12, color: C.muted }}>Trusted by 500+ students</span>
          </div>
        </div>

        {/* RIGHT — Form card */}
        <div className="right-panel" style={{ flex: 1, minWidth: 0, maxWidth: 480 }}>
          <div className={`fu2 ${shaking ? 'shake' : ''}`} style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: `0 32px 80px rgba(0,0,0,.45), 0 0 0 1px ${C.indigo}0c`,
          }}>
            <div style={{ height: 3, background: `linear-gradient(90deg,${C.indigo},${C.violet},${C.indigoFg})` }} />

            <div className="card-header" style={{
              padding: '28px 32px 24px',
              borderBottom: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: C.text, letterSpacing: '-0.5px', marginBottom: 4 }}>Sign in to your account</h2>
                <p style={{ fontSize: 13, color: C.muted }}>Enter your credentials to continue</p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['#ff5f57','#febc2e','#28c840'].map(bg => (
                  <span key={bg} style={{ width: 11, height: 11, borderRadius: '50%', background: bg, display: 'inline-block', boxShadow: `0 0 6px ${bg}88` }} />
                ))}
              </div>
            </div>

            <div className="card-padding" style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* ── Google Sign In ── */}
              <div className="fu3">
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.muted, marginBottom: 10, textAlign: 'center' }}>
                  Quick sign in
                </p>
                <button
                  type="button"
                  className="google-btn"
                  onClick={handleGoogleLogin}
                  disabled={oauthLoading || isLoading || !!isLocked}
                  aria-label="Sign in with Google"
                >
                  {oauthLoading ? (
                    <span className="spin-anim" style={{
                      display: 'inline-block', width: 15, height: 15,
                      border: `2px solid rgba(255,255,255,0.3)`,
                      borderTopColor: C.textSoft,
                      borderRadius: '50%',
                    }} />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>or with email</span>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>
              </div>

              {/* Email */}
              <div className="fu3">
                <label style={labelStyle}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none' }}>
                    {emailValid ? '✅' : '📧'}
                  </span>
                  <input
                    {...register('email', {
                      required: 'Email is required',
                      pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
                    })}
                    type="email"
                    placeholder="your@email.com"
                    className={`login-input ${emailValid ? 'login-input-ok' : ''}`}
                    style={inputBase}
                  />
                </div>
                {errors.email && <p style={errorStyle}><span>⚠</span>{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="fu4">
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none' }}>🔒</span>
                  <input
                    {...register('password', { required: 'Password is required' })}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="login-input"
                    style={{ ...inputBase, paddingRight: 44 }}
                    onKeyDown={handlePasswordKeyDown}
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={togglePassword}
                    title={showPassword ? 'Hides in 3s' : 'Show password'}
                    style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: showPassword ? C.indigoFg : C.muted, transition: 'color .2s' }}
                  >{showPassword ? '🙈' : '👁️'}</button>
                </div>
                {errors.password && <p style={errorStyle}><span>⚠</span>{errors.password.message}</p>}

                {showPassword && (
                  <p style={{ fontSize: 11, color: C.muted, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>🔐</span> Password hides automatically in 3s
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={handleOpenForgot}
                    className="forgot-link"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.indigoMid, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'color .2s' }}
                  >Forgot password?</button>
                </div>
              </div>

              {/* Rate limit warning */}
              {isLocked && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: `${C.amber}12`, border: `1px solid ${C.amber}30`,
                  borderRadius: 10, padding: '12px 14px',
                }}>
                  <span style={{ fontSize: 18 }}>⏳</span>
                  <div>
                    <p style={{ fontSize: 13, color: C.amber, fontWeight: 700 }}>Too many failed attempts</p>
                    <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                      Try again in <span style={{ color: C.amber, fontWeight: 700 }}>{countdown}s</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Server error */}
              {serverError && !isLocked && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  background: '#f8717110', border: '1px solid #f8717130',
                  borderRadius: 10, padding: '12px 14px',
                }}>
                  <span>🚨</span>
                  <div>
                    <p style={{ fontSize: 13, color: '#f87171', fontWeight: 600 }}>{serverError}</p>
                    {failCount > 0 && failCount < 3 && (
                      <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                        {3 - failCount} attempt{3 - failCount !== 1 ? 's' : ''} remaining before 30s lockout
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Sign In button */}
              <div className="fu5">
                <button
                  onClick={handleSubmit(onSubmit)}
                  disabled={isLoading || !!isLocked || oauthLoading}
                  className="cta-btn"
                  style={{
                    width: '100%',
                    background: isLocked ? C.surface2 : C.indigo,
                    color: isLocked ? C.muted : '#fff',
                    border: isLocked ? `1px solid ${C.border}` : 'none',
                    borderRadius: 10,
                    padding: '14px',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: (isLoading || isLocked || oauthLoading) ? 'not-allowed' : 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    transition: 'opacity .2s, transform .15s, background .3s',
                    boxShadow: isLocked ? 'none' : `0 8px 28px ${C.indigo}44`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: (isLoading || isLocked || oauthLoading) ? 0.75 : 1,
                  }}
                >
                  {isLocked ? (
                    <>⏳ Locked — wait {countdown}s</>
                  ) : isLoading ? (
                    <>
                      <span className="spin-anim" style={{
                        display: 'inline-block', width: 15, height: 15,
                        border: `2px solid rgba(255,255,255,0.3)`,
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                      }} />
                      Signing in…
                    </>
                  ) : 'Sign In →'}
                </button>
              </div>
            </div>

            <div className="card-footer" style={{
              padding: '18px 32px 22px',
              borderTop: `1px solid ${C.border}`,
              background: C.surface2,
              textAlign: 'center',
            }}>
              <p style={{ fontSize: 13, color: C.muted }}>
                Don't have an account?{' '}
                <Link to="/register" className="register-link" style={{ color: C.indigoMid, fontWeight: 700, textDecoration: 'none', transition: 'color .2s' }}>
                  Register for free →
                </Link>
              </p>
            </div>
          </div>

          <div className="fu6" style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
            <button
              onClick={() => setShowGuide(true)}
              className="guide-btn"
              style={{
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: '8px 16px', fontSize: 12, color: C.muted, cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
                transition: 'background .2s, border-color .2s',
              }}
            >✨ How does StudyFlow work?</button>
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 16 }} className="fu6">
            🔒 Secured with Supabase Auth
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer-bar" style={{
        position: 'relative', zIndex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '22px 52px',
        borderTop: `1px solid ${C.border}`,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>
            <span style={{ color: C.indigo }}>Study</span>Flow
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>The academic command centre for students.</div>
        </div>
        <span style={{ fontSize: 12, color: C.muted }}>© {new Date().getFullYear()} StudyFlow · Built for students.</span>
      </footer>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div
          onClick={e => { if (e.target === e.currentTarget) handleCloseForgot() }}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
            background: 'rgba(0,0,0,.72)',
            backdropFilter: 'blur(6px)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          <div
            className="modal-in forgot-modal"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 20,
              width: '100%',
              maxWidth: 400,
              overflow: 'hidden',
              boxShadow: `0 40px 100px rgba(0,0,0,.6), 0 0 0 1px ${C.indigo}18`,
            }}
          >
            <div style={{ height: 3, background: `linear-gradient(90deg,${C.indigo},${C.violet},${C.indigoFg})` }} />

            {!forgotSuccess ? (
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{
                      width: 42, height: 42, borderRadius: 11, marginBottom: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${C.indigo}18`, border: `1px solid ${C.indigo}30`, fontSize: 20,
                    }}>🔑</div>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 6, letterSpacing: '-0.3px' }}>Reset your password</h3>
                    <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                      Enter your email and we'll send you a link to reset your password.
                    </p>
                  </div>
                  <button
                    onClick={handleCloseForgot}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: C.muted, transition: 'color .2s', fontFamily: 'inherit', padding: 4, lineHeight: 1 }}
                  >✕</button>
                </div>

                <div>
                  <label style={labelStyle}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none' }}>📧</span>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => { setForgotEmail(e.target.value); setForgotError('') }}
                      onKeyDown={e => e.key === 'Enter' && handleForgotPassword()}
                      placeholder="your@email.com"
                      className="login-input"
                      style={inputBase}
                      autoFocus
                    />
                  </div>
                  {forgotError && <p style={errorStyle}><span>⚠</span>{forgotError}</p>}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={handleCloseForgot}
                    className="cancel-btn"
                    style={{
                      flex: 1, padding: '12px', borderRadius: 10, fontSize: 13,
                      color: C.muted, fontWeight: 600, cursor: 'pointer',
                      background: C.surface2, border: `1px solid ${C.border}`,
                      fontFamily: 'inherit', transition: 'border-color .2s, color .2s',
                    }}
                  >Cancel</button>
                  <button
                    onClick={handleForgotPassword}
                    disabled={forgotLoading}
                    className="cta-btn"
                    style={{
                      flex: 1, padding: '12px', borderRadius: 10, fontSize: 13,
                      color: '#fff', fontWeight: 700, cursor: 'pointer',
                      background: C.indigo, border: 'none', fontFamily: 'inherit',
                      boxShadow: `0 6px 20px ${C.indigo}44`,
                      transition: 'opacity .2s, transform .15s',
                      opacity: forgotLoading ? 0.6 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    {forgotLoading ? (
                      <>
                        <span className="spin-anim" style={{
                          display: 'inline-block', width: 13, height: 13,
                          border: `2px solid rgba(255,255,255,0.3)`,
                          borderTopColor: '#fff',
                          borderRadius: '50%',
                        }} />
                        Sending…
                      </>
                    ) : 'Send reset link'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '36px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${C.emerald}14`, border: `1px solid ${C.emerald}30`, fontSize: 28,
                }}>📬</div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8, letterSpacing: '-0.3px' }}>Check your inbox!</h3>
                  <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
                    We sent a reset link to{' '}
                    <span style={{ color: C.indigoFg, fontWeight: 700 }}>{forgotEmail}</span>.
                    {' '}Check your spam folder if you don't see it.
                  </p>
                </div>
                <button
                  onClick={handleCloseForgot}
                  className="cta-btn"
                  style={{
                    width: '100%', padding: '13px', borderRadius: 10, fontSize: 14,
                    color: '#fff', fontWeight: 700, cursor: 'pointer',
                    background: C.indigo, border: 'none', fontFamily: 'inherit',
                    boxShadow: `0 6px 20px ${C.indigo}44`,
                    transition: 'opacity .2s, transform .15s',
                  }}
                >Back to Sign In</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
    </div>
  )
}