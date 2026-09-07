import { useState, useEffect } from 'react'
import { useTheme } from '../hooks/useTheme'
import {
  X,
  Sparkles,
  Rocket,
  Lightbulb,
  ThumbsUp,
  BookOpen,
  ClipboardList,
  BarChart3,
  NotebookPen,
  Calendar,
  Timer,
  Bot,
  Bell,
} from 'lucide-react'

/* ─── Design tokens — StudyFlow Professional Palette (matches Register/Login) ─── */
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
  overlay:   'rgba(31,41,55,.45)',
  shadowSoft:'rgba(31,41,55,0.04)',
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
  overlay:   'rgba(0,0,0,.55)',
  shadowSoft:'rgba(0,0,0,0.35)',
}

const FEATURES_META = [
  { Icon: BookOpen,      title: 'Subjects',      desc: 'Add your subjects with color labels to organize everything.',     key: 'indigo' },
  { Icon: ClipboardList, title: 'Assignments',   desc: 'Track assignments with due dates, priority levels, and status.',  key: 'emerald' },
  { Icon: BarChart3,     title: 'Grades',        desc: 'Log your scores and automatically calculate your GPA and averages.', key: 'amber' },
  { Icon: NotebookPen,   title: 'Notes',         desc: 'Write and organize notes per subject with a clean editor.',       key: 'violet' },
  { Icon: Calendar,      title: 'Calendar',      desc: 'See all your assignments and events in a monthly calendar view.', key: 'indigo' },
  { Icon: Timer,         title: 'Pomodoro',      desc: 'Stay focused with a built-in Pomodoro timer with session tracking.', key: 'emerald' },
  { Icon: Bot,           title: 'AI Assistant',  desc: 'Ask your AI study assistant anything — it knows your data.',      key: 'violet' },
  { Icon: Bell,          title: 'Notifications', desc: 'Get reminded when assignments are due soon.',                     key: 'amber' },
]

const STEPS = [
  { step: '1', title: 'Create an account',    desc: 'Register with your email and password.' },
  { step: '2', title: 'Add your subjects',    desc: 'Set up your subjects with colors to identify them easily.' },
  { step: '3', title: 'Track assignments',    desc: 'Add assignments linked to subjects with due dates and priority.' },
  { step: '4', title: 'Log your grades',      desc: 'Enter your scores and watch your average calculate automatically.' },
  { step: '5', title: 'Use the AI assistant', desc: 'Ask the AI about your workload, get study plans, and more.' },
]

export default function GuideModal({ onClose }) {
  const { theme } = useTheme()
  const C = theme === 'dark' ? C_DARK : C_LIGHT
  const [tab, setTab] = useState('features')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)

  // colors resolved against the active palette, keyed the same way FEATURES_META references them
  const paletteByKey = { indigo: C.indigo, emerald: C.emerald, amber: C.amber, violet: C.violet }
  const FEATURES = FEATURES_META.map(f => ({ ...f, color: paletteByKey[f.key] }))

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handleResize)
    // Prevent body scroll when modal open
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('resize', handleResize)
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(.96) translateY(12px); }
          to   { opacity: 1; transform: scale(1)  translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .guide-modal-inner { animation: modalIn .25s cubic-bezier(.34,1.56,.64,1) both; }
        .guide-modal-mobile { animation: slideUp .3s cubic-bezier(.34,1.56,.64,1) both; }
        .guide-scroll::-webkit-scrollbar { width: 4px; }
        .guide-scroll::-webkit-scrollbar-track { background: transparent; }
        .guide-scroll::-webkit-scrollbar-thumb { background: ${C.indigo}44; border-radius: 4px; }
        .guide-close-btn:hover { background: ${C.surface2} !important; border-color: ${C.borderHi} !important; color: ${C.textSoft} !important; }
        .guide-got-it:hover   { opacity: .88 !important; transform: translateY(-1px); }
        .guide-feat-card:hover { background: ${C.surface} !important; border-color: ${C.indigo}44 !important; transform: translateY(-2px); }
        .guide-tab-btn:hover  { color: ${C.textSoft} !important; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: C.overlay,
          backdropFilter: 'blur(6px)',
          zIndex: 50,
          display: 'flex',
          alignItems: isMobile ? 'flex-end' : 'center',
          justifyContent: 'center',
          padding: isMobile ? 0 : 16,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* Modal */}
        <div
          className={isMobile ? 'guide-modal-mobile' : 'guide-modal-inner'}
          onClick={e => e.stopPropagation()}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: isMobile ? '20px 20px 0 0' : 20,
            width: '100%',
            maxWidth: isMobile ? '100%' : 640,
            // On mobile: takes up to 90% of screen height; on desktop: capped at 88vh
            maxHeight: isMobile ? '90vh' : '88vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: `0 40px 90px ${C.shadowSoft}, 0 0 0 1px ${C.indigo}12`,
            overflow: 'hidden',
          }}
        >
          {/* Top accent line */}
          <div style={{ height: 3, background: `linear-gradient(90deg,${C.indigo},${C.violet},${C.indigoFg})`, flexShrink: 0 }} />

          {/* Mobile drag handle */}
          {isMobile && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 4, background: C.border }} />
            </div>
          )}

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: isMobile ? '12px 20px 12px' : '20px 28px',
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
          }}>
            <div>
              <h2 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: C.text, letterSpacing: '-0.4px', margin: 0 }}>
                How StudyFlow Works
              </h2>
              <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                Your all-in-one student productivity app
              </p>
            </div>
            <button
              onClick={onClose}
              className="guide-close-btn"
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

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: 8,
            padding: isMobile ? '12px 20px 0' : '16px 28px 0',
            flexShrink: 0,
          }}>
            {[
              { key: 'features', label: 'Features',        Icon: Sparkles },
              { key: 'flow',     label: 'Getting Started', Icon: Rocket },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: isMobile ? '6px 14px' : '7px 16px',
                  borderRadius: 8,
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'background .2s, color .2s',
                  background: tab === t.key ? C.indigo : C.surface2,
                  color:      tab === t.key ? '#fff'   : C.muted,
                  boxShadow:  tab === t.key ? `0 4px 14px ${C.indigo}44` : 'none',
                  flex: isMobile ? 1 : 'unset',
                }}
              ><t.Icon size={14} /> {t.label}</button>
            ))}
          </div>

          {/* Scrollable content */}
          <div
            className="guide-scroll"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: isMobile ? '16px 20px' : '20px 28px',
            }}
          >
            {tab === 'features' && (
              <div>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>
                  StudyFlow is a full-stack student productivity app with everything you need to manage your academic life in one place.
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: 10,
                }}>
                  {FEATURES.map(f => (
                    <div
                      key={f.title}
                      className="guide-feat-card"
                      style={{
                        background: C.surface2,
                        border: `1px solid ${C.border}`,
                        borderRadius: 12,
                        padding: '14px 16px',
                        display: 'flex',
                        gap: 12,
                        transition: 'background .2s, border-color .2s, transform .2s',
                      }}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `${f.color}15`, border: `1px solid ${f.color}28`,
                      }}><f.Icon size={18} color={f.color} /></div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{f.title}</p>
                        <p style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.6 }}>{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'flow' && (
              <div>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>
                  Follow these steps to get the most out of StudyFlow:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {STEPS.map((s, i) => (
                    <div key={s.step} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: C.indigo,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 13, fontWeight: 800,
                          boxShadow: `0 4px 14px ${C.indigo}44`,
                          flexShrink: 0,
                        }}>{s.step}</div>
                        {i < STEPS.length - 1 && (
                          <div style={{ width: 2, flex: 1, minHeight: 24, background: C.border, margin: '4px 0' }} />
                        )}
                      </div>
                      <div style={{ paddingBottom: i < STEPS.length - 1 ? 16 : 0, paddingTop: 4 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{s.title}</p>
                        <p style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.6 }}>{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  background: `${C.indigo}10`,
                  border: `1px solid ${C.indigo}28`,
                  borderRadius: 12,
                  padding: '14px 16px',
                  marginTop: 20,
                }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: C.indigoFg, marginBottom: 6 }}>
                    <Lightbulb size={14} /> Pro tip
                  </p>
                  <p style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.7, margin: 0 }}>
                    After adding subjects and assignments, ask the AI Assistant{' '}
                    <span style={{ color: C.indigoFg, fontWeight: 600 }}>"Give me a study plan for today"</span>
                    {' '}— it will create a personalized plan based on your actual deadlines!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMobile ? 'center' : 'space-between',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 12 : 0,
            padding: isMobile ? '16px 20px 24px' : '16px 28px',
            borderTop: `1px solid ${C.border}`,
            background: C.surface2,
            flexShrink: 0,
          }}>
            {!isMobile && (
              <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                Built by · New Era University Student
              </p>
            )}
            <button
              onClick={onClose}
              className="guide-got-it"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: C.indigo,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: isMobile ? '12px 0' : '9px 20px',
                width: isMobile ? '100%' : 'auto',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'opacity .2s, transform .15s',
                boxShadow: `0 4px 14px ${C.indigo}44`,
              }}
            ><ThumbsUp size={15} /> Got it!</button>
            {isMobile && (
              <p style={{ fontSize: 11, color: C.muted, margin: 0, textAlign: 'center' }}>
                Built by New Era University Student
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}