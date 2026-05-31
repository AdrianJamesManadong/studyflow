import { useState, useEffect } from 'react'

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

const FEATURES = [
  { icon: '📚', title: 'Subjects',      desc: 'Add your subjects with color labels to organize everything.' },
  { icon: '📝', title: 'Assignments',   desc: 'Track assignments with due dates, priority levels, and status.' },
  { icon: '📊', title: 'Grades',        desc: 'Log your scores and automatically calculate your GPA and averages.' },
  { icon: '🗒️', title: 'Notes',         desc: 'Write and organize notes per subject with a clean editor.' },
  { icon: '📅', title: 'Calendar',      desc: 'See all your assignments and events in a monthly calendar view.' },
  { icon: '⏱️', title: 'Pomodoro',      desc: 'Stay focused with a built-in Pomodoro timer with session tracking.' },
  { icon: '🤖', title: 'AI Assistant',  desc: 'Ask your AI study assistant anything — it knows your data.' },
  { icon: '🔔', title: 'Notifications', desc: 'Get reminded when assignments are due soon.' },
]

const STEPS = [
  { step: '1', title: 'Create an account',    desc: 'Register with your email and password.' },
  { step: '2', title: 'Add your subjects',    desc: 'Set up your subjects with colors to identify them easily.' },
  { step: '3', title: 'Track assignments',    desc: 'Add assignments linked to subjects with due dates and priority.' },
  { step: '4', title: 'Log your grades',      desc: 'Enter your scores and watch your average calculate automatically.' },
  { step: '5', title: 'Use the AI assistant', desc: 'Ask the AI about your workload, get study plans, and more.' },
]

export default function GuideModal({ onClose }) {
  const [tab, setTab] = useState('features')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)

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
        .guide-close-btn:hover { color: ${C.text} !important; }
        .guide-got-it:hover   { opacity: .85 !important; }
        .guide-feat-card:hover { background: ${C.borderHi} !important; }
        .guide-tab-btn:hover  { color: ${C.textSoft} !important; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,.75)',
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
            boxShadow: `0 40px 100px rgba(0,0,0,.6), 0 0 0 1px ${C.indigo}18`,
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
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 18, color: C.muted,
                transition: 'color .2s',
                fontFamily: 'inherit',
                lineHeight: 1,
                padding: 6,
                borderRadius: 6,
              }}
            >✕</button>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: 8,
            padding: isMobile ? '12px 20px 0' : '16px 28px 0',
            flexShrink: 0,
          }}>
            {[
              { key: 'features', label: '✨ Features' },
              { key: 'flow',     label: '🚀 Getting Started' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
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
              >{t.label}</button>
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
                        transition: 'background .2s',
                      }}
                    >
                      <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{f.icon}</span>
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
                          boxShadow: `0 4px 14px ${C.indigo}55`,
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
                  background: `${C.indigo}12`,
                  border: `1px solid ${C.indigo}30`,
                  borderRadius: 12,
                  padding: '14px 16px',
                  marginTop: 20,
                }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.indigoFg, marginBottom: 6 }}>💡 Pro tip</p>
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
                Built by Adrian James D. Manadong · New Era University
              </p>
            )}
            <button
              onClick={onClose}
              className="guide-got-it"
              style={{
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
                transition: 'opacity .2s',
                boxShadow: `0 4px 14px ${C.indigo}44`,
              }}
            >Got it! 👍</button>
            {isMobile && (
              <p style={{ fontSize: 11, color: C.muted, margin: 0, textAlign: 'center' }}>
                Built by Adrian James D. Manadong · New Era University
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}