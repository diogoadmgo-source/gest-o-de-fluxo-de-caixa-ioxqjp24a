import { Outlet } from 'react-router-dom'
import { Sidebar } from './layout/Sidebar'
import { Header } from './layout/Header'

export default function Layout() {
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
