import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'
import GuideModal from '../components/GuideModal'

/* ─── Design tokens — identical to Register.jsx ───────────────── */
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
  const { register, handleSubmit, formState: { errors }, getValues } = useForm()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError]   = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showGuide,    setShowGuide]    = useState(false)

  const [showForgot,    setShowForgot]    = useState(false)
  const [forgotEmail,   setForgotEmail]   = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [forgotError,   setForgotError]   = useState('')

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

  /* ── Shared inline styles ── */
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
        .login-eye-btn:hover { color: ${C.textSoft} !important; }
        .cta-btn:hover  { opacity: .88 !important; transform: translateY(-1px); }
        .cta-btn:active { transform: translateY(0) !important; }
        .nav-btn:hover  { color: ${C.textSoft} !important; }
        .register-link:hover { color: ${C.indigoFg} !important; }
        .forgot-link:hover   { color: ${C.indigoFg} !important; }
        .guide-btn:hover { background: ${C.surface2} !important; border-color: ${C.borderHi} !important; }
        .feat-card-sm:hover {
          background: ${C.surface2} !important;
          border-color: ${C.indigo}44 !important;
          transform: translateY(-2px);
        }

        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes badgeFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes modalIn {
          from { opacity:0; transform:scale(.96) translateY(12px); }
          to   { opacity:1; transform:scale(1)   translateY(0); }
        }

        .fu1 { animation: fadeUp .55s ease .05s both; }
        .fu2 { animation: fadeUp .55s ease .12s both; }
        .fu3 { animation: fadeUp .55s ease .20s both; }
        .fu4 { animation: fadeUp .55s ease .28s both; }
        .fu5 { animation: fadeUp .55s ease .36s both; }
        .fu6 { animation: fadeUp .55s ease .44s both; }
        .modal-in { animation: modalIn .25s cubic-bezier(.34,1.56,.64,1) both; }

        .forgot-input:focus {
          border-color: ${C.indigoMid} !important;
          box-shadow: 0 0 0 3px ${C.indigo}22 !important;
        }
        .cancel-btn:hover { border-color: ${C.borderHi} !important; color: ${C.textSoft} !important; }
      `}</style>

      {/* ── Ambient blobs ── */}
      <div style={{ position:'fixed', top:'-20%', left:'-15%', width:600, height:600, borderRadius:'50%', background:`radial-gradient(circle,${C.indigo}12,transparent 70%)`, pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', top:'50%', right:'-15%', width:480, height:480, borderRadius:'50%', background:`radial-gradient(circle,#7c3aed10,transparent 70%)`, pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', bottom:'5%', left:'25%', width:360, height:360, borderRadius:'50%', background:`radial-gradient(circle,#0ea5e90d,transparent 70%)`, pointerEvents:'none', zIndex:0 }} />

      {/* ── NAV ── */}
      <nav style={{
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link to="/" className="nav-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.muted, textDecoration: 'none', fontWeight: 500 }}>← Home</Link>
          <Link to="/register" style={{
            background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 15px',
            fontSize: 13, color: C.muted, textDecoration: 'none', fontWeight: 500,
            transition: 'border-color .2s, color .2s',
          }}>Register</Link>
        </div>
      </nav>

      {/* ── MAIN LAYOUT ── */}
      <div style={{
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

        {/* ══════════════ LEFT — Info panel ══════════════ */}
        <div style={{ flex: '0 0 380px', position: 'sticky', top: 80 }}>

          {/* eyebrow */}
          <div className="fu1" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
            color: C.indigoFg, background: `${C.indigo}18`, border: `1px solid ${C.indigo}30`,
            borderRadius: 100, padding: '5px 14px', marginBottom: 22,
          }}>✦ Welcome Back</div>

          {/* headline */}
          <h1 className="fu2" style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.08, letterSpacing: '-1.5px', marginBottom: 16 }}>
            Pick up right<br />
            <span style={{ background: `linear-gradient(105deg,${C.indigo},${C.indigoFg})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              where you left off.
            </span>
          </h1>

          <p className="fu2" style={{ fontSize: 15, color: C.muted, lineHeight: 1.75, marginBottom: 32, maxWidth: 360 }}>
            Sign back in to access your subjects, assignments, grades, notes, and AI assistant — everything exactly as you left it.
          </p>

          {/* feature list */}
          <div className="fu3" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
            {[
              { icon: '🗂️', label: 'Subjects',     desc: 'Your colour-coded courses',     color: C.indigo },
              { icon: '📋', label: 'Assignments',  desc: 'Tasks & upcoming deadlines',    color: C.emerald },
              { icon: '📊', label: 'Grades',       desc: 'Scores & running averages',     color: C.amber },
              { icon: '🤖', label: 'AI Assistant', desc: 'Your personal study companion', color: C.violet },
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

          {/* proof tags */}
          <div className="fu4" style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 20 }}>
            {['🆓 Always Free','🔒 Supabase Auth','🤖 AI-Powered','📅 Calendar'].map(t => (
              <span key={t} style={{
                fontSize: 11, color: C.indigoFg,
                background: `${C.indigo}14`, border: `1px solid ${C.indigo}28`,
                borderRadius: 6, padding: '4px 9px', fontWeight: 600,
              }}>{t}</span>
            ))}
          </div>

          {/* social proof */}
          <div className="fu4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: C.emerald, boxShadow: `0 0 7px ${C.emerald}99` }} />
            ))}
            <span style={{ fontSize: 12, color: C.muted }}>Trusted by 500+ students</span>
          </div>
        </div>

        {/* ══════════════ RIGHT — Form card ══════════════ */}
        <div style={{ flex: 1, minWidth: 0, maxWidth: 480 }}>

          {/* card */}
          <div className="fu2" style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: `0 32px 80px rgba(0,0,0,.45), 0 0 0 1px ${C.indigo}0c`,
          }}>
            {/* top accent */}
            <div style={{ height: 3, background: `linear-gradient(90deg,${C.indigo},${C.violet},${C.indigoFg})` }} />

            {/* card header */}
            <div style={{
              padding: '28px 32px 24px',
              borderBottom: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.5px', marginBottom: 4 }}>Sign in to your account</h2>
                <p style={{ fontSize: 13, color: C.muted }}>Enter your credentials to continue</p>
              </div>
              {/* traffic-light dots */}
              <div style={{ display: 'flex', gap: 6 }}>
                {['#ff5f57','#febc2e','#28c840'].map(bg => (
                  <span key={bg} style={{ width: 11, height: 11, borderRadius: '50%', background: bg, display: 'inline-block', boxShadow: `0 0 6px ${bg}88` }} />
                ))}
              </div>
            </div>

            {/* form fields */}
            <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Email */}
              <div className="fu3">
                <label style={labelStyle}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none' }}>📧</span>
                  <input
                    {...register('email', {
                      required: 'Email is required',
                      pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
                    })}
                    type="email"
                    placeholder="your@email.com"
                    className="login-input"
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
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowPassword(v => !v)}
                    style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: C.muted, transition: 'color .2s' }}
                  >{showPassword ? '🙈' : '👁️'}</button>
                </div>
                {errors.password && <p style={errorStyle}><span>⚠</span>{errors.password.message}</p>}

                {/* Forgot password link */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={handleOpenForgot}
                    className="forgot-link"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.indigoMid, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'color .2s' }}
                  >Forgot password?</button>
                </div>
              </div>

              {/* Server error */}
              {serverError && (
                <div className="fu5" style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  background: '#f8717110', border: '1px solid #f8717130',
                  borderRadius: 10, padding: '12px 14px',
                }}>
                  <span>🚨</span>
                  <p style={{ fontSize: 13, color: '#f87171', fontWeight: 600 }}>{serverError}</p>
                </div>
              )}

              {/* Submit */}
              <div className="fu5">
                <button
                  onClick={handleSubmit(onSubmit)}
                  className="cta-btn"
                  style={{
                    width: '100%',
                    background: C.indigo,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '14px',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    transition: 'opacity .2s, transform .15s',
                    boxShadow: `0 8px 28px ${C.indigo}44`,
                  }}
                >Sign In →</button>
              </div>

            </div>

            {/* card footer */}
            <div style={{
              padding: '18px 32px 22px',
              borderTop: `1px solid ${C.border}`,
              background: C.surface2,
              textAlign: 'center',
            }}>
              <p style={{ fontSize: 13, color: C.muted }}>
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="register-link"
                  style={{ color: C.indigoMid, fontWeight: 700, textDecoration: 'none', transition: 'color .2s' }}
                >Register for free →</Link>
              </p>
            </div>
          </div>

          {/* Guide button — below card */}
          <div className="fu6" style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
            <button
              onClick={() => setShowGuide(true)}
              className="guide-btn"
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 12,
                color: C.muted,
                cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                transition: 'background .2s, border-color .2s',
              }}
            >✨ How does StudyFlow work?</button>
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 16 }} className="fu6">
            🔒 Secured with Supabase Auth
          </p>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{
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

      {/* ── Forgot Password Modal ── */}
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
            className="modal-in"
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
            {/* top accent */}
            <div style={{ height: 3, background: `linear-gradient(90deg,${C.indigo},${C.violet},${C.indigoFg})` }} />

            {!forgotSuccess ? (
              <div style={{ padding: '28px 28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* header */}
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

                {/* email input */}
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
                      className="forgot-input login-input"
                      style={inputBase}
                      autoFocus
                    />
                  </div>
                  {forgotError && (
                    <p style={errorStyle}><span>⚠</span>{forgotError}</p>
                  )}
                </div>

                {/* actions */}
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
                      background: C.indigo, border: 'none',
                      fontFamily: 'inherit',
                      boxShadow: `0 6px 20px ${C.indigo}44`,
                      transition: 'opacity .2s, transform .15s',
                      opacity: forgotLoading ? 0.6 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    {forgotLoading ? (
                      <>
                        <span style={{
                          display: 'inline-block', width: 13, height: 13,
                          border: `2px solid ${C.indigoFg}44`,
                          borderTopColor: C.indigoFg,
                          borderRadius: '50%',
                          animation: 'spin 0.7s linear infinite',
                        }} />
                        Sending…
                      </>
                    ) : 'Send reset link'}
                  </button>
                </div>
              </div>
            ) : (
              /* Success state */
              <div style={{ padding: '36px 28px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
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