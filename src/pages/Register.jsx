import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../hooks/useTheme'
import { supabase } from '../utils/supabase'   // ← FIXED: import directly
import GuideModal from '../components/GuideModal'
import {
  Sparkles,
  FolderKanban,
  ClipboardList,
  BarChart3,
  Bot,
  Gift,
  Lock,
  Calendar,
  GraduationCap,
  Mail,
  MailCheck,
  Clock,
  FolderOpen,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  Check,
  X,
  Sun,
  Moon,
} from 'lucide-react'

/* ─── Design tokens — StudyFlow Professional Palette ─────────────
   Light + dark palettes, selected at render time from the persisted
   theme (same source of truth as the dashboard / Home page).        */
const C_LIGHT = {
  bg:        '#F8F7FC',
  surface:   '#FFFFFF',
  surface2:  '#EEF2FF',
  border:    '#E6E4F2',
  borderHi:  '#C7D2FE',
  indigo:    '#4F46E5',
  indigoMid: '#7C3AED',
  indigoFg:  '#4F46E5',
  accent:    '#A78BFA',
  emerald:   '#22C55E',
  amber:     '#F59E0B',
  violet:    '#7C3AED',
  text:      '#1F2937',
  textSoft:  '#4B5563',
  muted:     '#6B7280',
  error:     '#EF4444',
  errorText: '#DC2626',
  navBg:     'rgba(255,255,255,.85)',
  shadowSoft:'rgba(31,41,55,0.04)',
  overlay:   'rgba(31,41,55,.45)',
}

const C_DARK = {
  bg:        '#0B0D12',
  surface:   '#151822',
  surface2:  '#1C1F2E',
  border:    '#262A38',
  borderHi:  '#3730A3',
  indigo:    '#6366F1',
  indigoMid: '#8B5CF6',
  indigoFg:  '#818CF8',
  accent:    '#A78BFA',
  emerald:   '#34D399',
  amber:     '#FBBF24',
  violet:    '#A78BFA',
  text:      '#F3F4F6',
  textSoft:  '#CBD5E1',
  muted:     '#94A3B8',
  error:     '#F87171',
  errorText: '#FCA5A5',
  navBg:     'rgba(11,13,18,.85)',
  shadowSoft:'rgba(0,0,0,0.35)',
  overlay:   'rgba(0,0,0,.55)',
}

/* ─── Shared gradient-text style ────────────────────────────────────
   Both the standard and Webkit-prefixed background-clip properties
   are required — without both plus a transparent color fallback, the
   gradient can paint as a solid block instead of clipping to text.   */
const gradientText = (C) => ({
  background: `linear-gradient(105deg,${C.indigo},${C.violet})`,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  color: 'transparent',
  display: 'inline-block',
})

/* ─── Legal content ───────────────────────────────────────────── */
const LEGAL = {
  terms: {
    title: 'Terms of Service',
    lastUpdated: 'May 2026',
    sections: [
      {
        heading: '1. Acceptance of Terms',
        body: 'By creating an account and using StudyFlow, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the platform.',
      },
      {
        heading: '2. Use of the Service',
        body: 'StudyFlow is a free academic management platform for students. You agree to use the service only for lawful educational purposes. You are responsible for maintaining the confidentiality of your account credentials.',
      },
      {
        heading: '3. User Content',
        body: 'You retain ownership of all content you create within StudyFlow (notes, tasks, grades, etc.). By using the service, you grant StudyFlow a limited licence to store and display your content solely to provide the service to you.',
      },
      {
        heading: '4. Prohibited Conduct',
        body: 'You must not attempt to gain unauthorised access to other accounts, reverse-engineer the platform, or use the service to distribute harmful or illegal content.',
      },
      {
        heading: '5. Service Availability',
        body: 'StudyFlow is provided "as is". We strive for high availability but cannot guarantee uninterrupted access. We reserve the right to modify or discontinue features with reasonable notice.',
      },
      {
        heading: '6. Termination',
        body: 'You may delete your account at any time. We may suspend or terminate accounts that violate these terms. Upon termination, your data will be deleted in accordance with our Privacy Policy.',
      },
      {
        heading: '7. Changes to Terms',
        body: 'We may update these terms from time to time. Continued use of StudyFlow after changes constitutes acceptance of the updated terms.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'May 2026',
    sections: [
      {
        heading: '1. Information We Collect',
        body: 'We collect information you provide directly: your name, email address, and the academic content you create (subjects, tasks, grades, notes). We also collect basic usage data such as login timestamps to improve the service.',
      },
      {
        heading: '2. How We Use Your Information',
        body: 'Your data is used solely to operate StudyFlow — to display your content to you, authenticate your account, and improve the platform. We do not sell your personal data to third parties.',
      },
      {
        heading: '3. Authentication',
        body: 'StudyFlow uses Supabase Auth to handle authentication securely. Passwords are hashed and never stored in plain text. OAuth sign-in (Google, GitHub) is handled entirely by those providers.',
      },
      {
        heading: '4. Data Storage',
        body: 'Your data is stored on Supabase infrastructure. Data is encrypted at rest and in transit. We retain your data for as long as your account is active.',
      },
      {
        heading: '5. Cookies & Local Storage',
        body: 'We use browser storage to maintain your session and remember your preferences (such as theme settings). We do not use tracking cookies or third-party advertising cookies.',
      },
      {
        heading: '6. Your Rights',
        body: 'You may access, correct, or delete your personal data at any time through your account settings. To request full data deletion, contact us and we will process it within 30 days.',
      },
      {
        heading: '7. Contact',
        body: 'For any privacy-related questions or requests, please reach out via the contact page. We are committed to responding within a reasonable timeframe.',
      },
    ],
  },
}

/* ─── Legal Modal Component (now themed via C prop) ─────────────── */
function LegalModal({ type, onClose, C }) {
  const content = LEGAL[type]

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: C.overlay,
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        animation: 'legalFadeIn .18s ease both',
      }}
    >
      <style>{`
        @keyframes legalFadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes legalSlideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        .legal-close:hover { background: ${C.surface2} !important; border-color: ${C.borderHi} !important; color: ${C.textSoft} !important; }
        .legal-scroll::-webkit-scrollbar { width: 4px; }
        .legal-scroll::-webkit-scrollbar-track { background: transparent; }
        .legal-scroll::-webkit-scrollbar-thumb { background: ${C.indigo}44; border-radius: 4px; }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={content.title}
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          width: '100%',
          maxWidth: 560,
          maxHeight: '82vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: `0 40px 90px ${C.shadowSoft}, 0 0 0 1px ${C.indigo}12`,
          animation: 'legalSlideUp .22s cubic-bezier(.22,1,.36,1) both',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: 3, background: `linear-gradient(90deg,${C.indigo},${C.violet},${C.indigoFg})`, flexShrink: 0 }} />

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '22px 28px 18px',
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: '-0.4px', marginBottom: 3 }}>
              {content.title}
            </h2>
            <p style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Last updated: {content.lastUpdated}</p>
          </div>
          <button
            onClick={onClose}
            className="legal-close"
            aria-label="Close"
            style={{
              background: C.surface2,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              color: C.muted,
              transition: 'background .2s, border-color .2s, color .2s',
              flexShrink: 0,
            }}
          ><X size={16} /></button>
        </div>

        <div
          className="legal-scroll"
          style={{
            overflowY: 'auto',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
          }}
        >
          {content.sections.map((s, i) => (
            <div key={i}>
              <h3 style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: C.indigoFg,
                marginBottom: 8,
              }}>{s.heading}</h3>
              <p style={{
                fontSize: 13,
                color: C.textSoft,
                lineHeight: 1.8,
              }}>{s.body}</p>
            </div>
          ))}

          <div style={{
            marginTop: 4,
            padding: '14px 16px',
            background: `${C.indigo}10`,
            border: `1px solid ${C.indigo}28`,
            borderRadius: 10,
          }}>
            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
              By checking the box on the registration form, you confirm that you have read and agree to this {content.title}.
            </p>
          </div>
        </div>

        <div style={{
          padding: '16px 28px',
          borderTop: `1px solid ${C.border}`,
          background: C.surface2,
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              background: C.indigo,
              color: '#fff',
              border: 'none',
              borderRadius: 9,
              padding: '10px 24px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              transition: 'opacity .2s',
            }}
          >Got it →</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Register Component ─────────────────────────────────── */
export default function Register() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const { register: registerUser } = useAuth()   // ← FIXED: removed supabase from here
  const { theme, toggleTheme } = useTheme()
  const C = theme === 'dark' ? C_DARK : C_LIGHT
  const navigate = useNavigate()
  const [serverError, setServerError]   = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [showGuide,    setShowGuide]    = useState(false)
  const [emailSent,    setEmailSent]    = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [isLoading, setIsLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsError,    setTermsError]    = useState(false)
  const [legalModal, setLegalModal] = useState(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const passwordValue  = watch('password', '')
  const confirmValue   = watch('confirmPassword', '')
  const passwordsMatch = confirmValue && passwordValue === confirmValue

  // ── FIXED: supabase is now imported directly so it's always defined ──
  async function handleOAuth(provider) {
    try {
      setServerError('')
      setOauthLoading(provider)

      if (!supabase?.auth) {
        throw new Error('Auth service unavailable. Please refresh and try again.')
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/dashboard` },
      })
      if (error) throw error
    } catch (err) {
      setServerError(err.message)
      setOauthLoading(null)
    }
  }

  async function onSubmit(data) {
    if (!termsAccepted) {
      setTermsError(true)
      return
    }
    try {
      setServerError('')
      setIsLoading(true)
      await registerUser(data.email, data.password, data.name)
      setRegisteredEmail(data.email)
      setEmailSent(true)
    } catch (err) {
      setServerError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const closeLegal = useCallback(() => setLegalModal(null), [])

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
    color: C.errorText,
    marginTop: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontWeight: 600,
  }

  const features = [
    { Icon: FolderKanban,  label: 'Subjects',     desc: 'Colour-coded courses',        color: C.indigo },
    { Icon: ClipboardList, label: 'Assignments',  desc: 'Track tasks & deadlines',     color: C.emerald },
    { Icon: BarChart3,     label: 'Grades',       desc: 'Scores & averages',           color: C.amber },
    { Icon: Bot,           label: 'AI Assistant', desc: 'Instant help on coursework',  color: C.violet },
  ]

  const badges = [
    { Icon: Gift,     label: 'Always Free' },
    { Icon: Lock,     label: 'Supabase Auth' },
    { Icon: Bot,      label: 'AI-Powered' },
    { Icon: Calendar, label: 'Calendar' },
  ]

  const themeToggleBtn = (size = 34) => (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      style={{
        background: 'none', border: `1px solid ${C.border}`, borderRadius: 8,
        width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: C.muted, transition: 'border-color .2s, color .2s', flexShrink: 0,
      }}
    >
      {theme === 'dark' ? <Sun size={size === 34 ? 16 : 15} /> : <Moon size={size === 34 ? 16 : 15} />}
    </button>
  )

  /* ──────────────────── EMAIL SENT SCREEN ──────────────────── */
  if (emailSent) {
    const inboxSteps = [
      { Icon: Mail,       text: 'Click the link in the email to verify your account.' },
      { Icon: Clock,      text: <span>Link expires in <span style={{ color: C.indigoFg, fontWeight: 700 }}>24 hours</span>.</span> },
      { Icon: FolderOpen, text: <span>Can't find it? Check your <span style={{ color: C.indigoFg, fontWeight: 700 }}>spam/junk</span> folder.</span> },
    ]
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
        transition: 'background .3s',
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          @keyframes bounceIn { 0%{opacity:0;transform:scale(.6)} 70%{transform:scale(1.05)} 100%{opacity:1;transform:scale(1)} }
          .bounce-in { animation: bounceIn .55s cubic-bezier(.34,1.56,.64,1) forwards; }
        `}</style>
        <div style={{ position:'fixed', top:'-20%', left:'-15%', width:600, height:600, borderRadius:'50%', background:`radial-gradient(circle,${C.indigo}14,transparent 70%)`, pointerEvents:'none' }} />
        <div style={{ position:'fixed', bottom:'5%', right:'-10%', width:400, height:400, borderRadius:'50%', background:`radial-gradient(circle,${C.violet}12,transparent 70%)`, pointerEvents:'none' }} />
        <div className="bounce-in" style={{
          position: 'relative',
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: isMobile ? '36px 24px' : '48px 40px',
          maxWidth: 440,
          width: '100%',
          textAlign: 'center',
          boxShadow: `0 32px 70px ${C.indigo}14, 0 0 0 1px ${C.indigo}0a`,
        }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:3, borderRadius:'20px 20px 0 0', background:`linear-gradient(90deg,${C.indigo},${C.violet},${C.indigoFg})` }} />
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${C.emerald}14`, border: `1px solid ${C.emerald}30`,
          }}><MailCheck size={32} color={C.emerald} /></div>
          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: C.text, marginBottom: 8, letterSpacing: '-0.5px' }}>Check your inbox!</h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>We sent a confirmation link to:</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.indigoFg, marginBottom: 24, wordBreak: 'break-all' }}>{registeredEmail}</p>
          <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', marginBottom: 28, textAlign: 'left' }}>
            {inboxSteps.map(({ Icon, text }, i) => (
              <p key={i} style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, display: 'flex', gap: 8, marginBottom: i < 2 ? 6 : 0, alignItems: 'flex-start' }}>
                <Icon size={14} style={{ flexShrink: 0, marginTop: 2 }} /><span>{text}</span>
              </p>
            ))}
          </div>
          <Link to="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: C.indigo, color: '#fff', textDecoration: 'none',
            padding: '12px 32px', borderRadius: 10, fontSize: 14, fontWeight: 700,
            transition: 'opacity .2s',
          }}>Go to Sign In →</Link>
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
      transition: 'background .3s, color .3s',
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
        .reg-input-ok  { border-color: ${C.emerald}66 !important; box-shadow: 0 0 0 3px ${C.emerald}14 !important; }
        .reg-input-bad { border-color: ${C.error}66 !important; box-shadow: 0 0 0 3px ${C.error}14 !important; }
        .reg-eye-btn:hover { color: ${C.textSoft} !important; }

        @keyframes fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spinCW  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

        .submit-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spinCW .65s linear infinite;
          display: inline-block;
          flex-shrink: 0;
        }

        .fu1 { animation: fadeUp .55s ease .05s both; }
        .fu2 { animation: fadeUp .55s ease .12s both; }
        .fu3 { animation: fadeUp .55s ease .20s both; }
        .fu4 { animation: fadeUp .55s ease .28s both; }
        .fu5 { animation: fadeUp .55s ease .36s both; }
        .fu6 { animation: fadeUp .55s ease .44s both; }

        .feat-card-sm:hover {
          background: ${C.surface2} !important;
          border-color: ${C.indigo}44 !important;
          transform: translateY(-2px);
        }
        .nav-btn:hover   { color: ${C.textSoft} !important; }
        .cta-btn:hover:not(:disabled)  { opacity: .88 !important; transform: translateY(-1px); }
        .cta-btn:active:not(:disabled) { transform: translateY(0) !important; }
        .cta-btn:disabled { cursor: not-allowed !important; opacity: .65 !important; }
        .signin-link:hover { color: ${C.indigoFg} !important; }
        .guide-btn:hover { background: ${C.surface2} !important; border-color: ${C.borderHi} !important; }

        .oauth-btn {
          flex: 1;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: ${C.surface2};
          border: 1px solid ${C.border};
          border-radius: 10px;
          padding: 11px 16px;
          color: ${C.textSoft};
          font-size: 13px; font-weight: 600;
          font-family: 'Plus Jakarta Sans', sans-serif;
          cursor: pointer;
          transition: background .2s, border-color .2s, color .2s, transform .15s;
        }
        .oauth-btn:hover:not(:disabled) {
          background: ${C.surface};
          border-color: ${C.borderHi};
          color: ${C.text};
          transform: translateY(-1px);
        }
        .oauth-btn:disabled { cursor: not-allowed; opacity: .55; }

        .terms-checkbox {
          width: 16px; height: 16px;
          accent-color: ${C.indigo};
          cursor: pointer;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .legal-link {
          background: none;
          border: none;
          padding: 0;
          color: ${C.indigoFg};
          font-weight: 700;
          font-size: 12px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          cursor: pointer;
          text-decoration: underline;
          text-decoration-color: ${C.indigo}44;
          text-underline-offset: 2px;
          transition: color .15s, text-decoration-color .15s;
        }
        .legal-link:hover {
          color: ${C.indigoMid};
          text-decoration-color: ${C.indigoMid};
        }

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
          .proof-tags { flex-wrap: wrap !important; }
          .right-panel { max-width: 100% !important; width: 100% !important; }
          .card-padding { padding: 20px 20px !important; }
          .card-header  { padding: 20px 20px 16px !important; }
          .card-footer  { padding: 14px 20px 18px !important; }
          .footer-bar   { padding: 18px 20px !important; flex-direction: column !important; gap: 6px !important; text-align: center !important; }
          .nav-bar      { padding: 14px 20px !important; }
          .oauth-row    { flex-direction: column !important; }
        }
      `}</style>

      {/* Ambient blobs */}
      <div style={{ position:'fixed', top:'-20%', left:'-15%', width:600, height:600, borderRadius:'50%', background:`radial-gradient(circle,${C.indigo}14,transparent 70%)`, pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', top:'50%', right:'-15%', width:480, height:480, borderRadius:'50%', background:`radial-gradient(circle,${C.violet}12,transparent 70%)`, pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', bottom:'5%', left:'25%', width:360, height:360, borderRadius:'50%', background:`radial-gradient(circle,${C.accent}10,transparent 70%)`, pointerEvents:'none', zIndex:0 }} />

      {/* NAV */}
      <nav className="nav-bar" style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 52px',
        background: C.navBg,
        backdropFilter: 'blur(24px)',
        borderBottom: `1px solid ${C.border}`,
        transition: 'background .3s, border-color .3s',
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', userSelect: 'none', color: C.text }}>
            <span style={{ color: C.indigo }}>Study</span>Flow
          </span>
        </Link>
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link to="/" className="nav-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.muted, textDecoration: 'none', fontWeight: 500 }}>← Home</Link>
          <Link to="/login" style={{
            background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 15px',
            fontSize: 13, color: C.muted, textDecoration: 'none', fontWeight: 500,
            transition: 'border-color .2s, color .2s',
          }}>Sign In</Link>
          {themeToggleBtn(34)}
        </div>
        <div style={{ display: isMobile ? 'flex' : 'none', alignItems: 'center', gap: 12 }}>
          <Link to="/" style={{ fontSize: 12, color: C.muted, textDecoration: 'none', fontWeight: 600 }}>← Home</Link>
          <Link to="/login" style={{
            background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 12px',
            fontSize: 12, color: C.muted, textDecoration: 'none', fontWeight: 600,
          }}>Sign In</Link>
          {themeToggleBtn(32)}
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
          }}><Sparkles size={12} /> Join StudyFlow</div>

          <h1 className="fu2" style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.08, letterSpacing: '-1.5px', marginBottom: 16, color: C.text }}>
            Your academic<br />
            <span style={gradientText(C)}>
              command centre.
            </span>
          </h1>

          <p className="fu2" style={{ fontSize: 15, color: C.muted, lineHeight: 1.75, marginBottom: 32, maxWidth: 360 }}>
            Create your free account and get access to every tool a student needs — subjects, tasks, grades, notes, calendar, Pomodoro, and AI — all in one place.
          </p>

          <div className="feat-grid fu3" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
            {features.map(f => (
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
                  background: `${f.color}15`, border: `1px solid ${f.color}28`,
                }}><f.Icon size={18} color={f.color} /></div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="proof-tags fu4" style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 20 }}>
            {badges.map(b => (
              <span key={b.label} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, color: C.indigoFg,
                background: `${C.indigo}14`, border: `1px solid ${C.indigo}28`,
                borderRadius: 6, padding: '4px 9px', fontWeight: 600,
              }}><b.Icon size={12} /> {b.label}</span>
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
          <div className="fu2" style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: `0 32px 70px ${C.indigo}14, 0 0 0 1px ${C.indigo}0a`,
          }}>
            <div style={{ height: 3, background: `linear-gradient(90deg,${C.indigo},${C.violet},${C.indigoFg})` }} />

            <div className="card-header" style={{
              padding: '28px 32px 24px',
              borderBottom: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: C.text, letterSpacing: '-0.5px', marginBottom: 4 }}>Create your account</h2>
                <p style={{ fontSize: 13, color: C.muted }}>Fill in your details to get started</p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['#ff5f57','#febc2e','#28c840'].map(bg => (
                  <span key={bg} style={{ width: 11, height: 11, borderRadius: '50%', background: bg, display: 'inline-block', boxShadow: `0 0 6px ${bg}88` }} />
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="card-padding" style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* OAuth buttons */}
                <div className="fu3">
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: C.muted, marginBottom: 10, textAlign: 'center' }}>
                    Quick sign up
                  </p>
                  <div className="oauth-row" style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="oauth-btn" onClick={() => handleOAuth('google')} disabled={!!oauthLoading || isLoading} aria-label="Sign up with Google">
                      {oauthLoading === 'google' ? <span className="submit-spinner" /> : (
                        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      )}
                      Continue with Google
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
                    <div style={{ flex: 1, height: 1, background: C.border }} />
                    <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>or with email</span>
                    <div style={{ flex: 1, height: 1, background: C.border }} />
                  </div>
                </div>

                {/* Name */}
                <div className="fu3">
                  <label htmlFor="reg-name" style={labelStyle}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' }}>
                      <GraduationCap size={16} color={C.muted} />
                    </span>
                    <input id="reg-name" {...register('name', { required: 'Name is required' })} type="text" placeholder="Enter your full name" autoComplete="name" className="reg-input" style={inputBase} />
                  </div>
                  {errors.name && <p role="alert" style={errorStyle}><AlertCircle size={13} />{errors.name.message}</p>}
                </div>

                {/* Email */}
                <div className="fu3">
                  <label htmlFor="reg-email" style={labelStyle}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' }}>
                      <Mail size={16} color={C.muted} />
                    </span>
                    <input id="reg-email" {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' } })} type="email" placeholder="your@email.com" autoComplete="email" className="reg-input" style={inputBase} />
                  </div>
                  {errors.email && <p role="alert" style={errorStyle}><AlertCircle size={13} />{errors.email.message}</p>}
                </div>

                {/* Password */}
                <div className="fu4">
                  <label htmlFor="reg-password" style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' }}>
                      <Lock size={16} color={C.muted} />
                    </span>
                    <input id="reg-password" {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Minimum 6 characters' } })} type={showPassword ? 'text' : 'password'} placeholder="Min. 6 characters" autoComplete="new-password" className="reg-input" style={{ ...inputBase, paddingRight: 44 }} />
                    <button type="button" className="reg-eye-btn" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: C.muted, transition: 'color .2s' }}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                  {errors.password && <p role="alert" style={errorStyle}><AlertCircle size={13} />{errors.password.message}</p>}
                  {passwordValue && (() => {
                    const len = passwordValue.length
                    const strength = len < 6
                      ? { level:0, color:C.muted, label:'Too short', Icon:null, filled:0 }
                      : len < 8
                      ? { level:1, color:C.errorText, label:'Weak', Icon:AlertTriangle, filled:1 }
                      : len < 10
                      ? { level:2, color:C.amber, label:'Fair', Icon:AlertCircle, filled:2 }
                      : len < 12
                      ? { level:3, color:C.emerald, label:'Good', Icon:CheckCircle2, filled:3 }
                      : { level:4, color:C.indigo, label:'Strong', Icon:Sparkles, filled:4 }
                    return (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                          {[0,1,2,3].map(i => <div key={i} style={{ flex:1, height:4, borderRadius:4, background: i < strength.filled ? strength.color : C.border, transition:'background .3s, box-shadow .3s', boxShadow: i < strength.filled ? `0 0 8px ${strength.color}88` : 'none' }} />)}
                        </div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: strength.level === 0 ? C.muted : strength.color, fontWeight: 600, transition:'color .3s' }}>
                          {strength.Icon && <strength.Icon size={12} />} {strength.label}
                        </span>
                      </div>
                    )
                  })()}
                </div>

                {/* Confirm Password */}
                <div className="fu4">
                  <label htmlFor="reg-confirm" style={labelStyle}>Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' }}>
                      {confirmValue
                        ? (passwordsMatch ? <CheckCircle2 size={16} color={C.emerald} /> : <XCircle size={16} color={C.errorText} />)
                        : <KeyRound size={16} color={C.muted} />}
                    </span>
                    <input id="reg-confirm" {...register('confirmPassword', { required: 'Please confirm your password', validate: val => val === watch('password') || 'Passwords do not match' })} type={showConfirm ? 'text' : 'password'} placeholder="Re-enter your password" autoComplete="new-password" className={`reg-input ${confirmValue ? (passwordsMatch ? 'reg-input-ok' : 'reg-input-bad') : ''}`} style={{ ...inputBase, paddingRight: 44 }} />
                    <button type="button" className="reg-eye-btn" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: C.muted, transition: 'color .2s' }}>{showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                  {confirmValue && (
                    <p style={{ ...errorStyle, color: passwordsMatch ? C.emerald : C.errorText, marginTop: 6 }}>
                      {passwordsMatch ? <Check size={13} /> : <X size={13} />} {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                    </p>
                  )}
                  {errors.confirmPassword && !confirmValue && <p role="alert" style={errorStyle}><AlertCircle size={13} />{errors.confirmPassword.message}</p>}
                </div>

                {/* Terms checkbox */}
                <div className="fu5">
                  <label style={{
                    display: 'flex', gap: 10, cursor: 'pointer',
                    padding: '12px 14px',
                    background: termsError ? `${C.error}08` : C.surface2,
                    border: `1px solid ${termsError ? C.error + '40' : C.border}`,
                    borderRadius: 10,
                    transition: 'border-color .2s, background .2s',
                  }}>
                    <input
                      type="checkbox"
                      className="terms-checkbox"
                      checked={termsAccepted}
                      onChange={e => {
                        setTermsAccepted(e.target.checked)
                        if (e.target.checked) setTermsError(false)
                      }}
                    />
                    <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
                      I agree to StudyFlow's{' '}
                      <button
                        type="button"
                        className="legal-link"
                        onClick={e => { e.preventDefault(); e.stopPropagation(); setLegalModal('terms') }}
                      >Terms of Service</button>
                      {' '}and{' '}
                      <button
                        type="button"
                        className="legal-link"
                        onClick={e => { e.preventDefault(); e.stopPropagation(); setLegalModal('privacy') }}
                      >Privacy Policy</button>
                    </span>
                  </label>
                  {termsError && (
                    <p role="alert" style={errorStyle}><AlertCircle size={13} />You must accept the terms to continue</p>
                  )}
                </div>

                {serverError && (
                  <div className="fu5" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: `${C.error}10`, border: `1px solid ${C.error}30`, borderRadius: 10, padding: '12px 14px' }}>
                    <AlertTriangle size={16} color={C.errorText} />
                    <p style={{ fontSize: 13, color: C.errorText, fontWeight: 600 }}>{serverError}</p>
                  </div>
                )}

                {/* Submit */}
                <div className="fu5">
                  <button type="submit" className="cta-btn" disabled={isLoading || !!oauthLoading} style={{ width: '100%', background: C.indigo, color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'opacity .2s, transform .15s', boxShadow: `0 8px 28px ${C.indigo}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    {isLoading ? <><span className="submit-spinner" />Creating account…</> : 'Create Account →'}
                  </button>
                </div>
              </div>
            </form>

            <div className="card-footer" style={{ padding: '18px 32px 22px', borderTop: `1px solid ${C.border}`, background: C.surface2, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: C.muted }}>
                Already have an account?{' '}
                <Link to="/login" className="signin-link" style={{ color: C.indigoMid, fontWeight: 700, textDecoration: 'none', transition: 'color .2s' }}>Sign in →</Link>
              </p>
            </div>
          </div>

          <div className="fu6" style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
            <button onClick={() => setShowGuide(true)} className="guide-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 16px', fontSize: 12, color: C.muted, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, transition: 'background .2s, border-color .2s' }}>
              <Sparkles size={13} /> How does StudyFlow work?
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }} className="fu6">
            <Lock size={11} /> Secured with Supabase Auth
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer-bar" style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 52px', borderTop: `1px solid ${C.border}` }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}><span style={{ color: C.indigo }}>Study</span>Flow</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>The academic command centre for students.</div>
        </div>
        <span style={{ fontSize: 12, color: C.muted }}>© {new Date().getFullYear()} StudyFlow · Built for students.</span>
      </footer>

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
      {legalModal && <LegalModal type={legalModal} onClose={closeLegal} C={C} />}
    </div>
  )
}