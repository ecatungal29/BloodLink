'use client'

import { useState, useEffect } from 'react'
import { ClipboardList, AlertTriangle, Building2, Clock } from 'lucide-react'
import { api } from '@/api/client'
import type { BloodRequest, InventoryItem, PaginatedResponse, Hospital, RequestResponse, User } from '@/types'

interface Stats {
  open_requests: number
  critical_items: number
  hospitals_active: number
  pending_responses: number
}

const URGENCY_BADGE: Record<string, string> = {
  emergency: 'bg-red-100 text-red-700',
  urgent: 'bg-amber-100 text-amber-700',
  routine: 'bg-slate-100 text-slate-600',
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
  const [incomingRequests, setIncomingRequests] = useState<BloodRequest[]>([])
  const [respondingId, setRespondingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    const storedUser = localStorage.getItem('user')
    const currentUser: User | null = storedUser ? JSON.parse(storedUser) : null
    const myHospitalId = currentUser?.hospital ?? null

    try {
      const [requestsRes, inventoryRes, hospitalsRes, responsesRes] = await Promise.allSettled([
        api.get<PaginatedResponse<BloodRequest> | BloodRequest[]>('/api/donations/requests/'),
        api.get<PaginatedResponse<InventoryItem> | InventoryItem[]>('/api/donations/inventory/'),
        api.get<PaginatedResponse<Hospital> | Hospital[]>('/api/donations/hospitals/'),
        api.get<PaginatedResponse<RequestResponse> | RequestResponse[]>('/api/donations/responses/'),
      ])

      let respondedRequestIds = new Set<number>()
      if (responsesRes.status === 'fulfilled' && responsesRes.value.data) {
        const raw = responsesRes.value.data
        const responses: RequestResponse[] = Array.isArray(raw) ? raw : raw.results
        respondedRequestIds = new Set(responses.map((r) => r.request))
      }

      if (requestsRes.status === 'fulfilled' && requestsRes.value.data) {
        const raw = requestsRes.value.data
        const requests: BloodRequest[] = Array.isArray(raw) ? raw : raw.results
        setRecentRequests(requests.slice(0, 5))
        const open = requests.filter((r) => r.status === 'open').length

        const incoming = requests.filter(
          (r) =>
            r.status === 'open' &&
            myHospitalId !== null &&
            r.requesting_hospital !== myHospitalId &&
            !respondedRequestIds.has(r.id)
        )
        setIncomingRequests(incoming)
        setStats((prev) => ({ ...prev, open_requests: open, pending_responses: incoming.length }))
      }

      if (inventoryRes.status === 'fulfilled' && inventoryRes.value.data) {
        const raw = inventoryRes.value.data
        const items: InventoryItem[] = Array.isArray(raw) ? raw : raw.results
        const alerts = items.filter((i) =>
          ['critical', 'none'].includes(i.availability_status?.toLowerCase())
        )
        setInventoryAlerts(alerts.slice(0, 5))
        setStats((prev) => ({ ...prev, critical_items: alerts.length }))
      }

      if (hospitalsRes.status === 'fulfilled' && hospitalsRes.value.data) {
        const raw = hospitalsRes.value.data
        const hospitals: Hospital[] = Array.isArray(raw) ? raw : raw.results
        setStats((prev) => ({ ...prev, hospitals_active: hospitals.length }))
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const respond = async (requestId: number, responseStatus: RequestResponse['response_status']) => {
    setRespondingId(requestId)
    const { error } = await api.post('/api/donations/responses/', {
      request: requestId,
      response_status: responseStatus,
    })
    if (!error) {
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId))
      setStats((prev) => ({ ...prev, pending_responses: Math.max(0, prev.pending_responses - 1) }))
    }
    setRespondingId(null)
  }

  const statCards = [
    { label: 'Open Requests', value: stats.open_requests, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Critical Inventory Items', value: stats.critical_items, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Hospitals Active', value: stats.hospitals_active, icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending Responses', value: stats.pending_responses, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
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
          <div key={card.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className={`inline-flex p-2.5 rounded-xl ${card.bg} mb-3`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Needs Your Response */}
      {incomingRequests.length > 0 && (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-rose-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <h2 className="text-sm font-semibold text-slate-800">Needs Your Response</h2>
            <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-bold">
              {incomingRequests.length}
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {incomingRequests.slice(0, 5).map((req) => {
              const isResponding = respondingId === req.id
              return (
                <div key={req.id} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-slate-800">
                        {req.component_type} {req.blood_label} &middot; {req.units_needed}u
                      </span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${URGENCY_BADGE[req.urgency_level?.toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>
                        {req.urgency_level}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      From: {req.requesting_hospital_name} &middot;{' '}
                      {new Date(req.created_at).toLocaleDateString(undefined, { dateStyle: 'short' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      disabled={isResponding}
                      onClick={() => respond(req.id, 'available')}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Available
                    </button>
                    <button
                      disabled={isResponding}
                      onClick={() => respond(req.id, 'limited')}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Limited
                    </button>
                    <button
                      disabled={isResponding}
                      onClick={() => respond(req.id, 'not_available')}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      None
                    </button>
                  </div>
                </div>
              )
            })}
            {incomingRequests.length > 5 && (
              <div className="px-5 py-3 text-xs text-slate-400 text-center">
                + {incomingRequests.length - 5} more incoming requests
              </div>
            )}
          </div>
        </div>
      )}

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
                      {req.component_type} {req.blood_label}
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
                  <th className="text-left text-xs font-medium text-slate-400 px-3 py-3">Blood Type</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-3 py-3">Units</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {inventoryAlerts.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-700">{item.component_type}</td>
                    <td className="px-3 py-3 text-slate-600">{item.blood_label}</td>
                    <td className="px-3 py-3 text-slate-600">{item.units_available}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${INVENTORY_BADGE[item.availability_status?.toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>
                        {item.availability_status}
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
