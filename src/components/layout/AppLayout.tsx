import { useState } from 'react'
import { Outlet } from 'react-router-dom'
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
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar */}
          <div className="lg:hidden">
            <Sidebar />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
