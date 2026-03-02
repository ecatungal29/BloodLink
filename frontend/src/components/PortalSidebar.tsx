'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Droplet, LayoutDashboard, Droplets, Search, ClipboardList, LogOut, User, ShieldCheck } from 'lucide-react'

interface PortalSidebarProps {
  user: { first_name?: string; last_name?: string; email?: string; role?: string } | null
  onLogout: () => void
}

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Blood Inventory', href: '/dashboard/inventory', icon: Droplets },
  { name: 'Smart Search', href: '/dashboard/search', icon: Search },
  { name: 'Blood Requests', href: '/dashboard/requests', icon: ClipboardList },
]

export default function PortalSidebar({ user, onLogout }: PortalSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'Staff User'
    : 'Staff User'

  return (
    <aside className="w-64 flex-shrink-0 h-screen flex flex-col bg-white border-r border-slate-100">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center">
          <Droplet className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-bold text-slate-900">BloodLink</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive(item.href)
                ? 'bg-red-50 text-red-600 border-r-2 border-red-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <item.icon className="w-4.5 h-4.5 flex-shrink-0" style={{ width: '18px', height: '18px' }} />
            {item.name}
          </Link>
        ))}

        {/* Admin section — stub */}
        <div className="pt-4 pb-1">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-300 mb-1">Admin</p>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 opacity-50 cursor-not-allowed select-none">
            <ShieldCheck style={{ width: '18px', height: '18px' }} className="flex-shrink-0" />
            User Management
          </div>
        </div>
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-slate-100 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50">
          <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{displayName}</p>
            {user?.role && (
              <p className="text-[10px] text-slate-400 capitalize">{user.role.replace('_', ' ')}</p>
            )}
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
        >
          <LogOut style={{ width: '18px', height: '18px' }} className="flex-shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
