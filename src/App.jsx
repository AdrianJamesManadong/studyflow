import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
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
          <Route path="profile" element={<Profile />} />
          <Route path="about" element={<About />} />
          <Route path="admin" element={<Admin />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
} 