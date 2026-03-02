'use client'

import { useState } from 'react'
import { Search, Phone, Clock, MapPin } from 'lucide-react'

interface HospitalResult {
  id: number
  name: string
  distance_km?: number
  availability_status: string
  last_updated?: string
  contact_number?: string
  address?: string
}

const AVAILABILITY_BADGE: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  low: 'bg-amber-100 text-amber-700',
  unavailable: 'bg-red-100 text-red-700',
}

const COMPONENT_OPTIONS = ['', 'RBC', 'Platelets', 'Plasma', 'Whole Blood']
const ABO_OPTIONS = ['', 'A', 'B', 'AB', 'O']
const RH_OPTIONS = ['', '+', '-']
const URGENCY_OPTIONS = ['', 'Emergency', 'Urgent', 'Routine']

export default function SearchPage() {
  const [filters, setFilters] = useState({
    component: '',
    abo: '',
    rh: '',
    urgency: '',
  })
  const [results, setResults] = useState<HospitalResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [inquiryTarget, setInquiryTarget] = useState<HospitalResult | null>(null)

  const handleSearch = async () => {
    setLoading(true)
    setSearched(true)
    const token = localStorage.getItem('access_token')
    const params = new URLSearchParams()
    if (filters.component) params.set('component_type', filters.component)
    if (filters.abo) params.set('abo_group', filters.abo)
    if (filters.rh) params.set('rh_factor', filters.rh)
    if (filters.urgency) params.set('urgency', filters.urgency.toLowerCase())

    try {
      const res = await fetch(`/api/hospitals/search/?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      })
      if (res.ok) {
        const data = await res.json()
        setResults(data.results || data || [])
      } else {
        setResults([])
      }
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
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

  return (
    <div className="space-y-5">
      {/* Filter panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <SelectField
            label="Component Type"
            value={filters.component}
            options={COMPONENT_OPTIONS}
            onChange={(v) => setFilters((f) => ({ ...f, component: v }))}
          />
          <SelectField
            label="ABO Group"
            value={filters.abo}
            options={ABO_OPTIONS}
            onChange={(v) => setFilters((f) => ({ ...f, abo: v }))}
          />
          <SelectField
            label="Rh Factor"
            value={filters.rh}
            options={RH_OPTIONS}
            onChange={(v) => setFilters((f) => ({ ...f, rh: v }))}
          />
          <SelectField
            label="Urgency Level"
            value={filters.urgency}
            options={URGENCY_OPTIONS}
            onChange={(v) => setFilters((f) => ({ ...f, urgency: v }))}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
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
              const badgeClass =
                AVAILABILITY_BADGE[hospital.availability_status?.toLowerCase()] ||
                'bg-slate-100 text-slate-500'
              const lastUpdated = hospital.last_updated
                ? new Date(hospital.last_updated).toLocaleString(undefined, {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : null
              return (
                <div
                  key={hospital.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-slate-800 text-sm">{hospital.name}</h3>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${badgeClass}`}>
                        {hospital.availability_status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      {hospital.distance_km !== undefined && (
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
                      {lastUpdated && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Updated {lastUpdated}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setInquiryTarget(hospital)}
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
            <h2 className="text-base font-semibold text-slate-900 mb-1">Send Inquiry</h2>
            <p className="text-sm text-slate-500 mb-5">
              Contact <span className="font-medium text-slate-700">{inquiryTarget.name}</span> about blood availability.
            </p>
            <textarea
              rows={4}
              placeholder="Describe your blood component request, urgency, and contact information..."
              className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setInquiryTarget(null)}
                className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setInquiryTarget(null)}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
