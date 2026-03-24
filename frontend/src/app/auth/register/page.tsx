'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useGoogleLogin } from '@react-oauth/google'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ChevronDown } from 'lucide-react'

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
}

interface HospitalOption {
  id: number
  name: string
}

export default function Register() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    password_confirm: '',
    role: 'staff',
    hospital: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [hospitals, setHospitals] = useState<HospitalOption[]>([])
  const [hospitalsLoading, setHospitalsLoading] = useState(true)
  const [hospitalsError, setHospitalsError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/donations/hospitals/')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        const list: HospitalOption[] = Array.isArray(data) ? data : (data.results ?? [])
        setHospitals(list)
      })
      .catch(() => setHospitalsError('Could not load hospitals. Please refresh.'))
      .finally(() => setHospitalsLoading(false))
  }, [])

  const handleGoogleRegister = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch('/api/auth/google/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: tokenResponse.access_token }),
        })
        const data = await response.json()
        if (response.ok) {
          localStorage.setItem('access_token', data.access)
          localStorage.setItem('refresh_token', data.refresh)
          localStorage.setItem('user', JSON.stringify(data.user))
          router.push('/dashboard')
        } else {
          setError(data.error || 'Google sign-up failed')
        }
      } catch {
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    onError: () => setError('Google sign-up failed. Please try again.'),
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-shadow'
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5'

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <motion.div
        className="w-full max-w-md"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div className="text-center mb-8" variants={itemVariants}>
          <h1 className="text-3xl font-bold text-slate-900">Request system access</h1>
          <p className="mt-2 text-sm text-slate-500">
            For authorized hospital staff and administrators only
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8"
          variants={itemVariants}
        >
          {/* Google Button */}
          <button
            type="button"
            onClick={() => handleGoogleRegister()}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50 transition-colors"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-sm text-slate-400 font-medium">or</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {/* Required field legend */}
            <p className="text-xs text-slate-400">
              Fields marked <span className="text-rose-500 font-semibold">*</span> are required
            </p>

            {/* First Name + Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className={labelClass}>
                  First Name <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  required
                  aria-required="true"
                  autoComplete="given-name"
                  placeholder="John"
                  className={inputClass}
                  value={formData.first_name}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="last_name" className={labelClass}>
                  Last Name <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  required
                  aria-required="true"
                  autoComplete="family-name"
                  placeholder="Doe"
                  className={inputClass}
                  value={formData.last_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className={labelClass}>
                Email Address <span className="text-rose-500" aria-hidden="true">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                aria-required="true"
                autoComplete="email"
                placeholder="john@hospital.org"
                className={inputClass}
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone_number" className={labelClass}>
                Phone Number{' '}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="phone_number"
                name="phone_number"
                type="tel"
                autoComplete="tel"
                placeholder="+63 9XX XXX XXXX"
                className={inputClass}
                value={formData.phone_number}
                onChange={handleChange}
              />
              <p className="mt-1 text-xs text-slate-400">Format: +63 9XX XXX XXXX</p>
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className={labelClass}>
                Role <span className="text-rose-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <select
                  id="role"
                  name="role"
                  required
                  aria-required="true"
                  className={`${inputClass} appearance-none pr-10`}
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="staff">Staff</option>
                  <option value="viewer">Viewer</option>
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Hospital */}
            <div>
              <label htmlFor="hospital" className={labelClass}>
                Hospital <span className="text-rose-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <select
                  id="hospital"
                  name="hospital"
                  required
                  aria-required="true"
                  disabled={hospitalsLoading || !!hospitalsError}
                  aria-describedby={hospitalsError ? 'hospital-error' : undefined}
                  className={`${inputClass} appearance-none pr-10 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed`}
                  value={formData.hospital}
                  onChange={handleChange}
                >
                  <option value="">
                    {hospitalsLoading ? 'Loading hospitals...' : 'Select your hospital'}
                  </option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
              </div>
              {hospitalsError && (
                <p id="hospital-error" className="mt-1 text-xs text-rose-600">
                  {hospitalsError}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className={labelClass}>
                Password <span className="text-rose-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  aria-required="true"
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  className={`${inputClass} pr-11`}
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="password_confirm" className={labelClass}>
                Confirm Password <span className="text-rose-500" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <input
                  id="password_confirm"
                  name="password_confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  aria-required="true"
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  className={`${inputClass} pr-11`}
                  value={formData.password_confirm}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none focus:text-slate-600 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error — above submit so it's adjacent to the action, announced by screen readers */}
            {error && (
              <div
                role="alert"
                className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 transition-colors mt-2"
            >
              {loading && <Spinner />}
              {loading ? 'Submitting...' : 'Request Access'}
            </button>
          </form>
        </motion.div>

        <motion.p
          className="mt-6 text-center text-sm text-slate-500"
          variants={itemVariants}
        >
          Already have an account?{' '}
          <Link href="/auth/login" className="font-semibold text-rose-600 hover:text-rose-500 transition-colors">
            Sign in
          </Link>
        </motion.p>
      </motion.div>
    </div>
  )
}
