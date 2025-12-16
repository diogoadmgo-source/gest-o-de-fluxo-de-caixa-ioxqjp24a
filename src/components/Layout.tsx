import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { Sidebar } from './layout/Sidebar'
import { Header } from './layout/Header'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'

export default function Layout() {
  const { user, loading, userProfile } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Double check profile status
  if (
    userProfile &&
    (userProfile.status === 'Blocked' || userProfile.status === 'Inactive')
  ) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-background font-sans antialiased flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 md:pl-64">
        <Header />
        <main className="flex-1 pt-16 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
