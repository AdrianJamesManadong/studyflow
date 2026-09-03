import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import { supabase } from './utils/supabase'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import DashboardHome from './pages/DashboardHome'
import Subjects from './pages/Subjects'
import Assignments from './pages/Assignments'
import Grades from './pages/Grades'
import Notes from './pages/Notes'
import Calendar from './pages/Calendar'
import Pomodoro from './pages/Pomodoro'
import AIAssistant from './pages/AIAssistant'
import Profile from './pages/Profile'
import About from './pages/About'
import Admin from './pages/Admin'
import ResetPassword from './pages/ResetPassword'
import Home from './pages/Home'
import Privacy from "./pages/Privacy";
import Feedback from './pages/Feedback'

async function pingLastSeen() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    await supabase.auth.updateUser({
      data: { last_seen_at: new Date().toISOString() }
    })
  }
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return user ? children : <Navigate to="/login" replace />
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return user ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  useEffect(() => {
    pingLastSeen()
    window.addEventListener('focus', pingLastSeen)
    return () => window.removeEventListener('focus', pingLastSeen)
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <PublicOnlyRoute>
            <Home />
          </PublicOnlyRoute>
        } />
        <Route path="/login" element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        } />
        <Route path="/register" element={
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        } />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardHome />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="grades" element={<Grades />} />
          <Route path="notes" element={<Notes />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="pomodoro" element={<Pomodoro />} />
          <Route path="ai" element={<AIAssistant />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="profile" element={<Profile />} />
          <Route path="about" element={<About />} />
          <Route path="admin" element={<Admin />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
