import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GuideModal from '../components/GuideModal'

/* ─── Design tokens — identical to Home.jsx ───────────────────── */
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

export default function Register() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError]   = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [showGuide,    setShowGuide]    = useState(false)
  const [emailSent,    setEmailSent]    = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [visible, setVisible] = useState(false)

  useEffect(() => { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t) }, [])

  const passwordValue  = watch('password', '')
  const confirmValue   = watch('confirmPassword', '')
  const passwordsMatch = confirmValue && passwordValue === confirmValue

  async function onSubmit(data) {
    try {
      setServerError('')
      await registerUser(data.email, data.password, data.name)
      setRegisteredEmail(data.email)
      setEmailSent(true)
    } catch (err) {
      setServerError(err.message)
    }
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

  /* ──────────────────── EMAIL SENT SCREEN ──────────────────── */
  if (emailSent) {
    return (
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: C.bg,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          @keyframes bounceIn { 0%{opacity:0;transform:scale(.6)} 70%{transform:scale(1.05)} 100%{opacity:1;transform:scale(1)} }
          .bounce-in { animation: bounceIn .55s cubic-bezier(.34,1.56,.64,1) forwards; }
        `}</style>

        {/* ambient blobs */}
        <div style={{ position:'fixed', top:'-20%', left:'-15%', width:600, height:600, borderRadius:'50%', background:`radial-gradient(circle,${C.indigo}12,transparent 70%)`, pointerEvents:'none' }} />
        <div style={{ position:'fixed', bottom:'5%', right:'-10%', width:400, height:400, borderRadius:'50%', background:`radial-gradient(circle,#7c3aed10,transparent 70%)`, pointerEvents:'none' }} />

        <div className="bounce-in" style={{
          position: 'relative',
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: '48px 40px',
          maxWidth: 440,
          width: '100%',
          textAlign: 'center',
          boxShadow: `0 40px 80px rgba(0,0,0,.5), 0 0 0 1px ${C.indigo}18`,
        }}>
          {/* top accent line */}
          <div style={{ position:'absolute', top:0, left:0, right:0, height:3, borderRadius:'20px 20px 0 0', background:`linear-gradient(90deg,${C.indigo},${C.violet},${C.indigoFg})` }} />

          <div style={{ fontSize: 56, marginBottom: 20 }}>📬</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 8, letterSpacing: '-0.5px' }}>Check your inbox!</h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>We sent a confirmation link to:</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.indigoFg, marginBottom: 24, wordBreak: 'break-all' }}>{registeredEmail}</p>

          <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', marginBottom: 28, textAlign: 'left' }}>
            {[
              ['📩', 'Click the link in the email to verify your account.'],
              ['🕐', <>Link expires in <span style={{ color: C.indigoFg, fontWeight: 700 }}>24 hours</span>.</>],
              ['📁', <>Can't find it? Check your <span style={{ color: C.indigoFg, fontWeight: 700 }}>spam/junk</span> folder.</>],
            ].map(([icon, text], i) => (
              <p key={i} style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, display: 'flex', gap: 8, marginBottom: i < 2 ? 6 : 0 }}>
                <span>{icon}</span><span>{text}</span>
              </p>
            ))}
          </div>

          <Link to="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: C.indigo, color: '#fff', textDecoration: 'none',
            padding: '12px 32px', borderRadius: 10, fontSize: 14, fontWeight: 700,
            transition: 'opacity .2s',
          }}>
            Go to Sign In →
          </Link>

          <p style={{ fontSize: 12, color: C.muted, marginTop: 20 }}>
            Wrong email?{' '}
            <button onClick={() => { setEmailSent(false); setServerError('') }}
              style={{ background: 'none', border: 'none', color: C.indigoFg, cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              Go back
            </button>
          </p>
        </div>
      </div>
    )
  }

  /* ──────────────────── MAIN REGISTER PAGE ──────────────────── */
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
        html { scroll-behavior: smooth; }
        body { background: ${C.bg}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.indigo}44; border-radius: 4px; }

        .reg-input:focus {
          border-color: ${C.indigoMid} !important;
          box-shadow: 0 0 0 3px ${C.indigo}22 !important;
        }
        .reg-input-ok {
          border-color: ${C.emerald}66 !important;
          box-shadow: 0 0 0 3px ${C.emerald}14 !important;
        }
        .reg-input-bad {
          border-color: #f8717166 !important;
          box-shadow: 0 0 0 3px #f8717114 !important;
        }
        .reg-eye-btn:hover { color: ${C.textSoft} !important; }

        @keyframes fadeUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes badgeFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes spinRev  { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }

        .fu1 { animation: fadeUp .55s ease .05s both; }
        .fu2 { animation: fadeUp .55s ease .12s both; }
        .fu3 { animation: fadeUp .55s ease .20s both; }
        .fu4 { animation: fadeUp .55s ease .28s both; }
        .fu5 { animation: fadeUp .55s ease .36s both; }
        .fu6 { animation: fadeUp .55s ease .44s both; }

        .spin-ring     { animation: spin    20s linear infinite; }
        .spin-ring-rev { animation: spinRev 14s linear infinite; }

        .feat-card-sm:hover {
          background: ${C.surface2} !important;
          border-color: ${C.indigo}44 !important;
          transform: translateY(-2px);
        }
        .nav-btn:hover { color: ${C.textSoft} !important; }
        .cta-btn:hover { opacity: .88 !important; transform: translateY(-1px); }
        .cta-btn:active { transform: translateY(0) !important; }
        .signin-link:hover { color: ${C.indigoFg} !important; }
        .guide-btn:hover { background: ${C.surface2} !important; border-color: ${C.borderHi} !important; }
      `}</style>

      {/* ── Ambient blobs (same as Home) ── */}
      <div style={{ position:'fixed', top:'-20%', left:'-15%', width:600, height:600, borderRadius:'50%', background:`radial-gradient(circle,${C.indigo}12,transparent 70%)`, pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', top:'50%', right:'-15%', width:480, height:480, borderRadius:'50%', background:`radial-gradient(circle,#7c3aed10,transparent 70%)`, pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', bottom:'5%', left:'25%', width:360, height:360, borderRadius:'50%', background:`radial-gradient(circle,#0ea5e90d,transparent 70%)`, pointerEvents:'none', zIndex:0 }} />

      {/* ── NAV — same as Home ── */}
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
          <Link to="/login" style={{
            background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 15px',
            fontSize: 13, color: C.muted, textDecoration: 'none', fontWeight: 500,
            transition: 'border-color .2s, color .2s',
          }}>Sign In</Link>
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
        <div style={{
          flex: '0 0 380px',
          position: 'sticky',
          top: 80,
        }}>
          {/* eyebrow */}
          <div className="fu1" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
            color: C.indigoFg, background: `${C.indigo}18`, border: `1px solid ${C.indigo}30`,
            borderRadius: 100, padding: '5px 14px', marginBottom: 22,
          }}>✦ Join StudyFlow</div>

          {/* headline */}
          <h1 className="fu2" style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.08, letterSpacing: '-1.5px', marginBottom: 16 }}>
            Your academic<br />
            <span style={{ background: `linear-gradient(105deg,${C.indigo},${C.indigoFg})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              command centre.
            </span>
          </h1>

          <p className="fu2" style={{ fontSize: 15, color: C.muted, lineHeight: 1.75, marginBottom: 32, maxWidth: 360 }}>
            Create your free account and get access to every tool a student needs — subjects, tasks, grades, notes, calendar, Pomodoro, and AI — all in one place.
          </p>

          {/* feature list */}
          <div className="fu3" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
            {[
              { icon: '🗂️', label: 'Subjects',     desc: 'Colour-coded courses', color: C.indigo },
              { icon: '📋', label: 'Assignments',  desc: 'Track tasks & deadlines', color: C.emerald },
              { icon: '📊', label: 'Grades',       desc: 'Scores & averages', color: C.amber },
              { icon: '🤖', label: 'AI Assistant', desc: 'Instant help on coursework', color: C.violet },
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
                <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.5px', marginBottom: 4 }}>Create your account</h2>
                <p style={{ fontSize: 13, color: C.muted }}>Fill in your details to get started</p>
              </div>
              {/* traffic-light dots — same as DashboardMock */}
              <div style={{ display: 'flex', gap: 6 }}>
                {['#ff5f57','#febc2e','#28c840'].map(bg => (
                  <span key={bg} style={{ width: 11, height: 11, borderRadius: '50%', background: bg, display: 'inline-block', boxShadow: `0 0 6px ${bg}88` }} />
                ))}
              </div>
            </div>

            {/* form fields */}
            <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Name */}
              <div className="fu3">
                <label style={labelStyle}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none' }}>🧑‍🎓</span>
                  <input
                    {...register('name', { required: 'Name is required' })}
                    type="text"
                    placeholder="Enter your full name"
                    className="reg-input"
                    style={inputBase}
                  />
                </div>
                {errors.name && <p style={errorStyle}><span>⚠</span>{errors.name.message}</p>}
              </div>

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
                    className="reg-input"
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
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 6, message: 'Minimum 6 characters' }
                    })}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    className="reg-input"
                    style={{ ...inputBase, paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    className="reg-eye-btn"
                    onClick={() => setShowPassword(v => !v)}
                    style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: C.muted, transition: 'color .2s' }}
                  >{showPassword ? '🙈' : '👁️'}</button>
                </div>
                {errors.password && <p style={errorStyle}><span>⚠</span>{errors.password.message}</p>}

                {/* strength bar */}
                {passwordValue && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                      {[
                        { min: 6,  color: '#f87171' },
                        { min: 8,  color: C.amber },
                        { min: 10, color: C.emerald },
                        { min: 12, color: C.indigoFg },
                      ].map((seg, i) => (
                        <div key={i} style={{
                          flex: 1, height: 3, borderRadius: 4,
                          background: passwordValue.length >= seg.min ? seg.color : C.surface2,
                          border: `1px solid ${C.border}`,
                          transition: 'background .3s',
                          boxShadow: passwordValue.length >= seg.min ? `0 0 8px ${seg.color}66` : 'none',
                        }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>
                      {passwordValue.length < 6  ? 'Too short'   :
                       passwordValue.length < 8  ? '🔴 Weak'     :
                       passwordValue.length < 10 ? '🟡 Fair'     :
                       passwordValue.length < 12 ? '🟢 Good'     : '✨ Strong'}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="fu4">
                <label style={labelStyle}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none' }}>
                    {confirmValue ? (passwordsMatch ? '✅' : '❌') : '🔑'}
                  </span>
                  <input
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: val => val === watch('password') || 'Passwords do not match'
                    })}
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    className={`reg-input ${confirmValue ? (passwordsMatch ? 'reg-input-ok' : 'reg-input-bad') : ''}`}
                    style={{ ...inputBase, paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    className="reg-eye-btn"
                    onClick={() => setShowConfirm(v => !v)}
                    style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: C.muted, transition: 'color .2s' }}
                  >{showConfirm ? '🙈' : '👁️'}</button>
                </div>
                {confirmValue && (
                  <p style={{ ...errorStyle, color: passwordsMatch ? C.emerald : '#f87171', marginTop: 6 }}>
                    {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}
                {errors.confirmPassword && !confirmValue && (
                  <p style={errorStyle}><span>⚠</span>{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* server error */}
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

              {/* Submit — same style as Home's "Start for Free" button */}
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
                >
                  Create Account →
                </button>
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
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="signin-link"
                  style={{ color: C.indigoMid, fontWeight: 700, textDecoration: 'none', transition: 'color .2s' }}
                >
                  Sign in →
                </Link>
              </p>
            </div>
          </div>

          {/* Guide button — below card */}
          <div className="fu6" style={{ display: 'flex', justifyContent: 'center', marginTop: 20, gap: 16 }}>
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
            >
              ✨ How does StudyFlow work?
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 16 }} className="fu6">
            🔒 Secured with Supabase Auth
          </p>
        </div>

      </div>

      {/* ── FOOTER — same as Home ── */}
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

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
    </div>
  )
}