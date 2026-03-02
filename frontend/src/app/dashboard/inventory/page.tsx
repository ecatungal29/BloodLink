'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'

interface InventoryItem {
  id: number
  component_type: string
  abo_group: string
  rh_factor: string
  units_available: number
  status: string
  last_updated: string
}

const STALENESS_HOURS = 24

const STATUS_BADGE: Record<string, string> = {
  adequate: 'bg-green-100 text-green-700',
  low: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
  none: 'bg-slate-900 text-white',
  unverified: 'bg-slate-100 text-slate-500',
}

function getEffectiveStatus(item: InventoryItem): string {
  if (item.last_updated) {
    const updatedAt = new Date(item.last_updated)
    const hoursSince = (Date.now() - updatedAt.getTime()) / 36e5
    if (hoursSince > STALENESS_HOURS) return 'unverified'
  }
  return item.status?.toLowerCase() || 'unverified'
}

const COMPONENT_OPTIONS = ['All', 'RBC', 'Platelets', 'Plasma', 'Whole Blood']
const ABO_OPTIONS = ['All', 'A', 'B', 'AB', 'O']
const RH_OPTIONS = ['All', '+', '-']

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ component: 'All', abo: 'All', rh: 'All' })

  const fetchInventory = useCallback(async () => {
    setLoading(true)
    const token = localStorage.getItem('access_token')
    const params = new URLSearchParams()
    if (filters.component !== 'All') params.set('component_type', filters.component)
    if (filters.abo !== 'All') params.set('abo_group', filters.abo)
    if (filters.rh !== 'All') params.set('rh_factor', filters.rh)

    try {
      const res = await fetch(`/api/inventory/?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setItems(data.results || data || [])
      }
    } catch (err) {
      console.error('Inventory fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  const FilterSelect = ({
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
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-slate-500 whitespace-nowrap">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex flex-wrap items-center gap-4">
        <FilterSelect
          label="Component"
          value={filters.component}
          options={COMPONENT_OPTIONS}
          onChange={(v) => setFilters((f) => ({ ...f, component: v }))}
        />
        <FilterSelect
          label="ABO Group"
          value={filters.abo}
          options={ABO_OPTIONS}
          onChange={(v) => setFilters((f) => ({ ...f, abo: v }))}
        />
        <FilterSelect
          label="Rh Factor"
          value={filters.rh}
          options={RH_OPTIONS}
          onChange={(v) => setFilters((f) => ({ ...f, rh: v }))}
        />
        <button
          onClick={fetchInventory}
          className="ml-auto flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            No inventory records found
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                {['Component', 'ABO', 'Rh', 'Units', 'Status', 'Last Updated', 'Actions'].map(
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
              {items.map((item) => {
                const effectiveStatus = getEffectiveStatus(item)
                const lastUpdated = item.last_updated
                  ? new Date(item.last_updated).toLocaleString(undefined, {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })
                  : '—'
                return (
                  <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-medium text-slate-700">{item.component_type}</td>
                    <td className="px-5 py-3.5 text-slate-600">{item.abo_group}</td>
                    <td className="px-5 py-3.5 text-slate-600">{item.rh_factor}</td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">{item.units_available}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${STATUS_BADGE[effectiveStatus] || 'bg-slate-100 text-slate-600'}`}
                      >
                        {effectiveStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{lastUpdated}</td>
                    <td className="px-5 py-3.5">
                      <button className="text-xs font-medium text-rose-600 hover:text-rose-700 transition-colors">
                        Update Stock
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
