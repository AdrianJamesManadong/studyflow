import { useState, useRef, useEffect } from 'react'
import { useSubjects } from '../hooks/useSubjects'
import { useAssignments } from '../hooks/useAssignments'
import { useGrades } from '../hooks/useGrades'
import { useNotes } from '../hooks/useNotes'

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY

const SUGGESTIONS = [
  'What assignments do I have coming up?',
  'How is my grade average looking?',
  'Give me a study plan for today',
  'Quiz me on my notes',
  'What subject should I focus on?',
]

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: "Hi! I'm your AI study assistant. I can see your subjects, assignments, grades, and notes. How can I help you today? 📚"
}

export default function AIAssistant() {
  const { subjects } = useSubjects()
  const { assignments } = useAssignments()
  const { grades, getOverallAverage, getLetterGrade } = useGrades()
  const { notes } = useNotes()

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('sf_ai_chat')
      return saved ? JSON.parse(saved) : [INITIAL_MESSAGE]
    } catch {
      return [INITIAL_MESSAGE]
    }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    localStorage.setItem('sf_ai_chat', JSON.stringify(messages))
  }, [messages])

  function buildContext() {
    const pending = assignments.filter(a => a.status !== 'done')
    const overdue = pending.filter(a => new Date(a.due_date) < new Date())
    const overall = getOverallAverage()

    return `
You are a helpful study assistant for a student. Here is their current academic data:

SUBJECTS: ${subjects.map(s => s.name).join(', ') || 'None yet'}

PENDING ASSIGNMENTS (${pending.length}):
${pending.map(a => `- ${a.title} | Due: ${a.due_date} | Priority: ${a.priority}`).join('\n') || 'None'}

OVERDUE ASSIGNMENTS (${overdue.length}):
${overdue.map(a => `- ${a.title} | Due: ${a.due_date}`).join('\n') || 'None'}

GRADES:
${grades.map(g => `- ${g.title}: ${g.score}/${g.max_score} (${((g.score/g.max_score)*100).toFixed(1)}%)`).join('\n') || 'None yet'}
Overall Average: ${overall ? `${overall}% (${getLetterGrade(parseFloat(overall))})` : 'No grades yet'}

NOTES: ${notes.map(n => n.title).join(', ') || 'None yet'}

Be concise, helpful, motivating, and specific to their data. Use emojis occasionally.
    `.trim()
  }

  async function sendMessage(text) {
    const userText = text || input.trim()
    if (!userText) return

    const newMessages = [...messages, { role: 'user', content: userText }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: buildContext() },
              ...newMessages.map(m => ({ role: m.role, content: m.content }))
            ],
            max_tokens: 1024,
          })
        }
      )

      const data = await response.json()
      const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  function clearChat() {
    setMessages([INITIAL_MESSAGE])
    localStorage.removeItem('sf_ai_chat')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">AI Assistant</h2>
          <p className="text-gray-400 text-sm mt-1">Powered by Groq — knows your subjects, grades, and assignments.</p>
        </div>
        <button
          onClick={clearChat}
          className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition"
        >
          Clear chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
              ${msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-br-sm'
                : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-bl-sm'
              }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="flex gap-2 flex-wrap mb-3">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-xs bg-gray-900 border border-gray-800 hover:border-indigo-500/50 text-gray-400 hover:text-white px-3 py-1.5 rounded-full transition"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask anything about your studies..."
          disabled={loading}
          className="flex-1 bg-gray-900 border border-gray-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none transition text-sm"
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 rounded-xl transition"
        >
          ➤
        </button>
      </div>

    </div>
  )
}