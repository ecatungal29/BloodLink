# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint via next lint
```

No test runner is configured yet.

## Environment

Create a `.env.local` file to configure the backend URL:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

The default is `http://localhost:8000` (Django backend). All `/api/*` requests from the frontend are rewritten to this URL via `next.config.js` rewrites.

## Architecture

**Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS

**App Router structure** (`src/app/`):
- `/` — Public landing page (server component)
- `/auth/login` and `/auth/register` — Client components (`'use client'`)
- `/dashboard` — Protected client component; redirects to `/auth/login` if no tokens in `localStorage`

**Components** (`src/components/`): `HeroSection`, `FeatureCards`, `Navigation`, `DashboardCards` — currently marked with `"use cache"` (Next.js 16 experimental Cache Components).

**Path alias**: `@/` maps to `./src/`.

**Auth flow**: JWT tokens (`access_token`, `refresh_token`) and `user` JSON are stored in `localStorage`. The dashboard page checks for these on mount and redirects if absent. Logout clears all three keys.

**API calls**: Made directly with native `fetch` inside components/pages — no dedicated API client layer. Auth header pattern: `Authorization: Bearer ${token}`.

**Backend data shapes** (inferred from API responses):
- Blood requests: `{ id, blood_type, units_needed, hospital_name, urgency_level }` — urgency values: `critical | high | medium | low`
- Donations: `{ id, units_donated, location, status }` — status values: `completed | scheduled | pending`
- Paginated responses use `.results` array

**User types** (registration): `donor`, `recipient`, `hospital`, `blood_bank`

**Blood types**: `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`

## Styling

Tailwind CSS with a custom `primary` color scale defined in `tailwind.config.js` (red shades, matching Tailwind's built-in `red-*`). Current code uses `red-*` classes directly rather than `primary-*`. The brand color is red (`red-600` for primary actions, `red-500` for hover targets).

## Known Issues

- `Navigation.tsx` is marked `"use cache"` but uses `useRouter` and accepts an `onLogout` event handler — this conflicts with the cache/server component model and will cause runtime errors.
- `axios` and `lucide-react` are installed but unused; all HTTP requests use native `fetch`.
- `cacheComponents: true` is experimental in Next.js 16; the `"use cache"` directive behavior may change.
