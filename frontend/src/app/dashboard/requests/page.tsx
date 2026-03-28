'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { api } from '@/api/client'
import type { BloodRequest, PaginatedResponse, RequestResponse, User } from '@/types'

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

const COMPONENT_OPTIONS = ['RBC', 'Platelets', 'Plasma']
const ABO_OPTIONS = ['A', 'B', 'AB', 'O']
const RH_OPTIONS = ['+', '-']
const URGENCY_OPTIONS = ['Routine', 'Urgent', 'Emergency']
const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Fulfilled', value: 'fulfilled' },
  { label: 'Closed', value: 'closed' },
]

const defaultForm = {
  component_type: 'RBC',
  abo_type: 'A',
  rh_type: '+',
  units_needed: 1,
  urgency_level: 'Routine',
  notes: '',
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Respond flow
  const [myHospitalId, setMyHospitalId] = useState<number | null>(null)
  const [respondedIds, setRespondedIds] = useState<Set<number>>(new Set())
  const [respondTarget, setRespondTarget] = useState<BloodRequest | null>(null)
  const [respondMessage, setRespondMessage] = useState('')
  const [respondSubmitting, setRespondSubmitting] = useState(false)
  const [respondError, setRespondError] = useState('')

  const fetchRequests = useCallback(async () => {
    setLoading(true)

    const storedUser = localStorage.getItem('user')
    const currentUser: User | null = storedUser ? JSON.parse(storedUser) : null
    setMyHospitalId(currentUser?.hospital ?? null)

    try {
      const [requestsRes, responsesRes] = await Promise.allSettled([
        api.get<PaginatedResponse<BloodRequest> | BloodRequest[]>('/api/donations/requests/'),
        api.get<PaginatedResponse<RequestResponse> | RequestResponse[]>('/api/donations/responses/'),
      ])

      if (responsesRes.status === 'fulfilled' && responsesRes.value.data) {
        const raw = responsesRes.value.data
        const responses: RequestResponse[] = Array.isArray(raw) ? raw : raw.results
        setRespondedIds(new Set(responses.map((r) => r.request)))
      }

      if (requestsRes.status === 'fulfilled' && requestsRes.value.data) {
        const raw = requestsRes.value.data
        setRequests(Array.isArray(raw) ? raw : raw.results)
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

  // Close respond modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRespondTarget(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const filtered =
    statusFilter === 'all'
      ? requests
      : requests.filter((r) => r.status?.toLowerCase() === statusFilter)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')

    const { error } = await api.post<BloodRequest>('/api/donations/requests/', {
      ...form,
      urgency_level: form.urgency_level.toLowerCase(),
    })

    if (error) {
      setFormError(error)
    } else {
      setShowModal(false)
      setForm(defaultForm)
      fetchRequests()
    }
    setSubmitting(false)
  }

  const submitResponse = async (requestId: number, status: RequestResponse['response_status']) => {
    setRespondSubmitting(true)
    setRespondError('')
    const { error } = await api.post('/api/donations/responses/', {
      request: requestId,
      response_status: status,
      ...(respondMessage.trim() ? { message: respondMessage.trim() } : {}),
    })
    if (error) {
      setRespondError(error)
    } else {
      setRespondedIds((prev) => { const next = new Set(prev); next.add(requestId); return next })
      setRespondTarget(null)
      setRespondMessage('')
    }
    setRespondSubmitting(false)
  }

  const isRespondable = (req: BloodRequest) =>
    req.status === 'open' &&
    myHospitalId !== null &&
    req.requesting_hospital !== myHospitalId &&
    !respondedIds.has(req.id)

  const isAlreadyResponded = (req: BloodRequest) =>
    req.status === 'open' &&
    myHospitalId !== null &&
    req.requesting_hospital !== myHospitalId &&
    respondedIds.has(req.id)

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
                {['Component', 'ABO', 'Rh', 'Units', 'Urgency', 'Status', 'Hospital', 'Created', 'Actions'].map(
                  (col) => (
                    <th key={col} className="text-left text-xs font-semibold text-slate-400 px-5 py-3 first:pl-5">
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
                    <td className="px-5 py-3.5 text-slate-600">{req.abo_type}</td>
                    <td className="px-5 py-3.5 text-slate-600">{req.rh_type}</td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">{req.units_needed}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${URGENCY_BADGE[urgencyKey] || 'bg-slate-100 text-slate-500'}`}>
                        {req.urgency_level}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${STATUS_BADGE[statusKey] || 'bg-slate-100 text-slate-500'}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{req.requesting_hospital_name || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{createdAt}</td>
                    <td className="px-5 py-3.5">
                      {isRespondable(req) ? (
                        <button
                          onClick={() => setRespondTarget(req)}
                          className="px-3 py-1.5 text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
                        >
                          Respond
                        </button>
                      ) : isAlreadyResponded(req) ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-400">
                          Responded
                        </span>
                      ) : null}
                    </td>
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
                <SelectField label="ABO Group" name="abo_type" value={form.abo_type} options={ABO_OPTIONS} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Rh Factor" name="rh_type" value={form.rh_type} options={RH_OPTIONS} />
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
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes <span className="text-slate-400">(optional)</span></label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional context or contact info..."
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
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

      {/* Respond Modal */}
      {respondTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900">Respond to Request</h2>
              <button
                onClick={() => { setRespondTarget(null); setRespondMessage(''); setRespondError('') }}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Request summary */}
            <div className="mb-5 px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">
                {respondTarget.component_type} {respondTarget.blood_label}
              </p>
              <p>{respondTarget.units_needed} units needed · <span className="capitalize">{respondTarget.urgency_level}</span></p>
              <p className="text-xs text-slate-500">From: {respondTarget.requesting_hospital_name}</p>
            </div>

            {respondError && (
              <div className="mb-4 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
                {respondError}
              </div>
            )}

            <div className="mb-5">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Message <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={respondMessage}
                onChange={(e) => setRespondMessage(e.target.value)}
                placeholder="Additional notes for the requesting hospital..."
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => submitResponse(respondTarget.id, 'available')}
                disabled={respondSubmitting}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50"
              >
                Available
              </button>
              <button
                onClick={() => submitResponse(respondTarget.id, 'limited')}
                disabled={respondSubmitting}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors disabled:opacity-50"
              >
                Limited
              </button>
              <button
                onClick={() => submitResponse(respondTarget.id, 'not_available')}
                disabled={respondSubmitting}
                className="flex-1 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
              >
                Not Available
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
