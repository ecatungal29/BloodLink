'use client'

import { useState, useEffect } from 'react'
import { ClipboardList, AlertTriangle, Building2, Clock } from 'lucide-react'

interface BloodRequest {
  id: number
  component_type?: string
  blood_type?: string
  abo_group?: string
  rh_factor?: string
  units_needed: number
  urgency_level: string
  status: string
  requesting_hospital?: string
  hospital_name?: string
  created_at?: string
}

interface InventoryItem {
  id: number
  component_type: string
  abo_group: string
  rh_factor: string
  units_available: number
  status: string
  last_updated?: string
}

interface Stats {
  open_requests: number
  critical_items: number
  hospitals_active: number
  pending_responses: number
}

const URGENCY_BADGE: Record<string, string> = {
  emergency: 'bg-red-100 text-red-700',
  critical: 'bg-red-100 text-red-700',
  urgent: 'bg-amber-100 text-amber-700',
  high: 'bg-amber-100 text-amber-700',
  routine: 'bg-slate-100 text-slate-600',
  medium: 'bg-slate-100 text-slate-600',
  low: 'bg-slate-100 text-slate-600',
}

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  fulfilled: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-600',
}

const INVENTORY_BADGE: Record<string, string> = {
  adequate: 'bg-green-100 text-green-700',
  low: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
  none: 'bg-slate-900 text-white',
  unverified: 'bg-slate-100 text-slate-600',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    open_requests: 0,
    critical_items: 0,
    hospitals_active: 0,
    pending_responses: 0,
  })
  const [recentRequests, setRecentRequests] = useState<BloodRequest[]>([])
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('access_token')
    const headers = { Authorization: `Bearer ${token}` }

    try {
      const [requestsRes, inventoryRes] = await Promise.allSettled([
        fetch('/api/requests/', { headers }),
        fetch('/api/inventory/', { headers }),
      ])

      if (requestsRes.status === 'fulfilled' && requestsRes.value.ok) {
        const data = await requestsRes.value.json()
        const requests: BloodRequest[] = data.results || data || []
        setRecentRequests(requests.slice(0, 5))
        setStats((prev) => ({
          ...prev,
          open_requests: requests.filter((r) => r.status === 'open').length,
          pending_responses: requests.filter((r) => r.status === 'open').length,
        }))
      }

      if (inventoryRes.status === 'fulfilled' && inventoryRes.value.ok) {
        const data = await inventoryRes.value.json()
        const items: InventoryItem[] = data.results || data || []
        const alerts = items.filter((i) =>
          ['critical', 'none'].includes(i.status?.toLowerCase())
        )
        setInventoryAlerts(alerts.slice(0, 5))
        setStats((prev) => ({
          ...prev,
          critical_items: alerts.length,
        }))
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      label: 'Open Requests',
      value: stats.open_requests,
      icon: ClipboardList,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Critical Inventory Items',
      value: stats.critical_items,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Hospitals Active',
      value: stats.hospitals_active,
      icon: Building2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Pending Responses',
      value: stats.pending_responses,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-slate-100" />
          ))}
        </div>
        <div className="h-64 bg-white rounded-2xl border border-slate-100" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm"
          >
            <div className={`inline-flex p-2.5 rounded-xl ${card.bg} mb-3`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Blood Requests */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Recent Blood Requests</h2>
            <a href="/dashboard/requests" className="text-xs text-rose-600 hover:text-rose-700 font-medium">
              View all
            </a>
          </div>
          {recentRequests.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">No requests found</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Component</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-3 py-3">Units</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-3 py-3">Urgency</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((req) => (
                  <tr key={req.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-700">
                      {req.component_type || req.blood_type || '—'}
                      {req.abo_group && ` ${req.abo_group}${req.rh_factor || ''}`}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{req.units_needed}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${URGENCY_BADGE[req.urgency_level?.toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>
                        {req.urgency_level}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${STATUS_BADGE[req.status?.toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Inventory Alerts */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Inventory Alerts</h2>
            <a href="/dashboard/inventory" className="text-xs text-rose-600 hover:text-rose-700 font-medium">
              View all
            </a>
          </div>
          {inventoryAlerts.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">No critical alerts</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Component</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-3 py-3">ABO/Rh</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-3 py-3">Units</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {inventoryAlerts.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-700">{item.component_type}</td>
                    <td className="px-3 py-3 text-slate-600">{item.abo_group}{item.rh_factor}</td>
                    <td className="px-3 py-3 text-slate-600">{item.units_available}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${INVENTORY_BADGE[item.status?.toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
