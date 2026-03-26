export interface BloodRequest {
  id: number
  requesting_hospital: number
  requesting_hospital_name: string
  component_type: string
  abo_type: string
  rh_type: string
  blood_label: string
  units_needed: number
  urgency_level: 'routine' | 'urgent' | 'emergency'
  status: 'open' | 'fulfilled' | 'closed'
  notes?: string
  created_by?: number
  created_by_name?: string
  response_count: number
  created_at: string
  updated_at: string
}

export interface InventoryItem {
  id: number
  hospital: number
  hospital_name: string
  component_type: string
  abo_type: string
  rh_type: string
  blood_label: string
  units_available: number
  availability_status: 'adequate' | 'low' | 'critical' | 'none'
  last_updated: string
  created_at: string
}

export interface HospitalSearchResult {
  id: number
  name: string
  address: string
  city: string
  contact_number: string
  latitude?: number
  longitude?: number
  last_inventory_update?: string
  distance_km?: number
  matched_inventory?: InventoryItem
  is_stale: boolean
}

export interface RequestResponse {
  id: number
  request: number
  responding_hospital: number
  responding_hospital_name: string
  response_status: 'available' | 'limited' | 'not_available'
  message?: string
  responded_by?: number
  responded_by_name?: string
  timestamp: string
}

export interface Hospital {
  id: number
  name: string
  address: string
  city: string
  contact_number: string
  blood_bank_license_number: string
  latitude?: number
  longitude?: number
  last_inventory_update?: string
  is_active: boolean
  inventory_count: number
  is_stale: boolean
}

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  phone_number: string
  role: 'super_admin' | 'hospital_admin' | 'staff' | 'viewer'
  hospital: number | null
  hospital_name: string | null
  latitude: string | null
  longitude: string | null
  is_active: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
}

export type PaginatedResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
