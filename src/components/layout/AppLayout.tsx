import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils/cn'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Sidebar - Mobile (overlay) */}
      <div className="lg:hidden">
        {/* Backdrop */}
        <div
          className={cn(
            'fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity duration-300',
            sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
          onClick={() => setSidebarOpen(false)}
        />
        {/* Sidebar */}
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
