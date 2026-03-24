// src/app/auth/register/page.test.tsx
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Register from './page'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('next/link', () =>
  function MockLink({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href}>{children}</a>
  }
)

const mockGoogleLogin = jest.fn()
jest.mock('@react-oauth/google', () => ({
  useGoogleLogin: (opts: { onSuccess: (t: { access_token: string }) => void; onError: () => void }) => {
    mockGoogleLogin.mockImplementation(() => opts.onSuccess({ access_token: 'google-token' }))
    return mockGoogleLogin
  },
}))

// Framer Motion — render children directly, no animation
jest.mock('framer-motion', () => {
  const actual = jest.requireActual('framer-motion')
  return {
    ...actual,
    motion: new Proxy(
      {},
      {
        get: (_: unknown, tag: string) =>
          // eslint-disable-next-line react/display-name
          ({ children, ...rest }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) =>
            React.createElement(tag, rest, children),
      }
    ),
  }
})

const HOSPITALS = [
  { id: 1, name: 'City General Hospital' },
  { id: 2, name: 'St. Luke\'s Medical Center' },
]

function mockFetch(overrides: Record<string, { ok: boolean; body: unknown }> = {}) {
  const defaults: Record<string, { ok: boolean; body: unknown }> = {
    '/api/donations/hospitals/': { ok: true, body: HOSPITALS },
    '/api/auth/register/': { ok: true, body: { access: 'acc', refresh: 'ref', user: { id: 1 } } },
    '/api/auth/google/': { ok: true, body: { access: 'acc', refresh: 'ref', user: { id: 1 } } },
    ...overrides,
  }

  global.fetch = jest.fn((url: string) => {
    const cfg = defaults[url] ?? { ok: false, body: { error: 'Not found' } }
    return Promise.resolve({
      ok: cfg.ok,
      json: () => Promise.resolve(cfg.body),
    } as Response)
  }) as jest.Mock
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fillForm(overrides: Partial<Record<string, string>> = {}) {
  const user = userEvent.setup()
  const fields: Record<string, string> = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@hospital.org',
    phone_number: '+639001234567',
    password: 'SecurePass1!',
    password_confirm: 'SecurePass1!',
    ...overrides,
  }

  await user.type(screen.getByLabelText(/first name/i), fields.first_name)
  await user.type(screen.getByLabelText(/last name/i), fields.last_name)
  await user.type(screen.getByLabelText(/email address/i), fields.email)
  await user.type(screen.getByLabelText(/phone number/i), fields.phone_number)
  await user.type(screen.getByLabelText(/^password$/i), fields.password)
  await user.type(screen.getByLabelText(/confirm password/i), fields.password_confirm)

  return { user, fields }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
  mockFetch()
})

describe('Register page', () => {
  // ── Rendering ──────────────────────────────────────────────────────────────

  describe('initial render', () => {
    it('renders the page heading', async () => {
      render(<Register />)
      expect(screen.getByRole('heading', { name: /request system access/i })).toBeInTheDocument()
    })

    it('renders all form fields', async () => {
      render(<Register />)
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^role$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    })

    it('renders the Google sign-up button', () => {
      render(<Register />)
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
    })

    it('renders the submit button', () => {
      render(<Register />)
      expect(screen.getByRole('button', { name: /request access/i })).toBeInTheDocument()
    })

    it('renders a link to the login page', () => {
      render(<Register />)
      expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/auth/login')
    })

    it('role select defaults to "staff"', () => {
      render(<Register />)
      expect(screen.getByRole('combobox', { name: /^role$/i })).toHaveValue('staff')
    })
  })

  // ── Hospitals loading ──────────────────────────────────────────────────────

  describe('hospital dropdown', () => {
    it('shows "Loading hospitals…" while fetching', () => {
      render(<Register />)
      expect(screen.getByRole('option', { name: /loading hospitals/i })).toBeInTheDocument()
    })

    it('populates hospitals after fetch resolves', async () => {
      render(<Register />)
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /city general hospital/i })).toBeInTheDocument()
      })
      expect(screen.getByRole('option', { name: /st\. luke/i })).toBeInTheDocument()
    })

    it('handles paginated response with results key', async () => {
      mockFetch({ '/api/donations/hospitals/': { ok: true, body: { results: HOSPITALS } } })
      render(<Register />)
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /city general hospital/i })).toBeInTheDocument()
      })
    })

    it('shows an error message when hospitals fetch fails', async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error')) as jest.Mock
      render(<Register />)
      await waitFor(() => {
        expect(screen.getByText(/could not load hospitals/i)).toBeInTheDocument()
      })
    })

    it('hides the hospital select when hospitals fetch fails', async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error')) as jest.Mock
      render(<Register />)
      await waitFor(() => {
        expect(screen.queryByRole('combobox', { name: /hospital/i })).not.toBeInTheDocument()
      })
    })
  })

  // ── Happy path ─────────────────────────────────────────────────────────────

  describe('successful registration', () => {
    it('stores tokens and redirects to /dashboard on success', async () => {
      render(<Register />)
      await waitFor(() => screen.getByRole('option', { name: /city general hospital/i }))

      const { user } = await fillForm()
      await user.selectOptions(screen.getByRole('combobox', { name: /hospital/i }), '1')
      await user.click(screen.getByRole('button', { name: /request access/i }))

      await waitFor(() => {
        expect(localStorage.getItem('access_token')).toBe('acc')
        expect(localStorage.getItem('refresh_token')).toBe('ref')
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('sends the correct payload to the register endpoint', async () => {
      render(<Register />)
      await waitFor(() => screen.getByRole('option', { name: /city general hospital/i }))

      const { user } = await fillForm()
      await user.selectOptions(screen.getByRole('combobox', { name: /hospital/i }), '1')
      await user.click(screen.getByRole('button', { name: /request access/i }))

      await waitFor(() => expect(mockPush).toHaveBeenCalled())

      const call = (global.fetch as jest.Mock).mock.calls.find(
        ([url]: [string]) => url === '/api/auth/register/'
      )
      expect(call).toBeDefined()
      const body = JSON.parse(call[1].body)
      expect(body).toMatchObject({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@hospital.org',
        role: 'staff',
        hospital: '1',
      })
    })
  })

  // ── Validation ─────────────────────────────────────────────────────────────

  describe('client-side validation', () => {
    it('shows an error when passwords do not match', async () => {
      render(<Register />)
      await waitFor(() => screen.getByRole('option', { name: /city general hospital/i }))

      const { user } = await fillForm({ password_confirm: 'different' })
      await user.selectOptions(screen.getByRole('combobox', { name: /hospital/i }), '1')
      await user.click(screen.getByRole('button', { name: /request access/i }))

      expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
    })

    it('does not call the API when passwords do not match', async () => {
      render(<Register />)
      await waitFor(() => screen.getByRole('option', { name: /city general hospital/i }))

      const { user } = await fillForm({ password_confirm: 'different' })
      await user.selectOptions(screen.getByRole('combobox', { name: /hospital/i }), '1')
      await user.click(screen.getByRole('button', { name: /request access/i }))

      const registerCalls = (global.fetch as jest.Mock).mock.calls.filter(
        ([url]: [string]) => url === '/api/auth/register/'
      )
      expect(registerCalls).toHaveLength(0)
    })
  })

  // ── Error handling ─────────────────────────────────────────────────────────

  describe('API error handling', () => {
    it('displays the server error message on failed registration', async () => {
      mockFetch({ '/api/auth/register/': { ok: false, body: { error: 'Email already registered' } } })
      render(<Register />)
      await waitFor(() => screen.getByRole('option', { name: /city general hospital/i }))

      const { user } = await fillForm()
      await user.selectOptions(screen.getByRole('combobox', { name: /hospital/i }), '1')
      await user.click(screen.getByRole('button', { name: /request access/i }))

      expect(await screen.findByText(/email already registered/i)).toBeInTheDocument()
    })

    it('shows a generic error when server returns no error field', async () => {
      mockFetch({ '/api/auth/register/': { ok: false, body: {} } })
      render(<Register />)
      await waitFor(() => screen.getByRole('option', { name: /city general hospital/i }))

      const { user } = await fillForm()
      await user.selectOptions(screen.getByRole('combobox', { name: /hospital/i }), '1')
      await user.click(screen.getByRole('button', { name: /request access/i }))

      expect(await screen.findByText(/registration failed/i)).toBeInTheDocument()
    })

    it('shows a network error message when fetch throws', async () => {
      mockFetch({ '/api/donations/hospitals/': { ok: true, body: HOSPITALS } })
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(HOSPITALS) }) // hospitals
        .mockRejectedValueOnce(new Error('Network Error'))                            // register

      render(<Register />)
      await waitFor(() => screen.getByRole('option', { name: /city general hospital/i }))

      const { user } = await fillForm()
      await user.selectOptions(screen.getByRole('combobox', { name: /hospital/i }), '1')
      await user.click(screen.getByRole('button', { name: /request access/i }))

      expect(await screen.findByText(/network error/i)).toBeInTheDocument()
    })
  })

  // ── Loading state ──────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('shows "Submitting…" and disables the submit button while loading', async () => {
      let resolveRegister!: (v: unknown) => void
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(HOSPITALS) })
        .mockReturnValueOnce(new Promise(res => { resolveRegister = res }))

      render(<Register />)
      await waitFor(() => screen.getByRole('option', { name: /city general hospital/i }))

      const { user } = await fillForm()
      await user.selectOptions(screen.getByRole('combobox', { name: /hospital/i }), '1')
      await user.click(screen.getByRole('button', { name: /request access/i }))

      expect(await screen.findByRole('button', { name: /submitting/i })).toBeDisabled()

      // Clean up the pending promise
      resolveRegister({ ok: true, json: () => Promise.resolve({ access: 'a', refresh: 'r', user: {} }) })
    })

    it('disables the Google button while loading', async () => {
      let resolveRegister!: (v: unknown) => void
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(HOSPITALS) })
        .mockReturnValueOnce(new Promise(res => { resolveRegister = res }))

      render(<Register />)
      await waitFor(() => screen.getByRole('option', { name: /city general hospital/i }))

      const { user } = await fillForm()
      await user.selectOptions(screen.getByRole('combobox', { name: /hospital/i }), '1')
      await user.click(screen.getByRole('button', { name: /request access/i }))

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /continue with google/i })).toBeDisabled()
      )

      resolveRegister({ ok: true, json: () => Promise.resolve({ access: 'a', refresh: 'r', user: {} }) })
    })
  })

  // ── Google OAuth ───────────────────────────────────────────────────────────

  describe('Google OAuth', () => {
    it('calls handleGoogleRegister when the Google button is clicked', async () => {
      render(<Register />)
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: /continue with google/i }))
      expect(mockGoogleLogin).toHaveBeenCalled()
    })

    it('stores tokens and redirects to /dashboard after successful Google sign-up', async () => {
      render(<Register />)
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: /continue with google/i }))

      await waitFor(() => {
        expect(localStorage.getItem('access_token')).toBe('acc')
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('shows an error when Google sign-up API returns an error', async () => {
      mockFetch({ '/api/auth/google/': { ok: false, body: { error: 'Google account not linked' } } })
      render(<Register />)
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: /continue with google/i }))

      expect(await screen.findByText(/google account not linked/i)).toBeInTheDocument()
    })
  })

  // ── Accessibility ──────────────────────────────────────────────────────────

  describe('accessibility', () => {
    it('all inputs are associated with labels via htmlFor', () => {
      render(<Register />)
      const ids = ['first_name', 'last_name', 'email', 'phone_number', 'role', 'password', 'password_confirm']
      ids.forEach(id => {
        expect(document.getElementById(id)).toBeInTheDocument()
        expect(document.querySelector(`label[for="${id}"]`)).toBeInTheDocument()
      })
    })

    it('password fields have type="password"', () => {
      render(<Register />)
      expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('type', 'password')
      expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('type', 'password')
    })

    it('email field has type="email"', () => {
      render(<Register />)
      expect(screen.getByLabelText(/email address/i)).toHaveAttribute('type', 'email')
    })

    it('phone field has type="tel"', () => {
      render(<Register />)
      expect(screen.getByLabelText(/phone number/i)).toHaveAttribute('type', 'tel')
    })
  })

  // ── Role select ────────────────────────────────────────────────────────────

  describe('role dropdown', () => {
    it('contains all three role options', () => {
      render(<Register />)
      const select = screen.getByRole('combobox', { name: /^role$/i })
      expect(select).toContainElement(screen.getByRole('option', { name: /hospital admin/i }))
      expect(select).toContainElement(screen.getByRole('option', { name: /^staff$/i }))
      expect(select).toContainElement(screen.getByRole('option', { name: /viewer/i }))
    })

    it('updates role value when changed', async () => {
      render(<Register />)
      const user = userEvent.setup()
      const select = screen.getByRole('combobox', { name: /^role$/i })
      await user.selectOptions(select, 'hospital_admin')
      expect(select).toHaveValue('hospital_admin')
    })
  })
})
