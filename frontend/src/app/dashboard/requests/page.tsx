'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X } from 'lucide-react'

interface BloodRequest {
  id: number
  component_type: string
  abo_group: string
  rh_factor: string
  units_needed: number
  urgency_level: string
  status: string
  requesting_hospital?: string
  created_at?: string
}

type StatusFilter = 'all' | 'open' | 'fulfilled' | 'closed'

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  fulfilled: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-500',
}

const URGENCY_BADGE: Record<string, string> = {
  emergency: 'bg-red-100 text-red-700',
  urgent: 'bg-amber-100 text-amber-700',
  routine: 'bg-slate-100 text-slate-500',
}

const COMPONENT_OPTIONS = ['RBC', 'Platelets', 'Plasma', 'Whole Blood']
const ABO_OPTIONS = ['A', 'B', 'AB', 'O']
const RH_OPTIONS = ['+', '-']
const URGENCY_OPTIONS = ['Emergency', 'Urgent', 'Routine']
const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Fulfilled', value: 'fulfilled' },
  { label: 'Closed', value: 'closed' },
]

const defaultForm = {
  component_type: 'RBC',
  abo_group: 'A',
  rh_factor: '+',
  units_needed: 1,
  urgency_level: 'Routine',
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    const token = localStorage.getItem('access_token')
    try {
      const res = await fetch('/api/requests/', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setRequests(data.results || data || [])
      }
    } catch (err) {
      console.error('Requests fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const filtered =
    statusFilter === 'all'
      ? requests
      : requests.filter((r) => r.status?.toLowerCase() === statusFilter)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    const token = localStorage.getItem('access_token')
    try {
      const res = await fetch('/api/requests/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          urgency_level: form.urgency_level.toLowerCase(),
        }),
      })
      if (res.ok) {
        setShowModal(false)
        setForm(defaultForm)
        fetchRequests()
      } else {
        const data = await res.json()
        setFormError(data.detail || data.error || 'Failed to create request')
      }
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const SelectField = ({
    label,
    name,
    value,
    options,
  }: {
    label: string
    name: keyof typeof form
    value: string
    options: string[]
  }) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-100 shadow-sm p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === tab.value
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            No {statusFilter !== 'all' ? statusFilter + ' ' : ''}requests found
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                {['Component', 'ABO', 'Rh', 'Units', 'Urgency', 'Status', 'Hospital', 'Created'].map(
                  (col) => (
                    <th
                      key={col}
                      className="text-left text-xs font-semibold text-slate-400 px-5 py-3 first:pl-5"
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((req) => {
                const urgencyKey = req.urgency_level?.toLowerCase()
                const statusKey = req.status?.toLowerCase()
                const createdAt = req.created_at
                  ? new Date(req.created_at).toLocaleDateString(undefined, { dateStyle: 'short' })
                  : '—'
                return (
                  <tr key={req.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-medium text-slate-700">{req.component_type}</td>
                    <td className="px-5 py-3.5 text-slate-600">{req.abo_group}</td>
                    <td className="px-5 py-3.5 text-slate-600">{req.rh_factor}</td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">{req.units_needed}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${URGENCY_BADGE[urgencyKey] || 'bg-slate-100 text-slate-500'}`}
                      >
                        {req.urgency_level}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${STATUS_BADGE[statusKey] || 'bg-slate-100 text-slate-500'}`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{req.requesting_hospital || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{createdAt}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* New Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900">New Blood Request</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Component Type" name="component_type" value={form.component_type} options={COMPONENT_OPTIONS} />
                <SelectField label="ABO Group" name="abo_group" value={form.abo_group} options={ABO_OPTIONS} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Rh Factor" name="rh_factor" value={form.rh_factor} options={RH_OPTIONS} />
                <SelectField label="Urgency Level" name="urgency_level" value={form.urgency_level} options={URGENCY_OPTIONS} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Units Needed</label>
                <input
                  type="number"
                  min={1}
                  value={form.units_needed}
                  onChange={(e) => setForm((f) => ({ ...f, units_needed: parseInt(e.target.value) || 1 }))}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
