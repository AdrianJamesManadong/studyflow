import { useEffect, useState } from "react"
import {
  Atom,
  Database,
  Bot,
  Lock,
  Rocket,
  BookOpen,
  ClipboardList,
  BarChart3,
  NotebookPen,
  Calendar,
  Timer,
  Bell,
  Mail,
  Code2,
  Link2,
  GraduationCap,
  Sparkles,
  Heart,
  School,
} from "lucide-react"

/* ── Skeleton ── */
export function AboutSkeleton() {
  return (
    <div className="max-w-2xl space-y-4 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-6 w-20 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="h-3.5 w-52 bg-gray-200 dark:bg-gray-800 rounded" />
      </div>
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 flex flex-col items-center gap-5">
        <div className="w-[100px] h-[100px] rounded-full bg-gray-200 dark:bg-gray-800" />
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="h-5 w-60 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-3.5 w-36 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-3.5 w-28 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
        <div className="w-full h-px bg-gray-200 dark:bg-gray-700" />
        <div className="h-10 w-full max-w-sm bg-gray-200 dark:bg-gray-800 rounded-xl" />
        <div className="flex gap-2">
          {[110, 88, 96].map((w) => (
            <div key={w} className="h-9 bg-gray-200 dark:bg-gray-800 rounded-xl" style={{ width: w }} />
          ))}
        </div>
      </div>
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-4">
        <div className="h-4 w-36 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-8 w-full bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[60px] bg-gray-200 dark:bg-gray-800 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-3">
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-11 bg-gray-200 dark:bg-gray-800 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Page ── */
export default function About() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1600)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) return <AboutSkeleton />

  const techStack = [
    { label: "Frontend", value: "React + Tailwind", Icon: Atom },
    { label: "Backend", value: "Supabase", Icon: Database },
    { label: "AI", value: "Groq / Llama 3.3", Icon: Bot },
    { label: "Auth", value: "Supabase Auth", Icon: Lock },
    { label: "Database", value: "PostgreSQL", Icon: Database },
    { label: "Deployment", value: "Vercel", Icon: Rocket },
  ]

  const features = [
    { Icon: BookOpen, label: "Subject Management" },
    { Icon: ClipboardList, label: "Assignment Tracker" },
    { Icon: BarChart3, label: "Grade Analytics" },
    { Icon: NotebookPen, label: "Notes Editor" },
    { Icon: Calendar, label: "Academic Calendar" },
    { Icon: Timer, label: "Pomodoro Timer" },
    { Icon: Bot, label: "AI Study Assistant" },
    { Icon: Bell, label: "Push Notifications" },
  ]

  const socials = [
    { Icon: Mail, label: "Email Me", href: "mailto:adrianjames082506@gmail.com" },
    { Icon: Code2, label: "GitHub", href: "https://github.com/AdrianJamesManadong", target: "_blank" },
    { Icon: Link2, label: "Facebook", href: "https://www.facebook.com/adrianjames.manadong.9", target: "_blank" },
  ]

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0);   }
          50%       { transform: translateY(-5px); }
        }
        @keyframes ringPulse {
          0%, 100% { box-shadow: 0 0 0 0   rgba(79,70,229,.45); }
          60%       { box-shadow: 0 0 0 12px rgba(79,70,229,0);  }
        }
        @keyframes dotBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: .3; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes iconPop {
          0%   { transform: scale(.9) rotate(-4deg); }
          50%  { transform: scale(1.03) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        .fu1 { animation: fadeUp .45s cubic-bezier(.22,1,.36,1)   0ms both; }
        .fu2 { animation: fadeUp .45s cubic-bezier(.22,1,.36,1)  60ms both; }
        .fu3 { animation: fadeUp .45s cubic-bezier(.22,1,.36,1) 120ms both; }
        .fu4 { animation: fadeUp .45s cubic-bezier(.22,1,.36,1) 180ms both; }
        .fu5 { animation: fadeUp .45s cubic-bezier(.22,1,.36,1) 240ms both; }

        .avatar-float { animation: float 4s ease-in-out infinite; }
        .avatar-ring  { animation: ringPulse 2.8s ease-out infinite; }
        .online-dot   { animation: dotBlink 2s ease-in-out infinite; }
        .avatar-icon-wrap { animation: iconPop .5s cubic-bezier(.22,1,.36,1) both; }

        .name-shimmer {
          background: linear-gradient(90deg, #1e1b4b 0%, #4F46E5 40%, #A78BFA 60%, #1e1b4b 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3.5s linear infinite;
        }

        .dark .name-shimmer {
          background: linear-gradient(90deg, #c7d2fe 0%, #818cf8 40%, #c4b5fd 60%, #c7d2fe 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .social-btn {
          transition: border-color .15s, transform .18s, background .15s, box-shadow .18s;
        }
        .social-btn:hover {
          transform: translateY(-2px);
          border-color: rgba(79,70,229,.5) !important;
          box-shadow: 0 4px 12px rgba(79,70,229,.15);
        }
        .tech-card {
          transition: border-color .15s, transform .2s, box-shadow .2s;
        }
        .tech-card:hover {
          transform: translateY(-2px);
          border-color: rgba(79,70,229,.4) !important;
          box-shadow: 0 4px 14px rgba(79,70,229,.1);
        }
        .feat-row {
          transition: border-color .15s, transform .15s, box-shadow .15s;
        }
        .feat-row:hover {
          transform: translateX(3px);
          border-color: rgba(79,70,229,.3) !important;
          box-shadow: 2px 0 10px rgba(79,70,229,.08);
        }

        .avatar-icon {
          width: 100px;
          height: 100px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #4F46E5, #7C3AED, #A78BFA);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 8px 24px rgba(79,70,229,.35);
        }
        .avatar-icon::before {
          content: "";
          position: absolute;
          inset: 3px;
          border-radius: 9999px;
          background: linear-gradient(160deg, rgba(255,255,255,.18), rgba(255,255,255,0) 60%);
        }
        .avatar-initials {
          font-size: 34px;
          font-weight: 700;
          color: white;
          letter-spacing: 0.5px;
          position: relative;
          z-index: 1;
          text-shadow: 0 2px 6px rgba(0,0,0,.15);
        }
      `}</style>

      <div className="max-w-2xl space-y-4 pb-8">
        <div className="fu1">
          <div className="flex items-center gap-2.5 mb-0.5">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">About</h2>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              v1.0.0
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-xs font-mono">Meet the developer behind StudyFlow</p>
        </div>

        <div className="fu2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-indigo-500/[.08] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-violet-500/[.05] rounded-full blur-3xl pointer-events-none" />

          <div className="relative inline-block avatar-float">
            <div className="avatar-ring avatar-icon-wrap rounded-full">
              <div className="avatar-icon">
                <span className="avatar-initials">AM</span>
              </div>
            </div>
            <span className="online-dot absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-gray-50 dark:border-gray-900" />
          </div>

          <div>
            <h3 className="text-lg font-semibold tracking-tight name-shimmer">
              Adrian James D. Manadong
            </h3>
            <div className="flex items-center justify-center gap-1.5 flex-wrap mt-2">
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                2nd Year BSIT
              </span>
            </div>
            <p className="text-gray-400 dark:text-gray-500 text-xs font-mono mt-1.5 flex items-center justify-center gap-1">
              <School className="w-3.5 h-3.5" /> New Era University
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700" />

          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
            A passionate IT student who built StudyFlow to help students stay organized, track academic
            progress, and study smarter with AI.
          </p>

          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target={s.target}
                rel={s.target ? "noopener noreferrer" : undefined}
                className="social-btn flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm"
              >
                <s.Icon className="w-4 h-4" /> {s.label}
              </a>
            ))}
          </div>
        </div>

        <div className="fu3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-4">
          <h4 className="text-gray-900 dark:text-white font-semibold flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> About StudyFlow
          </h4>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
            A full-stack student productivity app for managing your entire academic life in one place —
            assignments, grades, notes, and focus sessions.
          </p>
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {techStack.map((item) => (
              <div
                key={item.label}
                className="tech-card flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 shadow-sm"
              >
                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <item.Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-gray-400 dark:text-gray-500 text-[10px] font-mono">{item.label}</p>
                  <p className="text-gray-900 dark:text-white text-sm font-medium mt-0.5">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="fu4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="text-gray-900 dark:text-white font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Features
            </h4>
            <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              8 active
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {features.map((f) => (
              <div
                key={f.label}
                className="feat-row flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 cursor-default shadow-sm"
              >
                <f.Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                <span className="text-gray-800 dark:text-gray-200 text-sm font-medium">{f.label}</span>
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

        <div className="fu5 text-center pb-1 space-y-0.5">
          <p className="text-gray-400 dark:text-gray-500 text-xs font-mono flex items-center justify-center gap-1">
            Built with <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" /> by Adrian James D. Manadong · {new Date().getFullYear()}
          </p>
          <p className="text-gray-300 dark:text-gray-600 text-xs">
            New Era University · BSIT 2nd Year
          </p>
        </div>
      </div>
    </>
  )
}