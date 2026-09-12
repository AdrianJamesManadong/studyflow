import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useSubjects } from '../hooks/useSubjects'
import { useAssignments } from '../hooks/useAssignments'
import { useReminders } from '../hooks/useReminders'
import { useGrades } from '../hooks/useGrades'
import { useNotes } from '../hooks/useNotes'
import { useEvents } from '../hooks/useEvents'
import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'
import {
  Bot,
  User,
  Clock,
  X,
  Check,
  Copy,
  AlertTriangle,
  RotateCcw,
  Send,
  Loader2,
  ClipboardList,
  BarChart3,
  CalendarDays,
  Calendar,
  Brain,
  Target,
  Paperclip,
  FileText,
  Image as ImageIcon,
} from 'lucide-react'

// Resolve the worker as a locally bundled asset via Vite's `new URL(...,
// import.meta.url)` pattern, rather than importing it directly or pointing
// at a CDN. pdfjs-dist v3 (the version installed in this project) ships
// `pdf.worker.min.js`; v4+ renamed it to `pdf.worker.min.mjs`. If this
// project is ever upgraded to pdfjs-dist v4+, change the filename below
// to `pdf.worker.min.mjs`.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString()

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY

const TEXT_MODEL   = 'openai/gpt-oss-120b'
// Groq deprecated meta-llama/llama-4-scout-17b-16e-instruct (June 2026).
// qwen/qwen3.6-27b is the current vision-capable model — handles text + images.
const VISION_MODEL = 'qwen/qwen3.6-27b'

const MAX_CONVERSATIONS = 30
const MAX_IMAGES_PER_MESSAGE = 3 // Groq's current per-request limit for qwen3.6-27b
// Groq's base64 request limit per image. Base64 encoding inflates a file's
// raw byte size by ~33%, so this must be checked against the ENCODED payload
// size, not file.size — checking file.size let images through that were
// actually too large once encoded, which the API then rejected.
const MAX_IMAGE_ENCODED_BYTES = 4 * 1024 * 1024
const MAX_TEXT_FILE_CHARS = 4000
const MAX_PDF_PAGES = 30 // guard against extremely long PDFs blowing up the context

const SUGGESTIONS = [
  { text: 'What assignments do I have coming up?', icon: ClipboardList },
  { text: 'How is my grade average looking?',       icon: BarChart3    },
  { text: 'What reminders do I have?',               icon: AlertTriangle },
  { text: "What's on my calendar this week?",        icon: Calendar     },
  { text: 'Give me a study plan for today',          icon: CalendarDays },
  { text: 'Quiz me on my notes',                     icon: Brain        },
  { text: 'What subject should I focus on?',         icon: Target       },
]

function makeInitialMessage() {
  return {
    id:      crypto.randomUUID(),
    role:    'assistant',
    content: "Hi! I'm your AI study assistant. I can see your subjects, assignments, reminders, grades, and notes — and now you can send me photos, PDFs, or Word docs too (you can even paste an image straight in). How can I help you today? 📚",
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

// Fix: date-only strings like "2026-09-17" are parsed by `new Date()` as UTC
// midnight, which drifts across the "overdue" boundary against a local-time
// `todayStart` depending on timezone offset and time of day. Parsing the
// Y/M/D parts manually forces local-time interpretation, matching what the
// student actually sees on the calendar.
function parseLocalDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
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

// Groq's x-ratelimit-reset-* headers use Go's time.Duration string format,
// e.g. "2m59.56s", "1h2m3s", or a bare "7.66s" — this parses that into a
// plain number of seconds. Returns null if the string doesn't match.
function parseGroqDuration(str) {
  if (!str) return null
  if (/^\d+(\.\d+)?$/.test(str)) return parseFloat(str)
  const match = str.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?$/)
  if (!match || (!match[1] && !match[2] && !match[3])) return null
  const [, h, m, s] = match
  return (parseInt(h || 0, 10) * 3600) + (parseInt(m || 0, 10) * 60) + parseFloat(s || 0)
}

// Reads however Groq communicates the retry window on a 429. Groq's own
// error message usually states the real wait directly — e.g. "Please try
// again in 7.66s" — and correctly reflects whichever limit was actually
// hit (requests vs. tokens), which matters a lot for image-heavy messages
// that burn far more tokens than the request-count headers would suggest.
// Falls back to a standard Retry-After header, then Groq's reset-* headers,
// and returns null only if none of those are present or parseable.
function getRetrySeconds(response, errData) {
  const msg = errData?.error?.message || ''
  const msgMatch = msg.match(/try again in ([\w.]+)/i)
  if (msgMatch) {
    const parsed = parseGroqDuration(msgMatch[1])
    if (parsed !== null) return parsed
  }
  const retryAfter = response.headers.get('retry-after')
  if (retryAfter) {
    const n = parseFloat(retryAfter)
    if (!Number.isNaN(n)) return n
  }
  const groqReset = response.headers.get('x-ratelimit-reset-requests')
    || response.headers.get('x-ratelimit-reset-tokens')
  return parseGroqDuration(groqReset)
}

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`
}

/* ── Lightweight markdown rendering for AI responses (no external deps) ──
   Handles: fenced code blocks (```lang ... ```), # / ## / ### headers,
   - / * bullet lists, 1. numbered lists, **bold**, *italic*, `inline code`.
   Anything not recognized falls through as a plain paragraph. */

function InlineMarkdown({ text, keyPrefix }) {
  const parts = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g
  let lastIndex = 0
  let match
  let i = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`${keyPrefix}-t${i++}`}>{text.slice(lastIndex, match.index)}</span>)
    }
    const token = match[0]
    if (token.startsWith('**')) {
      parts.push(<strong key={`${keyPrefix}-b${i++}`} className="font-semibold">{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('`')) {
      parts.push(
        <code key={`${keyPrefix}-c${i++}`} className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 text-[0.85em] font-mono">
          {token.slice(1, -1)}
        </code>
      )
    } else {
      parts.push(<em key={`${keyPrefix}-i${i++}`}>{token.slice(1, -1)}</em>)
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) {
    parts.push(<span key={`${keyPrefix}-t${i++}`}>{text.slice(lastIndex)}</span>)
  }
  return parts
}

function parseMarkdownBlocks(text) {
  const lines = text.split('\n')
  const blocks = []
  let listBuffer = null
  let i = 0

  function flushList() {
    if (listBuffer) { blocks.push(listBuffer); listBuffer = null }
  }

  while (i < lines.length) {
    const line = lines[i]
    const headerMatch = line.match(/^(#{1,4})\s+(.*)$/)
    const ulMatch     = line.match(/^\s*[-*]\s+(.*)$/)
    const olMatch     = line.match(/^\s*\d+\.\s+(.*)$/)

    if (headerMatch) {
      flushList()
      blocks.push({ type: 'header', level: headerMatch[1].length, text: headerMatch[2] })
      i++
      continue
    }
    if (ulMatch) {
      if (!listBuffer || listBuffer.type !== 'ul') { flushList(); listBuffer = { type: 'ul', items: [] } }
      listBuffer.items.push(ulMatch[1])
      i++
      continue
    }
    if (olMatch) {
      if (!listBuffer || listBuffer.type !== 'ol') { flushList(); listBuffer = { type: 'ol', items: [] } }
      listBuffer.items.push(olMatch[1])
      i++
      continue
    }
    flushList()
    if (line.trim() === '') { i++; continue }

    const paraLines = [line]
    i++
    while (
      i < lines.length && lines[i].trim() !== '' &&
      !/^(#{1,4})\s+/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i])
      i++
    }
    blocks.push({ type: 'p', text: paraLines.join('\n') })
  }
  flushList()
  return blocks
}

function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  return (
    <div className="my-1 rounded-xl overflow-hidden border border-gray-700/50 bg-gray-900 text-gray-100">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800/80 text-gray-400 text-[11px]">
        <span className="font-mono">{language || 'code'}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 hover:text-white transition-colors">
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs"><code className="font-mono leading-relaxed whitespace-pre">{code}</code></pre>
    </div>
  )
}

function MarkdownContent({ content }) {
  const segments = []
  const codeFenceRegex = /```(\w+)?\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match
  let idx = 0
  while ((match = codeFenceRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index), key: `t${idx++}` })
    }
    segments.push({ type: 'code', language: match[1], content: match[2].replace(/\n$/, ''), key: `c${idx++}` })
    lastIndex = codeFenceRegex.lastIndex
  }
  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex), key: `t${idx++}` })
  }

  return (
    <div className="space-y-1.5">
      {segments.map(seg => {
        if (seg.type === 'code') return <CodeBlock key={seg.key} code={seg.content} language={seg.language} />

        return parseMarkdownBlocks(seg.content).map((block, bi) => {
          const key = `${seg.key}-${bi}`
          if (block.type === 'header') {
            const Tag = block.level <= 2 ? 'h4' : 'h5'
            return (
              <Tag key={key} className="font-semibold text-[0.98em] mt-1.5 first:mt-0">
                <InlineMarkdown text={block.text} keyPrefix={key} />
              </Tag>
            )
          }
          if (block.type === 'ul') {
            return (
              <ul key={key} className="list-disc pl-4 space-y-0.5 marker:text-indigo-400">
                {block.items.map((item, li) => (
                  <li key={`${key}-${li}`}><InlineMarkdown text={item} keyPrefix={`${key}-${li}`} /></li>
                ))}
              </ul>
            )
          }
          if (block.type === 'ol') {
            return (
              <ol key={key} className="list-decimal pl-4 space-y-0.5 marker:text-indigo-400">
                {block.items.map((item, li) => (
                  <li key={`${key}-${li}`}><InlineMarkdown text={item} keyPrefix={`${key}-${li}`} /></li>
                ))}
              </ol>
            )
          }
          return (
            <p key={key} className="whitespace-pre-wrap">
              <InlineMarkdown text={block.text} keyPrefix={key} />
            </p>
          )
        })
      })}
    </div>
  )
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// Extracts all text from a PDF's pages using PDF.js, client-side.
async function extractPdfText(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES)
  const pageTexts = []

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map(item => item.str).join(' ')
    pageTexts.push(pageText)
  }

  const truncatedNote = pdf.numPages > MAX_PDF_PAGES
    ? `\n…(showing first ${MAX_PDF_PAGES} of ${pdf.numPages} pages)`
    : ''

  return pageTexts.join('\n\n') + truncatedNote
}

/* ── Skeleton shown while hook data loads ── */
export function AIAssistantSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-pulse">
      <div className="mb-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gray-200 dark:bg-gray-800" />
          <div className="space-y-2">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
            <div className="h-3.5 w-56 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        </div>
        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      </div>

      <div className="flex-1 space-y-4 overflow-hidden">
        <div className="flex justify-start">
          <div className="flex gap-3 max-w-[75%]">
            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800 flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <div className="h-16 w-72 bg-gray-200 dark:bg-gray-800 rounded-2xl rounded-bl-sm" />
              <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="space-y-2 items-end flex flex-col">
            <div className="h-10 w-48 bg-indigo-100 dark:bg-indigo-950/40 rounded-2xl rounded-br-sm" />
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        </div>
        <div className="flex justify-start">
          <div className="flex gap-3 max-w-[75%]">
            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800 flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <div className="h-24 w-80 bg-gray-200 dark:bg-gray-800 rounded-2xl rounded-bl-sm" />
              <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        {[120, 96, 140, 110].map(w => (
          <div key={w} className="h-8 bg-gray-200 dark:bg-gray-800 rounded-full" style={{ width: w }} />
        ))}
      </div>

      <div className="flex gap-3">
        <div className="flex-1 h-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl" />
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      </div>
    </div>
  )
}

export default function AIAssistant() {
  const { subjects,    loading: subjectsLoading    } = useSubjects()
  const { assignments, loading: assignmentsLoading } = useAssignments()
  const { reminders,   loading: remindersLoading   } = useReminders()
  const { grades, getOverallAverage, getLetterGrade,
          loading: gradesLoading                   } = useGrades()
  const { notes,       loading: notesLoading       } = useNotes()
  const { events } = useEvents()

  const dataLoading = subjectsLoading || assignmentsLoading || remindersLoading || gradesLoading || notesLoading

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
  const [attachments, setAttachments] = useState([]) // { id, kind: 'image'|'text', name, dataUrl?, content?, size }
  const [attachError, setAttachError] = useState('')
  const [pasteFlash, setPasteFlash] = useState(false)
  const [rateLimitUntil, setRateLimitUntil] = useState(null)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [rateLimitFallbackSeconds, setRateLimitFallbackSeconds] = useState(30)
  const bottomRef                 = useRef(null)
  const inputRef                  = useRef(null)
  const historyRef                = useRef(null)
  const fileInputRef              = useRef(null)

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

  // Drives the live "available in Xs" countdown while a rate limit is active,
  // and auto-clears it once the window has passed — otherwise the stale
  // "Rate limit reached" banner would linger even after sending works again.
  useEffect(() => {
    if (!rateLimitUntil) return
    const id = setInterval(() => {
      const remaining = rateLimitUntil.getTime() - Date.now()
      if (remaining <= 0) {
        clearInterval(id)
        setRateLimitUntil(null)
        setError(prev => (prev && prev.startsWith('Rate limit')) ? '' : prev)
      } else {
        setNowTick(Date.now())
      }
    }, 1000)
    return () => clearInterval(id)
  }, [rateLimitUntil])

  const todayStart = useMemo(getTodayStart, [])

  const context = useMemo(() => {
    const pending = assignments.filter(a => a.status !== 'done')
    const overdue = pending.filter(a => {
      const d = parseLocalDate(a.due_date)
      return d && d < todayStart
    })

    const subjectNameById = new Map(subjects.map(s => [s.id, s.name]))
    const withSubject = (a) => subjectNameById.get(a.subject_id) ? ` (${subjectNameById.get(a.subject_id)})` : ''

    const overall = getOverallAverage()

    const pendingReminders = reminders.filter(r => !r.is_done)
    const overdueReminders = pendingReminders.filter(r => {
      const d = parseLocalDate(r.due_date)
      return d && d < todayStart
    })

    const notesContext = notes.length > 0
      ? notes.slice(0, 10).map(n =>
          `- ${n.title}${n.content ? `: ${n.content.slice(0, 200)}${n.content.length > 200 ? '…' : ''}` : ''}`
        ).join('\n')
      : 'None yet'

    const upcomingEvents = events.filter(e => {
      const d = parseLocalDate(e.date)
      return d && d >= todayStart
    })
    const recentPastEvents = events
      .filter(e => {
        const d = parseLocalDate(e.date)
        return d && d < todayStart
      })
      .slice(-5) // events are ordered ascending by date, so this is the most recent handful of past ones

    const formatEvent = (e) => `- ${e.title}${e.time ? ` at ${e.time}` : ''} | Date: ${e.date}${e.description ? ` | ${e.description}` : ''}`

    return `
You are a helpful study assistant for a student. Today's date is ${todayStart.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Use this as the source of truth for "today", "overdue", "upcoming", etc. — do not infer the date from anything else.

Here is their current academic data:

SUBJECTS: ${subjects.map(s => s.name).join(', ') || 'None yet'}

PENDING ASSIGNMENTS (${pending.length}):
${pending.map(a => `- ${a.title}${withSubject(a)} | Due: ${a.due_date} | Priority: ${a.priority}`).join('\n') || 'None'}

OVERDUE ASSIGNMENTS (${overdue.length}):
${overdue.map(a => `- ${a.title}${withSubject(a)} | Due: ${a.due_date}`).join('\n') || 'None'}

PENDING REMINDERS (${pendingReminders.length}):
${pendingReminders.map(r => `- ${r.title}${r.due_date ? ` | Due: ${r.due_date}${r.due_time ? ` ${r.due_time}` : ''}` : ' | No due date'} | Priority: ${r.priority}`).join('\n') || 'None'}

OVERDUE REMINDERS (${overdueReminders.length}):
${overdueReminders.map(r => `- ${r.title} | Due: ${r.due_date}`).join('\n') || 'None'}

GRADES:
${grades.map(g => {
  const pct = g.max_score > 0 ? ((g.score / g.max_score) * 100).toFixed(1) : '0.0'
  return `- ${g.title}: ${g.score}/${g.max_score} (${pct}%)`
}).join('\n') || 'None yet'}
Overall Average: ${overall ? `${overall}% (${getLetterGrade(parseFloat(overall))})` : 'No grades yet'}

NOTES (${notes.length}):
${notesContext}

UPCOMING CALENDAR EVENTS (${upcomingEvents.length}):
${upcomingEvents.map(formatEvent).join('\n') || 'None'}

RECENT PAST CALENDAR EVENTS:
${recentPastEvents.map(formatEvent).join('\n') || 'None'}

The student may also attach photos (e.g. handwritten notes, textbook pages, screenshots), PDFs, or Word documents — read them carefully and answer using their actual content.

Be concise, helpful, motivating, and specific to their data. Use emojis occasionally. Format responses with line breaks for readability.
    `.trim()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects, assignments, reminders, grades, notes, events, todayStart])

  function resetFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Shared by both the file picker and clipboard paste.
  const addImageFile = useCallback(async (file) => {
    const currentImageCount = attachments.filter(a => a.kind === 'image').length
    if (currentImageCount >= MAX_IMAGES_PER_MESSAGE) {
      setAttachError(`You can attach up to ${MAX_IMAGES_PER_MESSAGE} images per message.`)
      return
    }
    try {
      const dataUrl = await readFileAsDataURL(file)
      // Check the ENCODED (base64) size, not file.size — base64 inflates the
      // raw byte count by ~33%, so a file that looks fine at file.size can
      // still blow past Groq's real per-image limit once encoded.
      const base64Part = dataUrl.slice(dataUrl.indexOf(',') + 1)
      const encodedBytes = Math.ceil(base64Part.length * 3 / 4)
      if (encodedBytes > MAX_IMAGE_ENCODED_BYTES) {
        setAttachError(`"${file.name || 'Image'}" is too large once encoded — try an image under ~3MB.`)
        return
      }
      setAttachments(prev => [...prev, {
        id: crypto.randomUUID(), kind: 'image', name: file.name || `pasted-image-${prev.length + 1}.png`, dataUrl, size: file.size,
      }])
    } catch {
      setAttachError(`Couldn't read that image. Please try again.`)
    }
  }, [attachments])

  const addTextFile = useCallback(async (file) => {
    try {
      const text = await readFileAsText(file)
      const truncated = text.length > MAX_TEXT_FILE_CHARS
        ? text.slice(0, MAX_TEXT_FILE_CHARS) + '\n…(truncated)'
        : text
      setAttachments(prev => [...prev, {
        id: crypto.randomUUID(), kind: 'text', name: file.name, content: truncated, size: file.size,
      }])
    } catch {
      setAttachError(`Couldn't read "${file.name}". Please try again.`)
    }
  }, [])

  const addDocxFile = useCallback(async (file) => {
    try {
      const arrayBuffer = await readFileAsArrayBuffer(file)
      const { value: text, messages: mammothMessages } = await mammoth.extractRawText({ arrayBuffer })

      if (!text || !text.trim()) {
        setAttachError(`"${file.name}" appears to be empty or couldn't be read.`)
        return
      }

      const truncated = text.length > MAX_TEXT_FILE_CHARS
        ? text.slice(0, MAX_TEXT_FILE_CHARS) + '\n…(truncated)'
        : text

      setAttachments(prev => [...prev, {
        id: crypto.randomUUID(), kind: 'text', name: file.name, content: truncated, size: file.size,
      }])

      // mammoth reports non-fatal issues (unsupported styles, etc.) via
      // `messages` rather than throwing — log for debugging, don't block.
      if (mammothMessages?.length) {
        console.warn(`mammoth: ${file.name}`, mammothMessages)
      }
    } catch {
      setAttachError(`Couldn't read "${file.name}". Make sure it's a valid .docx file.`)
    }
  }, [])

  const addPdfFile = useCallback(async (file) => {
    try {
      const arrayBuffer = await readFileAsArrayBuffer(file)
      const text = await extractPdfText(arrayBuffer)

      if (!text || !text.trim()) {
        setAttachError(`"${file.name}" doesn't seem to contain extractable text (it may be a scanned image PDF).`)
        return
      }

      const truncated = text.length > MAX_TEXT_FILE_CHARS
        ? text.slice(0, MAX_TEXT_FILE_CHARS) + '\n…(truncated)'
        : text

      setAttachments(prev => [...prev, {
        id: crypto.randomUUID(), kind: 'text', name: file.name, content: truncated, size: file.size,
      }])
    } catch (err) {
      console.error('PDF read error:', err)
      setAttachError(`Couldn't read "${file.name}": ${err.message}`)
    }
  }, [])

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files || [])
    resetFileInput()
    if (files.length === 0) return

    setAttachError('')
    for (const file of files) {
      const isImage = file.type.startsWith('image/')
      const isDocx  = /\.docx$/i.test(file.name) ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      const isPdf   = /\.pdf$/i.test(file.name) || file.type === 'application/pdf'
      const isText  = /\.(txt|md|csv|json)$/i.test(file.name) || file.type === 'text/plain'

      if (isImage) {
        await addImageFile(file)
      } else if (isDocx) {
        await addDocxFile(file)
      } else if (isPdf) {
        await addPdfFile(file)
      } else if (isText) {
        await addTextFile(file)
      } else {
        setAttachError(`"${file.name}" isn't supported yet — try an image, PDF, .docx, or a .txt/.md/.csv/.json file.`)
      }
    }
  }

  // Paste an image straight from the clipboard (screenshot, copied image, etc.)
  // into the input — no need to save it as a file first.
  async function handlePaste(e) {
    const items = Array.from(e.clipboardData?.items || [])
    const imageItem = items.find(item => item.type.startsWith('image/'))
    if (!imageItem) return // let normal text paste happen

    e.preventDefault()
    const file = imageItem.getAsFile()
    if (!file) return

    setAttachError('')
    await addImageFile(file)
    setPasteFlash(true)
    setTimeout(() => setPasteFlash(false), 600)
  }

  function removeAttachment(id) {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  // Builds the OpenAI-style `content` for a message that may include images.
  function buildContent(text, images) {
    if (!images || images.length === 0) return text
    return [
      { type: 'text', text: text || '(see attached image)' },
      ...images.map(img => ({ type: 'image_url', image_url: { url: img.dataUrl } })),
    ]
  }

  const sendMessage = useCallback(async (text) => {
    const rawText = (text !== undefined ? text : input).trim()
    const currentAttachments = text !== undefined ? [] : attachments // suggestion clicks never carry attachments
    const stillRateLimited = rateLimitUntil && Date.now() < rateLimitUntil.getTime()
    if ((!rawText && currentAttachments.length === 0) || sending || stillRateLimited) return

    const imageAttachments = currentAttachments.filter(a => a.kind === 'image')
    const textAttachments  = currentAttachments.filter(a => a.kind === 'text')

    // The extracted text from PDFs/docx/text files is sent to the AI as
    // hidden context (`fileContext`) but never shown in the chat bubble —
    // the bubble only shows a small file chip, the way ChatGPT-style apps
    // do it, instead of dumping the whole document into view.
    const textFileBlock = textAttachments
      .map(a => `\n\n--- Attached file: ${a.name} ---\n${a.content}\n--- end file ---`)
      .join('')

    let displayText = rawText
    if (!displayText) {
      if (imageAttachments.length > 0 && textAttachments.length > 0) displayText = 'Please look at the attached files.'
      else if (imageAttachments.length > 0) displayText = 'Please look at the attached image(s).'
      else if (textAttachments.length > 0) displayText = 'Please look at the attached file(s).'
    }

    const userMsg = {
      id:          crypto.randomUUID(),
      role:        'user',
      content:     displayText,
      fileContext: textFileBlock || undefined,
      files:       textAttachments.map(a => ({ name: a.name, size: a.size })),
      images:      imageAttachments.map(a => ({ name: a.name, dataUrl: a.dataUrl })),
      timestamp:   new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setAttachments([])
    setAttachError('')
    setRetryMsg(null)
    setSending(true)
    setError('')

    // If this message seems to be asking about a previously attached file
    // (and isn't attaching anything new itself), find the most recent past
    // message that had one so its full text can be temporarily re-supplied
    // for just this turn — without permanently re-sending it every message.
    const referencesOldFile = imageAttachments.length === 0 && textAttachments.length === 0 &&
      /\b(file|pdf|docx|document|attachment|attached|uploaded)\b/i.test(rawText)
    const referencedFileMsg = referencesOldFile
      ? [...messages].reverse().find(m => m.fileContext)
      : null

    // Only the CURRENT message's images/files are sent in full to the API —
    // older attachments in history are swapped for a short marker once the
    // AI has already responded to them. Resending a full PDF/image on every
    // later turn was ballooning token usage per request and needlessly
    // forcing every later message onto the heavier, tighter-rate-limited
    // vision model even after the image was no longer relevant — this was
    // the main driver of hitting Groq's rate limit.
    const historySlice = messages.slice(-20).concat(userMsg)
    const needsVision = imageAttachments.length > 0
    const model = needsVision ? VISION_MODEL : TEXT_MODEL

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          messages: [
            {
              role:    'system',
              content: dataLoading
                ? "The student's data is still loading. Tell them you'll have their full context in a moment and to try again shortly."
                : context,
            },
            ...historySlice.map(m => {
              const isCurrentTurn = m.id === userMsg.id
              const isReattached  = !isCurrentTurn && referencedFileMsg && m.id === referencedFileMsg.id
              const includeFull   = isCurrentTurn || isReattached
              const text = (m.content || '') + (includeFull ? (m.fileContext || '') : '')
              // Older turns keep a short note instead of the full image/file
              // payload — the AI already responded to it once, so re-sending
              // the whole thing every subsequent request just burns tokens.
              // Skip the note when we're re-attaching the full text instead.
              const olderNote = (!isCurrentTurn && !isReattached)
                ? (m.images?.length ? ' [image attached earlier]' : '') +
                  (m.files?.length ? ` [file attached earlier: ${m.files.map(f => f.name).join(', ')}]` : '')
                : ''
              return {
                role: m.role,
                content: buildContent(text + olderNote, isCurrentTurn ? m.images : undefined),
              }
            }),
          ],
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        const status  = response.status
        if (status === 401) throw new Error('Invalid API key. Check your VITE_GROQ_API_KEY.')
        if (status === 429) {
          const retrySeconds = getRetrySeconds(response, errData)
          let seconds
          if (retrySeconds !== null) {
            seconds = retrySeconds
            setRateLimitFallbackSeconds(30) // reset backoff now that we have a real value
          } else {
            seconds = rateLimitFallbackSeconds
            setRateLimitFallbackSeconds(prev => Math.min(prev * 2, 300)) // back off up to 5 min
          }
          const availableAt = new Date(Date.now() + seconds * 1000)
          setRateLimitUntil(availableAt)
          const timeStr = availableAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          const hasAttachments = imageAttachments.length > 0 || textAttachments.length > 0
          const context = hasAttachments ? ' while processing your file(s)' : ''
          throw new Error(
            retrySeconds !== null
              ? `Rate limit reached${context}. Available again at ${timeStr}.`
              : `Rate limit reached${context}. Should clear by about ${timeStr}.`
          )
        }
        if (status === 413) throw new Error('Attachment too large for the request. Try a smaller image.')
        if (status === 404) throw new Error('The AI model is unavailable right now. Please try again later.')
        throw new Error(errData?.error?.message || `API error ${status}. Please try again.`)
      }

      const data  = await response.json()
      const reply = data.choices?.[0]?.message?.content
      if (!reply) throw new Error('Empty response from AI. Please try again.')

      setRateLimitUntil(null)
      setRateLimitFallbackSeconds(30)
      setMessages(prev => [...prev, {
        id:        crypto.randomUUID(),
        role:      'assistant',
        content:   reply,
        timestamp: new Date().toISOString(),
      }])
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setMessages(prev => prev.filter(m => m.id !== userMsg.id))
      setInput(rawText)
      setAttachments(currentAttachments)
      setRetryMsg(currentAttachments.length === 0 ? rawText : null) // one-click retry only for plain text
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [input, attachments, sending, messages, context, dataLoading])

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
    setAttachments([])
    setAttachError('')
    setRetryMsg(null)
    setError('')
    setShowHistory(false)
  }

  function loadConversation(conv) {
    setActiveId(conv.id)
    setMessages(conv.messages)
    setAttachments([])
    setAttachError('')
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
  const remainingRateLimitMs = rateLimitUntil ? Math.max(0, rateLimitUntil.getTime() - nowTick) : 0

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
          0%, 100% { box-shadow: 0 0 0 0 rgba(79,70,229,0.20); }
          50%      { box-shadow: 0 0 0 6px rgba(79,70,229,0); }
        }
        .bot-glow { animation: glowPulse 2.5s ease-in-out infinite; }
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .history-drop { animation: dropIn 0.15s ease both; }
        @keyframes pasteRing {
          0%   { box-shadow: 0 0 0 0 rgba(79,70,229,0.35); }
          100% { box-shadow: 0 0 0 6px rgba(79,70,229,0); }
        }
        .paste-flash { animation: pasteRing 0.6s ease-out; }
      `}</style>

      <div className="flex flex-col h-[calc(100vh-8rem)]">

        {/* Header */}
        <div className="mb-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-indigo-950/40 bot-glow">
              <Bot size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">AI Assistant</h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Powered by Groq · {subjects.length} subjects · {assignments.filter(a => a.status !== 'done').length} pending
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative" ref={historyRef}>
            <button
              onClick={() => setShowHistory(v => !v)}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 px-3.5 py-2 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Clock size={13} /> History
              {conversations.length > 0 && (
                <span className="bg-indigo-600 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                  {conversations.length}
                </span>
              )}
            </button>
            <button
              onClick={startNewChat}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 px-3.5 py-2 rounded-xl shadow-sm transition-colors"
            >
              + New chat
            </button>

            {/* History dropdown */}
            {showHistory && (
              <div className="history-drop absolute top-full right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-20 p-2">
                {conversations.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 text-xs py-8 px-4">
                    No past conversations yet.<br />Start chatting and they'll show up here.
                  </div>
                ) : (
                  conversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => loadConversation(conv)}
                      className={`w-full text-left group flex items-start justify-between gap-2 px-3 py-2.5 rounded-xl transition-colors mb-0.5
                        ${conv.id === activeId ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'}`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-gray-800 dark:text-gray-200 truncate">{conv.title}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{formatHistoryTime(conv.updatedAt)}</p>
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => deleteConversation(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 flex-shrink-0 mt-0.5"
                        title="Delete conversation"
                      >
                        <X size={13} />
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
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/40 dark:to-violet-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center flex-shrink-0 mt-1 mr-2.5">
                  <Bot size={16} className="text-indigo-600 dark:text-indigo-400" />
                </div>
              )}

              <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'max-w-[78%] items-end' : 'max-w-[85%] items-start'}`}>
                {msg.images && msg.images.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {msg.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img.dataUrl}
                        alt={img.name}
                        className="w-20 h-20 object-cover rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                      />
                    ))}
                  </div>
                )}

                {msg.files && msg.files.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {msg.files.map((f, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-1.5 pr-2.5 py-1.5 shadow-sm"
                      >
                        <div className="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                          <FileText size={12} className="text-gray-500 dark:text-gray-400" />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-300 max-w-[140px] truncate">{f.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className={`group relative rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm
                  ${msg.role === 'user' ? 'whitespace-pre-wrap' : ''}
                  ${msg.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-md'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-md hover:border-gray-300 dark:hover:border-gray-600 transition-colors'
                  }`}
                >
                  {msg.role === 'assistant' ? <MarkdownContent content={msg.content} /> : msg.content}

                  <button
                    onClick={() => copyMessage(msg.id, msg.content)}
                    title="Copy message"
                    className={`absolute -top-2 ${msg.role === 'user' ? '-left-8' : '-right-8'}
                      opacity-0 group-hover:opacity-100 transition-opacity
                      w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm
                      flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700`}
                  >
                    {copiedId === msg.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>

                {msg.timestamp && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 px-1">
                    {formatTime(msg.timestamp)}
                  </span>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center flex-shrink-0 mt-1 ml-2.5">
                  <User size={16} className="text-gray-600 dark:text-gray-300" />
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex justify-start msg-appear">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/40 dark:to-violet-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center flex-shrink-0 mt-1 mr-2.5">
                <Bot size={16} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl rounded-bl-md px-4 py-3.5 flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 bg-indigo-500 rounded-full dot-1" />
                <span className="w-2 h-2 bg-indigo-500 rounded-full dot-2" />
                <span className="w-2 h-2 bg-indigo-500 rounded-full dot-3" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Error + Retry */}
        {error && (
          <div className="flex items-center justify-between bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 mb-3 text-xs text-red-600 dark:text-red-400 flex-shrink-0">
            <span className="flex items-center gap-1.5">
              <AlertTriangle size={13} /> {error}
              {rateLimitUntil && remainingRateLimitMs > 0 && (
                <span className="font-semibold">· available in {formatCountdown(remainingRateLimitMs)}</span>
              )}
            </span>
            <div className="flex items-center gap-2 ml-3">
              {retryMsg && (
                <button
                  onClick={() => { setError(''); sendMessage(retryMsg) }}
                  disabled={remainingRateLimitMs > 0}
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RotateCcw size={11} /> Retry
                </button>
              )}
              <button onClick={() => { setError(''); setRateLimitUntil(null) }} className="hover:text-red-800 dark:hover:text-red-300 transition-colors">
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Attachment error */}
        {attachError && (
          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-2.5 mb-3 text-xs text-amber-700 dark:text-amber-400 flex-shrink-0">
            <span className="flex items-center gap-1.5"><AlertTriangle size={13} /> {attachError}</span>
            <button onClick={() => setAttachError('')} className="hover:text-amber-900 dark:hover:text-amber-300 transition-colors">
              <X size={13} />
            </button>
          </div>
        )}

        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3 flex-shrink-0">
            {attachments.map(a => (
              <div
                key={a.id}
                className="relative group flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-2 pr-7 py-1.5 shadow-sm"
              >
                {a.kind === 'image' ? (
                  <img src={a.dataUrl} alt={a.name} className="w-8 h-8 object-cover rounded-lg" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <FileText size={14} className="text-gray-500 dark:text-gray-400" />
                  </div>
                )}
                <span className="text-xs text-gray-600 dark:text-gray-300 max-w-[120px] truncate">{a.name}</span>
                <button
                  onClick={() => removeAttachment(a.id)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Suggestions */}
        {isOnlyInitialMessage && attachments.length === 0 && (
          <div className="flex gap-2 flex-wrap mb-3 flex-shrink-0">
            {SUGGESTIONS.map(s => (
              <button
                key={s.text}
                onClick={() => sendMessage(s.text)}
                disabled={sending}
                className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3.5 py-2 rounded-full shadow-sm transition-colors disabled:opacity-40 hover:scale-[1.03] active:scale-95 flex items-center gap-1.5"
              >
                <s.icon size={13} />
                {s.text}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-3 flex-shrink-0 items-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.txt,.md,.csv,.json,.docx,.pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            title="Attach photo, PDF, or file"
            className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-2xl text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-40"
          >
            <Paperclip size={18} />
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && remainingRateLimitMs <= 0 && sendMessage()}
            onPaste={handlePaste}
            placeholder={
              remainingRateLimitMs > 0
                ? `Rate limited — you can send again in ${formatCountdown(remainingRateLimitMs)}`
                : attachments.length > 0 ? 'Add a note about the attachment (optional)...' : 'Ask anything, or paste (Ctrl+V) an image...'
            }
            disabled={sending || remainingRateLimitMs > 0}
            className={`flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 rounded-2xl px-4 py-3.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition text-sm disabled:opacity-60 ${pasteFlash ? 'paste-flash' : ''}`}
          />
          <button
            onClick={() => sendMessage()}
            disabled={sending || remainingRateLimitMs > 0 || (!input.trim() && attachments.length === 0)}
            className="bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white w-12 h-12 flex-shrink-0 rounded-2xl transition-colors font-medium text-sm flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-indigo-950/40"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>

      </div>
    </>
  )
}