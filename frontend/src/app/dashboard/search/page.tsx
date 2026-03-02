'use client'

import { useState } from 'react'
import { Search, Phone, Clock, MapPin, AlertTriangle } from 'lucide-react'
import { api } from '@/api/client'
import type { HospitalSearchResult, BloodRequest } from '@/types'

const AVAILABILITY_BADGE: Record<string, string> = {
  adequate: 'bg-green-100 text-green-700',
  low: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
  none: 'bg-slate-100 text-slate-500',
  unverified: 'bg-slate-100 text-slate-500',
}

const COMPONENT_OPTIONS = ['', 'RBC', 'Platelets', 'Plasma']
const ABO_OPTIONS = ['', 'A', 'B', 'AB', 'O']
const RH_OPTIONS = ['', '+', '-']
const URGENCY_OPTIONS = ['', 'Emergency', 'Urgent', 'Routine']

const defaultInquiryForm = {
  units_needed: 1,
  urgency_level: 'Routine',
  notes: '',
}

export default function SearchPage() {
  const [filters, setFilters] = useState({ component: '', abo: '', rh: '', urgency: '' })
  const [results, setResults] = useState<HospitalSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [inquiryTarget, setInquiryTarget] = useState<HospitalSearchResult | null>(null)
  const [inquiryForm, setInquiryForm] = useState(defaultInquiryForm)
  const [submitting, setSubmitting] = useState(false)
  const [inquiryError, setInquiryError] = useState('')
  const [inquirySent, setInquirySent] = useState(false)

  const handleSearch = async () => {
    if (!filters.component || !filters.abo || !filters.rh) return
    setLoading(true)
    setSearched(true)

    const params = new URLSearchParams()
    params.set('component_type', filters.component)
    params.set('abo_type', filters.abo)
    params.set('rh_type', filters.rh)
    if (filters.urgency) params.set('urgency', filters.urgency.toLowerCase())

    try {
      const { data } = await api.get<HospitalSearchResult[]>(`/api/donations/search/?${params}`)
      setResults(data || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const openInquiry = (hospital: HospitalSearchResult) => {
    setInquiryTarget(hospital)
    setInquiryForm(defaultInquiryForm)
    setInquiryError('')
    setInquirySent(false)
  }

  const handleSendInquiry = async () => {
    if (!inquiryTarget || !filters.component || !filters.abo || !filters.rh) return
    setSubmitting(true)
    setInquiryError('')

    const { error } = await api.post<BloodRequest>('/api/donations/requests/', {
      component_type: filters.component,
      abo_type: filters.abo,
      rh_type: filters.rh,
      units_needed: inquiryForm.units_needed,
      urgency_level: inquiryForm.urgency_level.toLowerCase(),
      notes: inquiryForm.notes,
    })

    if (error) {
      setInquiryError(error)
    } else {
      setInquirySent(true)
    }
    setSubmitting(false)
  }

  const SelectField = ({
    label,
    value,
    options,
    onChange,
  }: {
    label: string
    value: string
    options: string[]
    onChange: (v: string) => void
  }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
      >
        <option value="">Any</option>
        {options.filter(Boolean).map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  )

  const canSearch = filters.component && filters.abo && filters.rh

  return (
    <div className="space-y-5">
      {/* Filter panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <SelectField label="Component Type" value={filters.component} options={COMPONENT_OPTIONS}
            onChange={(v) => setFilters((f) => ({ ...f, component: v }))} />
          <SelectField label="ABO Group" value={filters.abo} options={ABO_OPTIONS}
            onChange={(v) => setFilters((f) => ({ ...f, abo: v }))} />
          <SelectField label="Rh Factor" value={filters.rh} options={RH_OPTIONS}
            onChange={(v) => setFilters((f) => ({ ...f, rh: v }))} />
          <SelectField label="Urgency Level" value={filters.urgency} options={URGENCY_OPTIONS}
            onChange={(v) => setFilters((f) => ({ ...f, urgency: v }))} />
        </div>
        {!canSearch && searched && (
          <p className="text-xs text-amber-600 mb-3">Component, ABO group, and Rh factor are required to search.</p>
        )}
        <button
          onClick={handleSearch}
          disabled={loading || !canSearch}
          className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
        >
          <Search className="w-4 h-4" />
          {loading ? 'Searching...' : 'Search Hospitals'}
        </button>
      </div>

      {/* Results */}
      {searched && (
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center">
              <p className="text-sm text-slate-400">No hospitals found matching your criteria.</p>
            </div>
          ) : (
            results.map((hospital) => {
              const invStatus = hospital.matched_inventory?.availability_status || 'none'
              const badgeClass = AVAILABILITY_BADGE[invStatus] || 'bg-slate-100 text-slate-500'
              const lastUpdated = hospital.matched_inventory?.last_updated
                ? new Date(hospital.matched_inventory.last_updated).toLocaleString(undefined, {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : null
              return (
                <div key={hospital.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-slate-800 text-sm">{hospital.name}</h3>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${badgeClass}`}>
                        {hospital.is_stale ? 'unverified' : invStatus}
                      </span>
                      {hospital.is_stale && (
                        <span className="flex items-center gap-1 text-[11px] text-amber-600">
                          <AlertTriangle className="w-3 h-3" /> Stale data
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      {hospital.distance_km !== undefined && hospital.distance_km !== null && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {hospital.distance_km.toFixed(1)} km away
                        </span>
                      )}
                      {hospital.contact_number && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {hospital.contact_number}
                        </span>
                      )}
                      {hospital.matched_inventory && (
                        <span className="font-medium text-slate-700">
                          {hospital.matched_inventory.units_available} units available
                        </span>
                      )}
                      {lastUpdated && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Updated {lastUpdated}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => openInquiry(hospital)}
                    className="flex-shrink-0 px-4 py-2 text-xs font-semibold text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-50 transition-colors"
                  >
                    Send Inquiry
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Inquiry Modal */}
      {inquiryTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            {inquirySent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-slate-900 mb-1">Inquiry Sent</h2>
                <p className="text-sm text-slate-500 mb-5">
                  Your blood request has been logged. Hospitals can now respond to it.
                </p>
                <button
                  onClick={() => setInquiryTarget(null)}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-base font-semibold text-slate-900 mb-1">Send Availability Inquiry</h2>
                <p className="text-sm text-slate-500 mb-1">
                  Submitting a formal request for{' '}
                  <span className="font-medium text-slate-700">
                    {filters.component} {filters.abo}{filters.rh}
                  </span>
                </p>
                <p className="text-xs text-slate-400 mb-5">
                  This will be logged as an open blood request visible to all participating hospitals.
                </p>

                {inquiryError && (
                  <div className="mb-4 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
                    {inquiryError}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Units Needed</label>
                      <input
                        type="number"
                        min={1}
                        value={inquiryForm.units_needed}
                        onChange={(e) => setInquiryForm((f) => ({ ...f, units_needed: parseInt(e.target.value) || 1 }))}
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Urgency</label>
                      <select
                        value={inquiryForm.urgency_level}
                        onChange={(e) => setInquiryForm((f) => ({ ...f, urgency_level: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
                      >
                        {['Routine', 'Urgent', 'Emergency'].map((o) => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Additional Notes</label>
                    <textarea
                      rows={3}
                      value={inquiryForm.notes}
                      onChange={(e) => setInquiryForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Patient condition, contact info, or special requirements..."
                      className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => setInquiryTarget(null)}
                    className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendInquiry}
                    disabled={submitting}
                    className="flex-1 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Sending...' : 'Send Inquiry'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
