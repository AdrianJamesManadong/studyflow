import { useState } from 'react'

const FEATURES = [
  { icon: '📚', title: 'Subjects', desc: 'Add your subjects with color labels to organize everything.' },
  { icon: '📝', title: 'Assignments', desc: 'Track assignments with due dates, priority levels, and status.' },
  { icon: '📊', title: 'Grades', desc: 'Log your scores and automatically calculate your GPA and averages.' },
  { icon: '🗒️', title: 'Notes', desc: 'Write and organize notes per subject with a clean editor.' },
  { icon: '📅', title: 'Calendar', desc: 'See all your assignments and events in a monthly calendar view.' },
  { icon: '⏱️', title: 'Pomodoro', desc: 'Stay focused with a built-in Pomodoro timer with session tracking.' },
  { icon: '🤖', title: 'AI Assistant', desc: 'Ask your AI study assistant anything — it knows your data.' },
  { icon: '🔔', title: 'Notifications', desc: 'Get reminded when assignments are due soon.' },
]

const STEPS = [
  { step: '1', title: 'Create an account', desc: 'Register with your email and password.' },
  { step: '2', title: 'Add your subjects', desc: 'Set up your subjects with colors to identify them easily.' },
  { step: '3', title: 'Track assignments', desc: 'Add assignments linked to subjects with due dates and priority.' },
  { step: '4', title: 'Log your grades', desc: 'Enter your scores and watch your average calculate automatically.' },
  { step: '5', title: 'Use the AI assistant', desc: 'Ask the AI about your workload, get study plans, and more.' },
]

export default function GuideModal({ onClose }) {
  const [tab, setTab] = useState('features')

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-white font-bold text-lg">How StudyFlow Works</h2>
            <p className="text-gray-400 text-xs mt-0.5">Your all-in-one student productivity app</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition text-xl">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-4">
          {[
            { key: 'features', label: '✨ Features' },
            { key: 'flow', label: '🚀 Getting Started' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition
                ${tab === t.key ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === 'features' && (
            <div className="space-y-3">
              <p className="text-gray-400 text-sm mb-4">
                StudyFlow is a full-stack student productivity app with everything you need to manage your academic life in one place.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {FEATURES.map(f => (
                  <div key={f.title} className="bg-gray-800 rounded-xl p-4 flex gap-3">
                    <span className="text-2xl flex-shrink-0">{f.icon}</span>
                    <div>
                      <p className="text-white font-medium text-sm">{f.title}</p>
                      <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'flow' && (
            <div className="space-y-3">
              <p className="text-gray-400 text-sm mb-4">
                Follow these steps to get the most out of StudyFlow:
              </p>
              {STEPS.map(s => (
                <div key={s.step} className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {s.step}
                  </div>
                  <div className="flex-1 pb-3 border-b border-gray-800 last:border-0">
                    <p className="text-white font-medium text-sm">{s.title}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
              <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-xl p-4 mt-2">
                <p className="text-indigo-400 text-sm font-medium">💡 Pro tip</p>
                <p className="text-gray-300 text-xs mt-1">
                  After adding subjects and assignments, ask the AI Assistant "Give me a study plan for today" — it will create a personalized plan based on your actual deadlines!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
          <p className="text-gray-600 text-xs">Built by Adrian James D. Manadong · New Era University</p>
          <button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}