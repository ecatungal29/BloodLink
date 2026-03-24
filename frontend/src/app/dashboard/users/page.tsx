'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Pencil, AlertTriangle } from 'lucide-react'
import { apiFetch } from '@/api/client'
import type { User, PaginatedResponse } from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type RoleFilter = 'all' | 'hospital_admin' | 'staff' | 'viewer'

const ROLE_TABS: { label: string; value: RoleFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Hospital Admin', value: 'hospital_admin' },
  { label: 'Staff', value: 'staff' },
  { label: 'Viewer', value: 'viewer' },
]

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  hospital_admin: 'bg-amber-100 text-amber-700',
  staff: 'bg-sky-100 text-sky-700',
  viewer: 'bg-slate-100 text-slate-500',
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  hospital_admin: 'Hospital Admin',
  staff: 'Staff',
  viewer: 'Viewer',
}

const ASSIGNABLE_ROLES = [
  { value: 'hospital_admin', label: 'Hospital Admin' },
  { value: 'staff', label: 'Staff' },
  { value: 'viewer', label: 'Viewer' },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Hospital {
  id: number
  name: string
}

type FieldErrors = Partial<Record<string, string>>

interface AddForm {
  first_name: string
  last_name: string
  email: string
  role: string
  hospital_id: string
  password: string
}

interface EditForm {
  first_name: string
  last_name: string
  role: string
  is_active: boolean
}

const DEFAULT_ADD_FORM: AddForm = {
  first_name: '',
  last_name: '',
  email: '',
  role: 'staff',
  hospital_id: '',
  password: '',
}

const DEFAULT_EDIT_FORM: EditForm = {
  first_name: '',
  last_name: '',
  role: 'staff',
  is_active: true,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseFieldErrors(json: Record<string, unknown>): FieldErrors {
  const out: FieldErrors = {}
  for (const [key, val] of Object.entries(json)) {
    if (Array.isArray(val)) {
      out[key] = val.join(' ')
    } else if (typeof val === 'string') {
      out[key] = val
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function UsersPage() {
  const router = useRouter()

  // Auth state
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null)

  // Data
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Tab
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')

  // Add modal
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<AddForm>(DEFAULT_ADD_FORM)
  const [addErrors, setAddErrors] = useState<FieldErrors>({})
  const [addSubmitting, setAddSubmitting] = useState(false)

  // Edit modal
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState<EditForm>(DEFAULT_EDIT_FORM)
  const [editErrors, setEditErrors] = useState<FieldErrors>({})
  const [editSubmitting, setEditSubmitting] = useState(false)

  // Hospitals (for super_admin add modal)
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const hospitalsLoadedRef = useRef(false)

  // ---------------------------------------------------------------------------
  // Mount: auth guard
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) {
      router.replace('/auth/login')
      return
    }
    try {
      const parsed = JSON.parse(stored) as User
      if (parsed.role === 'staff' || parsed.role === 'viewer') {
        router.replace('/dashboard')
        return
      }
      setLoggedInUser(parsed)
    } catch {
      router.replace('/auth/login')
    }
  }, [router])

  // ---------------------------------------------------------------------------
  // Fetch users
  // ---------------------------------------------------------------------------

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    const { data, error, status } = await apiFetch<PaginatedResponse<User> | User[]>(
      '/api/auth/users/'
    )
    if (status === 403) {
      setFetchError('Access denied. You do not have permission to view this page.')
    } else if (error || !data) {
      setFetchError(error ?? 'Failed to load users.')
    } else {
      setUsers(Array.isArray(data) ? data : data.results)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (loggedInUser) fetchUsers()
  }, [loggedInUser, fetchUsers])

  // ---------------------------------------------------------------------------
  // Fetch hospitals (lazy, once, for super_admin)
  // ---------------------------------------------------------------------------

  const fetchHospitals = useCallback(async () => {
    if (hospitalsLoadedRef.current) return
    hospitalsLoadedRef.current = true
    const { data } = await apiFetch<PaginatedResponse<Hospital> | Hospital[]>(
      '/api/donations/hospitals/'
    )
    if (data) {
      setHospitals(Array.isArray(data) ? data : data.results)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Client-side tab filtering
  // ---------------------------------------------------------------------------

  const filtered =
    roleFilter === 'all' ? users : users.filter((u) => u.role === roleFilter)

  // ---------------------------------------------------------------------------
  // Add modal handlers
  // ---------------------------------------------------------------------------

  const openAdd = () => {
    setAddForm(DEFAULT_ADD_FORM)
    setAddErrors({})
    setShowAdd(true)
    if (loggedInUser?.role === 'super_admin') fetchHospitals()
  }

  const closeAdd = () => setShowAdd(false)

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddSubmitting(true)
    setAddErrors({})

    const body: Record<string, unknown> = {
      first_name: addForm.first_name,
      last_name: addForm.last_name,
      email: addForm.email,
      role: addForm.role,
      password: addForm.password,
    }

    if (loggedInUser?.role === 'super_admin' && addForm.hospital_id) {
      body.hospital = parseInt(addForm.hospital_id, 10)
    }

    const res = await fetch('/api/auth/users/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
      },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const newUser = (await res.json()) as User
      setUsers((prev) => [newUser, ...prev])
      closeAdd()
    } else {
      try {
        const json = (await res.json()) as Record<string, unknown>
        setAddErrors(parseFieldErrors(json))
      } catch {
        setAddErrors({ non_field_errors: 'Something went wrong. Please try again.' })
      }
    }

    setAddSubmitting(false)
  }

  // ---------------------------------------------------------------------------
  // Edit modal handlers
  // ---------------------------------------------------------------------------

  const openEdit = (user: User) => {
    setEditUser(user)
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_active: user.is_active,
    })
    setEditErrors({})
  }

  const closeEdit = () => setEditUser(null)

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    setEditSubmitting(true)
    setEditErrors({})

    const res = await fetch(`/api/auth/users/${editUser.id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
      },
      body: JSON.stringify({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        role: editForm.role,
        is_active: editForm.is_active,
      }),
    })

    if (res.ok) {
      const updated = (await res.json()) as User
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      closeEdit()
    } else {
      try {
        const json = (await res.json()) as Record<string, unknown>
        setEditErrors(parseFieldErrors(json))
      } catch {
        setEditErrors({ non_field_errors: 'Something went wrong. Please try again.' })
      }
    }

    setEditSubmitting(false)
  }

  // ---------------------------------------------------------------------------
  // Keyboard: close modals on Escape
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAdd) closeAdd()
        if (editUser) closeEdit()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showAdd, editUser])

  // ---------------------------------------------------------------------------
  // Render guards
  // ---------------------------------------------------------------------------

  if (!loggedInUser) return null

  const isSuperAdmin = loggedInUser.role === 'super_admin'

  const hospitalSubtitle = loggedInUser.hospital_name
    ? `${loggedInUser.hospital_name} · ${users.length} member${users.length !== 1 ? 's' : ''}`
    : `${users.length} member${users.length !== 1 ? 's' : ''}`

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">User Management</h1>
          <p className="text-xs text-slate-400 mt-0.5">{hospitalSubtitle}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Role tabs */}
      <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-100 shadow-sm p-1 w-fit">
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setRoleFilter(tab.value)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              roleFilter === tab.value
                ? 'bg-rose-600 text-white'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-lg" />
            ))}
          </div>
        ) : fetchError ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
            <AlertTriangle className="w-8 h-8 text-rose-400" />
            <p className="text-sm text-slate-600">{fetchError}</p>
            {fetchError !== 'Access denied. You do not have permission to view this page.' && (
              <button
                onClick={fetchUsers}
                className="mt-1 text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            No{roleFilter !== 'all' ? ` ${ROLE_LABELS[roleFilter]}` : ''} users found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                {['Name', 'Email', 'Role', 'Status', 'Actions'].map((col) => (
                  <th
                    key={col}
                    className="text-left text-xs font-semibold text-slate-400 px-5 py-3 first:pl-5"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const isYou = user.id === loggedInUser.id
                return (
                  <tr
                    key={user.id}
                    className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors ${
                      !user.is_active ? 'opacity-60' : ''
                    }`}
                  >
                    {/* Name */}
                    <td className="px-5 py-3.5 font-medium text-slate-700">
                      {user.first_name} {user.last_name}
                      {isYou && (
                        <span className="ml-1.5 text-xs font-normal text-slate-400">(you)</span>
                      )}
                    </td>

                    {/* Email */}
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{user.email}</td>

                    {/* Role badge */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          ROLE_BADGE[user.role] ?? 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-3.5">
                      {user.is_active ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => openEdit(user)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Add User modal                                                       */}
      {/* ------------------------------------------------------------------ */}
      {showAdd && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeAdd}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900">Add User</h2>
              <button
                onClick={closeAdd}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Top-level / non-field error */}
            {addErrors.non_field_errors && (
              <div className="mb-4 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
                {addErrors.non_field_errors}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {/* First / Last name row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.first_name}
                    onChange={(e) => setAddForm((f) => ({ ...f, first_name: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                  {addErrors.first_name && (
                    <p className="mt-1 text-xs text-rose-600">{addErrors.first_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.last_name}
                    onChange={(e) => setAddForm((f) => ({ ...f, last_name: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                  {addErrors.last_name && (
                    <p className="mt-1 text-xs text-rose-600">{addErrors.last_name}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
                {addErrors.email && (
                  <p className="mt-1 text-xs text-rose-600">{addErrors.email}</p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Role</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {addErrors.role && (
                  <p className="mt-1 text-xs text-rose-600">{addErrors.role}</p>
                )}
              </div>

              {/* Hospital — super_admin only */}
              {isSuperAdmin && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Hospital
                  </label>
                  <select
                    value={addForm.hospital_id}
                    onChange={(e) => setAddForm((f) => ({ ...f, hospital_id: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
                  >
                    <option value="">Select a hospital…</option>
                    {hospitals.map((h) => (
                      <option key={h.id} value={String(h.id)}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                  {addErrors.hospital && (
                    <p className="mt-1 text-xs text-rose-600">{addErrors.hospital}</p>
                  )}
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={addForm.password}
                  onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
                {addErrors.password && (
                  <p className="mt-1 text-xs text-rose-600">{addErrors.password}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAdd}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {addSubmitting ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Edit User modal                                                      */}
      {/* ------------------------------------------------------------------ */}
      {editUser && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeEdit}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900">Edit User</h2>
              <button
                onClick={closeEdit}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Top-level / non-field error */}
            {editErrors.non_field_errors && (
              <div className="mb-4 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
                {editErrors.non_field_errors}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* First / Last name row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.first_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                  {editErrors.first_name && (
                    <p className="mt-1 text-xs text-rose-600">{editErrors.first_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.last_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                  {editErrors.last_name && (
                    <p className="mt-1 text-xs text-rose-600">{editErrors.last_name}</p>
                  )}
                </div>
              </div>

              {/* Email — read-only, not editable after creation */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
                <p className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-500">
                  {editUser?.email}
                </p>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {editErrors.role && (
                  <p className="mt-1 text-xs text-rose-600">{editErrors.role}</p>
                )}
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between py-1">
                <span className="text-xs font-medium text-slate-600">Active</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={editForm.is_active}
                  onClick={() => setEditForm((f) => ({ ...f, is_active: !f.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-offset-2 ${
                    editForm.is_active ? 'bg-rose-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      editForm.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
