import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useSubjects } from '../hooks/useSubjects'
import { useAssignments } from '../hooks/useAssignments'
import { useGrades } from '../hooks/useGrades'
import { useNotes } from '../hooks/useNotes'

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY

const MAX_CONVERSATIONS = 30

const SUGGESTIONS = [
  { text: 'What assignments do I have coming up?', icon: '📋' },
  { text: 'How is my grade average looking?',       icon: '📊' },
  { text: 'Give me a study plan for today',          icon: '🗓️' },
  { text: 'Quiz me on my notes',                     icon: '🧠' },
  { text: 'What subject should I focus on?',         icon: '🎯' },
]

function makeInitialMessage() {
  return {
    id:      crypto.randomUUID(),
    role:    'assistant',
    content: "Hi! I'm your AI study assistant. I can see your subjects, assignments, grades, and notes. How can I help you today? 📚",
  }
}

/* ── Conversation history (list of past chats) ── */
function readConversations() {
  try {
    const saved = JSON.parse(localStorage.getItem('sf_ai_conversations') || 'null')
    if (Array.isArray(saved)) return saved
  } catch {}
  return []
}

function writeConversations(list) {
  try {
    const trimmed = [...list]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, MAX_CONVERSATIONS)
    localStorage.setItem('sf_ai_conversations', JSON.stringify(trimmed))
    return trimmed
  } catch {
    return list
  }
}

function titleFromMessages(messages) {
  const firstUser = messages.find(m => m.role === 'user')
  if (!firstUser) return 'New chat'
  const text = firstUser.content.trim()
  return text.length > 42 ? text.slice(0, 42) + '…' : text
}

function getTodayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatHistoryTime(iso) {
  const d = new Date(iso)
  const today = getTodayStart()
  const isToday = d >= today
  if (isToday) return `Today · ${formatTime(iso)}`
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d >= yesterday) return `Yesterday · ${formatTime(iso)}`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/* ── Skeleton shown while hook data loads ── */
export function AIAssistantSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-pulse">
      <div className="mb-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gray-800" />
          <div className="space-y-2">
            <div className="h-6 w-32 bg-gray-800 rounded-lg" />
            <div className="h-3.5 w-56 bg-gray-800 rounded" />
          </div>
        </div>
        <div className="h-8 w-20 bg-gray-800 rounded-lg" />
      </div>

      <div className="flex-1 space-y-4 overflow-hidden">
        <div className="flex justify-start">
          <div className="flex gap-3 max-w-[75%]">
            <div className="w-9 h-9 rounded-full bg-gray-800 flex-shrink-0 mt-1" />
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
            <div className="w-9 h-9 rounded-full bg-gray-800 flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <div className="h-24 w-80 bg-gray-800 rounded-2xl rounded-bl-sm" />
              <div className="h-3 w-16 bg-gray-800 rounded" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        {[120, 96, 140, 110].map(w => (
          <div key={w} className="h-8 bg-gray-800 rounded-full" style={{ width: w }} />
        ))}
      </div>

      <div className="flex gap-3">
        <div className="flex-1 h-12 bg-gray-900 border border-gray-800 rounded-2xl" />
        <div className="w-12 h-12 bg-gray-800 rounded-2xl" />
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

  // Every mount = fresh chat. Past chats live in `conversations`.
  const [activeId, setActiveId]         = useState(() => crypto.randomUUID())
  const [messages, setMessages]         = useState(() => [makeInitialMessage()])
  const [conversations, setConversations] = useState(readConversations)
  const [showHistory, setShowHistory]   = useState(false)

  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)
  const [error, setError]         = useState('')
  const [copiedId, setCopiedId]   = useState(null)
  const [retryMsg, setRetryMsg]   = useState(null)
  const bottomRef                 = useRef(null)
  const inputRef                  = useRef(null)
  const historyRef                = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  // Persist the active conversation into history once it has real content
  // (skip saving chats that only contain the initial greeting).
  useEffect(() => {
    if (messages.length <= 1) return

    setConversations(prev => {
      const existingIdx = prev.findIndex(c => c.id === activeId)
      const entry = {
        id:        activeId,
        title:     existingIdx >= 0 ? prev[existingIdx].title : titleFromMessages(messages),
        messages,
        updatedAt: new Date().toISOString(),
      }
      const next = existingIdx >= 0
        ? prev.map((c, i) => i === existingIdx ? entry : c)
        : [entry, ...prev]
      return writeConversations(next)
    })
  }, [messages, activeId])

  // Close the history dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (showHistory && historyRef.current && !historyRef.current.contains(e.target)) {
        setShowHistory(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showHistory])

  const todayStart = useMemo(getTodayStart, [])

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
          model:      'openai/gpt-oss-120b',
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

  function startNewChat() {
    setActiveId(crypto.randomUUID())
    setMessages([makeInitialMessage()])
    setRetryMsg(null)
    setError('')
    setShowHistory(false)
  }

  function loadConversation(conv) {
    setActiveId(conv.id)
    setMessages(conv.messages)
    setRetryMsg(null)
    setError('')
    setShowHistory(false)
  }

  function deleteConversation(id, e) {
    e.stopPropagation()
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id)
      writeConversations(next)
      return next
    })
    if (id === activeId) startNewChat()
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
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.25); }
          50%      { box-shadow: 0 0 0 6px rgba(99,102,241,0); }
        }
        .bot-glow { animation: glowPulse 2.5s ease-in-out infinite; }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .history-drop { animation: dropIn 0.15s ease both; }
      `}</style>

      <div className="flex flex-col h-[calc(100vh-8rem)]">

        {/* Header */}
        <div className="mb-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-900/40 bot-glow">
              🤖
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">AI Assistant</h2>
              <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Powered by Groq · {subjects.length} subjects · {assignments.filter(a => a.status !== 'done').length} pending
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative" ref={historyRef}>
            <button
              onClick={() => setShowHistory(v => !v)}
              className="text-xs text-gray-400 hover:text-white bg-gray-900/60 hover:bg-gray-800 border border-gray-800 hover:border-gray-600 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
            >
              🕐 History
              {conversations.length > 0 && (
                <span className="bg-indigo-600 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                  {conversations.length}
                </span>
              )}
            </button>
            <button
              onClick={startNewChat}
              className="text-xs text-gray-400 hover:text-white bg-gray-900/60 hover:bg-gray-800 border border-gray-800 hover:border-gray-600 px-3.5 py-2 rounded-xl transition"
            >
              + New chat
            </button>

            {/* History dropdown */}
            {showHistory && (
              <div className="history-drop absolute top-full right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl shadow-black/40 z-20 p-2">
                {conversations.length === 0 ? (
                  <div className="text-center text-gray-500 text-xs py-8 px-4">
                    No past conversations yet.<br />Start chatting and they'll show up here.
                  </div>
                ) : (
                  conversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => loadConversation(conv)}
                      className={`w-full text-left group flex items-start justify-between gap-2 px-3 py-2.5 rounded-xl transition mb-0.5
                        ${conv.id === activeId ? 'bg-indigo-600/15 border border-indigo-500/30' : 'hover:bg-gray-800/70 border border-transparent'}`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-gray-200 truncate">{conv.title}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{formatHistoryTime(conv.updatedAt)}</p>
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => deleteConversation(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400 text-xs flex-shrink-0 mt-0.5"
                        title="Delete conversation"
                      >
                        ✕
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 mb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex msg-appear ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-600/30 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 mt-1 mr-2.5 text-sm">
                  🤖
                </div>
              )}

              <div className={`flex flex-col gap-1 max-w-[78%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`group relative rounded-3xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm
                  ${msg.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-md shadow-indigo-900/30'
                    : 'bg-gray-900/80 border border-gray-800 text-gray-200 rounded-bl-md hover:border-gray-700 transition-colors'
                  }`}
                >
                  {msg.content}

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

                {msg.timestamp && (
                  <span className="text-[10px] text-gray-600 px-1">
                    {formatTime(msg.timestamp)}
                  </span>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/40 to-purple-600/40 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 mt-1 ml-2.5 text-sm">
                  👤
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex justify-start msg-appear">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-600/30 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 mt-1 mr-2.5 text-sm">
                🤖
              </div>
              <div className="bg-gray-900/80 border border-gray-800 rounded-3xl rounded-bl-md px-4 py-3.5 flex items-center gap-1.5">
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
          <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 mb-3 text-xs text-red-400 flex-shrink-0">
            <span>⚠️ {error}</span>
            <div className="flex items-center gap-2 ml-3">
              {retryMsg && (
                <button
                  onClick={() => { setError(''); sendMessage(retryMsg) }}
                  className="text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-lg transition"
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
                key={s.text}
                onClick={() => sendMessage(s.text)}
                disabled={sending}
                className="text-xs bg-gray-900/60 border border-gray-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-gray-400 hover:text-white px-3.5 py-2 rounded-full transition disabled:opacity-40 hover:scale-[1.03] active:scale-95 flex items-center gap-1.5"
              >
                <span>{s.icon}</span>
                {s.text}
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
            className="flex-1 bg-gray-900/70 border border-gray-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none transition text-sm disabled:opacity-60"
          />
          <button
            onClick={() => sendMessage()}
            disabled={sending || !input.trim()}
            className="bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white w-12 h-auto rounded-2xl transition font-medium text-sm flex items-center justify-center shadow-lg shadow-indigo-900/30"
          >
            {sending ? '…' : '➤'}
          </button>
        </div>

      </div>
    </>
  )
}