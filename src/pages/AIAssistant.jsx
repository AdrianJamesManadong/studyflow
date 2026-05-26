import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useSubjects } from '../hooks/useSubjects'
import { useAssignments } from '../hooks/useAssignments'
import { useGrades } from '../hooks/useGrades'
import { useNotes } from '../hooks/useNotes'

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY

const MAX_STORED_MESSAGES = 40

const SUGGESTIONS = [
  'What assignments do I have coming up?',
  'How is my grade average looking?',
  'Give me a study plan for today',
  'Quiz me on my notes',
  'What subject should I focus on?',
]

function makeInitialMessage() {
  return {
    id:      crypto.randomUUID(),
    role:    'assistant',
    content: "Hi! I'm your AI study assistant. I can see your subjects, assignments, grades, and notes. How can I help you today? 📚",
  }
}

function readChat() {
  try {
    const saved = JSON.parse(localStorage.getItem('sf_ai_chat') || 'null')
    if (Array.isArray(saved) && saved.length > 0) return saved
  } catch {}
  return [makeInitialMessage()]
}

function writeChat(messages) {
  try {
    localStorage.setItem('sf_ai_chat', JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)))
  } catch {}
}

function getTodayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

/* ── Skeleton shown while hook data loads ── */
export function AIAssistantSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-pulse">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between flex-shrink-0">
        <div className="space-y-2">
          <div className="h-7 w-36 bg-gray-800 rounded-lg" />
          <div className="h-4 w-64 bg-gray-800 rounded" />
        </div>
        <div className="h-8 w-20 bg-gray-800 rounded-lg" />
      </div>

      {/* Fake messages */}
      <div className="flex-1 space-y-4 overflow-hidden">
        <div className="flex justify-start">
          <div className="flex gap-3 max-w-[75%]">
            <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <div className="h-16 w-72 bg-gray-800 rounded-2xl rounded-bl-sm" />
              <div className="h-3 w-16 bg-gray-800 rounded" />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="space-y-2 items-end flex flex-col">
            <div className="h-10 w-48 bg-indigo-900/50 rounded-2xl rounded-br-sm" />
            <div className="h-3 w-16 bg-gray-800 rounded" />
          </div>
        </div>
        <div className="flex justify-start">
          <div className="flex gap-3 max-w-[75%]">
            <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <div className="h-24 w-80 bg-gray-800 rounded-2xl rounded-bl-sm" />
              <div className="h-3 w-16 bg-gray-800 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Fake suggestions */}
      <div className="flex gap-2 flex-wrap mb-3">
        {[120, 96, 140, 110].map(w => (
          <div key={w} className="h-7 bg-gray-800 rounded-full" style={{ width: w }} />
        ))}
      </div>

      {/* Fake input */}
      <div className="flex gap-3">
        <div className="flex-1 h-12 bg-gray-900 border border-gray-800 rounded-xl" />
        <div className="w-12 h-12 bg-gray-800 rounded-xl" />
      </div>
    </div>
  )
}

export default function AIAssistant() {
  const { subjects,    loading: subjectsLoading    } = useSubjects()
  const { assignments, loading: assignmentsLoading } = useAssignments()
  const { grades, getOverallAverage, getLetterGrade,
          loading: gradesLoading                   } = useGrades()
  const { notes,       loading: notesLoading       } = useNotes()

  const dataLoading = subjectsLoading || assignmentsLoading || gradesLoading || notesLoading

  const [messages, setMessages]   = useState(readChat)
  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)
  const [error, setError]         = useState('')
  const [copiedId, setCopiedId]   = useState(null)   // track which msg was just copied
  const [retryMsg, setRetryMsg]   = useState(null)   // last failed user message text
  const bottomRef                 = useRef(null)
  const inputRef                  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  useEffect(() => {
    writeChat(messages)
  }, [messages])

  const todayStart = useMemo(getTodayStart, [])

  // Smarter context: includes note content (truncated), not just titles
  const context = useMemo(() => {
    const pending = assignments.filter(a => a.status !== 'done')
    const overdue = pending.filter(a => new Date(a.due_date) < todayStart)
    const overall = getOverallAverage()

    const notesContext = notes.length > 0
      ? notes.slice(0, 10).map(n =>
          `- ${n.title}${n.content ? `: ${n.content.slice(0, 200)}${n.content.length > 200 ? '…' : ''}` : ''}`
        ).join('\n')
      : 'None yet'

    return `
You are a helpful study assistant for a student. Here is their current academic data:

SUBJECTS: ${subjects.map(s => s.name).join(', ') || 'None yet'}

PENDING ASSIGNMENTS (${pending.length}):
${pending.map(a => `- ${a.title} | Due: ${a.due_date} | Priority: ${a.priority}`).join('\n') || 'None'}

OVERDUE ASSIGNMENTS (${overdue.length}):
${overdue.map(a => `- ${a.title} | Due: ${a.due_date}`).join('\n') || 'None'}

GRADES:
${grades.map(g => {
  const pct = g.max_score > 0 ? ((g.score / g.max_score) * 100).toFixed(1) : '0.0'
  return `- ${g.title}: ${g.score}/${g.max_score} (${pct}%)`
}).join('\n') || 'None yet'}
Overall Average: ${overall ? `${overall}% (${getLetterGrade(parseFloat(overall))})` : 'No grades yet'}

NOTES (${notes.length}):
${notesContext}

Be concise, helpful, motivating, and specific to their data. Use emojis occasionally. Format responses with line breaks for readability.
    `.trim()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects, assignments, grades, notes, todayStart])

  const sendMessage = useCallback(async (text) => {
    const userText = (text || input).trim()
    if (!userText || sending) return

    const userMsg = {
      id:        crypto.randomUUID(),
      role:      'user',
      content:   userText,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setRetryMsg(null)
    setSending(true)
    setError('')

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model:      'llama-3.3-70b-versatile',
          max_tokens: 1024,
          messages: [
            {
              role:    'system',
              content: dataLoading
                ? "The student's data is still loading. Tell them you'll have their full context in a moment and to try again shortly."
                : context,
            },
            ...messages
              .slice(-20)
              .concat(userMsg)
              .map(m => ({ role: m.role, content: m.content })),
          ],
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        const status  = response.status
        if (status === 401) throw new Error('Invalid API key. Check your VITE_GROQ_API_KEY.')
        if (status === 429) throw new Error('Rate limit reached. Please wait a moment and try again.')
        throw new Error(errData?.error?.message || `API error ${status}. Please try again.`)
      }

      const data  = await response.json()
      const reply = data.choices?.[0]?.message?.content
      if (!reply) throw new Error('Empty response from AI. Please try again.')

      setMessages(prev => [...prev, {
        id:        crypto.randomUUID(),
        role:      'assistant',
        content:   reply,
        timestamp: new Date().toISOString(),
      }])
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setMessages(prev => prev.filter(m => m.id !== userMsg.id))
      setInput(userText)
      setRetryMsg(userText)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [input, sending, messages, context, dataLoading])

  const copyMessage = useCallback(async (id, content) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {}
  }, [])

  function clearChat() {
    setMessages([makeInitialMessage()])
    setRetryMsg(null)
    setError('')
    try { localStorage.removeItem('sf_ai_chat') } catch {}
  }

  const isOnlyInitialMessage = messages.length === 1

  if (dataLoading) return <AIAssistantSkeleton />

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .msg-appear { animation: fadeSlideUp 0.25s ease both; }
        @keyframes blink {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1);   }
        }
        .dot-1 { animation: blink 1.4s ease-in-out infinite 0s;    }
        .dot-2 { animation: blink 1.4s ease-in-out infinite 0.2s;  }
        .dot-3 { animation: blink 1.4s ease-in-out infinite 0.4s;  }
      `}</style>

      <div className="flex flex-col h-[calc(100vh-8rem)]">

        {/* Header */}
        <div className="mb-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white">AI Assistant</h2>
            <p className="text-gray-400 text-sm mt-1">
              Powered by Groq · {subjects.length} subjects · {assignments.filter(a => a.status !== 'done').length} pending
            </p>
          </div>
          <button
            onClick={clearChat}
            className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition"
          >
            Clear chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 mb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex msg-appear ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* Avatar — assistant only */}
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-1 mr-2.5 text-sm">
                  🤖
                </div>
              )}

              <div className={`flex flex-col gap-1 max-w-[78%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`group relative rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
                  ${msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-bl-sm hover:border-gray-700 transition-colors'
                  }`}
                >
                  {msg.content}

                  {/* Copy button — appears on hover */}
                  <button
                    onClick={() => copyMessage(msg.id, msg.content)}
                    title="Copy message"
                    className={`absolute -top-2 ${msg.role === 'user' ? '-left-8' : '-right-8'}
                      opacity-0 group-hover:opacity-100 transition-opacity
                      w-6 h-6 rounded-full bg-gray-800 border border-gray-700
                      flex items-center justify-center text-[10px] hover:bg-gray-700`}
                  >
                    {copiedId === msg.id ? '✓' : '⎘'}
                  </button>
                </div>

                {/* Timestamp */}
                {msg.timestamp && (
                  <span className="text-[10px] text-gray-600 px-1">
                    {formatTime(msg.timestamp)}
                  </span>
                )}
              </div>

              {/* Avatar — user only */}
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-1 ml-2.5 text-sm">
                  👤
                </div>
              )}
            </div>
          ))}

          {/* Improved typing indicator */}
          {sending && (
            <div className="flex justify-start msg-appear">
              <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-1 mr-2.5 text-sm">
                🤖
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-bl-sm px-4 py-3.5 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-indigo-400 rounded-full dot-1" />
                <span className="w-2 h-2 bg-indigo-400 rounded-full dot-2" />
                <span className="w-2 h-2 bg-indigo-400 rounded-full dot-3" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Error + Retry */}
        {error && (
          <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 mb-3 text-xs text-red-400 flex-shrink-0">
            <span>⚠️ {error}</span>
            <div className="flex items-center gap-2 ml-3">
              {retryMsg && (
                <button
                  onClick={() => { setError(''); sendMessage(retryMsg) }}
                  className="text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded transition"
                >
                  ↺ Retry
                </button>
              )}
              <button onClick={() => setError('')} className="hover:text-red-300 transition">✕</button>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {isOnlyInitialMessage && (
          <div className="flex gap-2 flex-wrap mb-3 flex-shrink-0">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                disabled={sending}
                className="text-xs bg-gray-900 border border-gray-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-gray-400 hover:text-white px-3 py-1.5 rounded-full transition disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-3 flex-shrink-0">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask anything about your studies..."
            disabled={sending}
            className="flex-1 bg-gray-900 border border-gray-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none transition text-sm disabled:opacity-60"
          />
          <button
            onClick={() => sendMessage()}
            disabled={sending || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 rounded-xl transition font-medium text-sm"
          >
            {sending ? '…' : '➤'}
          </button>
        </div>

      </div>
    </>
  )
}