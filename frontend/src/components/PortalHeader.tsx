'use client'

import { usePathname } from 'next/navigation'
import { Bell, User } from 'lucide-react'

interface PortalHeaderProps {
  user: { first_name?: string; last_name?: string; email?: string } | null
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/inventory': 'Blood Inventory',
  '/dashboard/search': 'Smart Blood Search',
  '/dashboard/requests': 'Blood Requests',
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  // fallback: capitalize last segment
  const segment = pathname.split('/').filter(Boolean).pop() || 'Dashboard'
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

export default function PortalHeader({ user }: PortalHeaderProps) {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'Staff User'
    : 'Staff User'

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-white border-b border-slate-100 flex-shrink-0">
      <h1 className="text-base font-semibold text-slate-900">{title}</h1>

      <div className="flex items-center gap-2">
        <button
          aria-label="Notifications"
          className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <Bell className="w-4.5 h-4.5 text-slate-500" style={{ width: '18px', height: '18px' }} />
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50">
          <User className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-medium text-slate-700">{displayName}</span>
        </div>
      </div>
    </header>
  )
}
