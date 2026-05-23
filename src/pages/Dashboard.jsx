import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import NotificationBell from '../components/NotificationBell'
import { useNotifications } from '../hooks/useNotifications'
import { useAssignments } from '../hooks/useAssignments'

function DashboardWrapper() {
  const { assignments } = useAssignments()
  useNotifications(assignments)

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex justify-end px-4 lg:px-8 py-3 border-b border-gray-800">
          <NotificationBell />
        </div>
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default function Dashboard() {
  return <DashboardWrapper />
}