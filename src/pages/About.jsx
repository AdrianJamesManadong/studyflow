export default function About() {
  const techStack = [
    { label: 'Frontend', value: 'React + Tailwind CSS' },
    { label: 'Backend', value: 'Supabase' },
    { label: 'AI Assistant', value: 'Groq (Llama 3.3)' },
    { label: 'Auth', value: 'Supabase Auth' },
    { label: 'Database', value: 'PostgreSQL' },
    { label: 'Deployment', value: 'Vercel' },
  ]

  const features = [
    { icon: '📚', label: 'Subject Management' },
    { icon: '📝', label: 'Assignment Tracker' },
    { icon: '📊', label: 'Grade Analytics' },
    { icon: '🗒️', label: 'Notes Editor' },
    { icon: '📅', label: 'Academic Calendar' },
    { icon: '⏱️', label: 'Pomodoro Timer' },
    { icon: '🤖', label: 'AI Study Assistant' },
    { icon: '🔔', label: 'Push Notifications' },
  ]

  return (
    <div className="max-w-2xl space-y-6">

      <div>
        <h2 className="text-2xl font-bold text-white">About</h2>
        <p className="text-gray-400 text-sm mt-1">Meet the developer behind StudyFlow</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center space-y-4">
        <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-white text-4xl font-bold mx-auto">
          A
        </div>

        <div>
          <h3 className="text-2xl font-bold text-white">Adrian James D. Manadong</h3>
          <p className="text-indigo-400 mt-1">2nd Year BSIT Student</p>
          <p className="text-gray-400 text-sm mt-0.5">New Era University</p>
        </div>

        <p className="text-gray-400 text-sm leading-relaxed max-w-md mx-auto">
          A passionate IT student who built StudyFlow to help students like himself stay organized,
          track their academic progress, and study smarter with the help of AI.
        </p>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <a
            href="mailto:adrianjames082506@gmail.com"
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-500/50 text-gray-300 hover:text-white px-4 py-2.5 rounded-xl text-sm transition"
          >
            <span>📧</span> Email Me
          </a>
          <a
            href="https://github.com/AdrianJamesManadong"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-500/50 text-gray-300 hover:text-white px-4 py-2.5 rounded-xl text-sm transition"
          >
            <span>🐙</span> GitHub
          </a>
          <a
            href="https://www.facebook.com/adrianjames.manadong.9"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-500/50 text-gray-300 hover:text-white px-4 py-2.5 rounded-xl text-sm transition"
          >
            <span>👤</span> Facebook
          </a>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h4 className="text-white font-semibold text-lg">About StudyFlow</h4>
        <p className="text-gray-400 text-sm leading-relaxed">
          StudyFlow is a full-stack student productivity app designed to help students manage
          their academic life in one place. From tracking assignments and grades to taking notes
          and staying focused with a Pomodoro timer — StudyFlow has everything a student needs.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {techStack.map(item => (
            <div key={item.label} className="bg-gray-800 rounded-xl p-3">
              <p className="text-gray-500 text-xs">{item.label}</p>
              <p className="text-white text-sm font-medium mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-3">
        <h4 className="text-white font-semibold text-lg">Features</h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {features.map(f => (
            <div key={f.label} className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-2.5">
              <span>{f.icon}</span>
              <span className="text-gray-300 text-sm">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center pb-4">
        <p className="text-gray-600 text-xs">
          Built with ❤️ by Adrian James D. Manadong · {new Date().getFullYear()}
        </p>
        <p className="text-gray-700 text-xs mt-1">
          New Era University · BSIT 2nd Year
        </p>
      </div>

    </div>
  )
}