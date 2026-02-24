'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    blood_type: '',
    user_type: 'donor',
    date_of_birth: '',
    address: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('access_token', data.access)
        localStorage.setItem('refresh_token', data.refresh)
        localStorage.setItem('user', JSON.stringify(data.user))
        router.push('/dashboard')
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5"

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Join our community of life savers
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className={labelClass}>First Name</label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  required
                  className={inputClass}
                  value={formData.first_name}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="last_name" className={labelClass}>Last Name</label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  required
                  className={inputClass}
                  value={formData.last_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className={labelClass}>Username</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className={inputClass}
                value={formData.username}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={inputClass}
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="phone_number" className={labelClass}>Phone Number</label>
              <input
                id="phone_number"
                name="phone_number"
                type="tel"
                className={inputClass}
                value={formData.phone_number}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="blood_type" className={labelClass}>Blood Type</label>
              <select
                id="blood_type"
                name="blood_type"
                required
                className={inputClass}
                value={formData.blood_type}
                onChange={handleChange}
              >
                <option value="">Select blood type</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div>
              <label htmlFor="user_type" className={labelClass}>Account Type</label>
              <select
                id="user_type"
                name="user_type"
                required
                className={inputClass}
                value={formData.user_type}
                onChange={handleChange}
              >
                <option value="donor">Donor</option>
                <option value="recipient">Recipient</option>
                <option value="hospital">Hospital</option>
                <option value="blood_bank">Blood Bank</option>
              </select>
            </div>

            <div>
              <label htmlFor="date_of_birth" className={labelClass}>Date of Birth</label>
              <input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                required
                className={inputClass}
                value={formData.date_of_birth}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="address" className={labelClass}>Address</label>
              <textarea
                id="address"
                name="address"
                rows={3}
                className={inputClass}
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className={labelClass}>Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className={inputClass}
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="password_confirm" className={labelClass}>Confirm Password</label>
                <input
                  id="password_confirm"
                  name="password_confirm"
                  type="password"
                  required
                  className={inputClass}
                  value={formData.password_confirm}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-300 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-semibold text-rose-600 hover:text-rose-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
