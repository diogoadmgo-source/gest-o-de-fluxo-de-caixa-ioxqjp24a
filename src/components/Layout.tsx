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
      {/* 
        Structure change:
        - Flex column container for main area
        - Header is now sticky within this container
        - Removed pt-16 from main as Header is in flow
        - Relative positioning context
      */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 md:pl-64 relative">
        <Header />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
