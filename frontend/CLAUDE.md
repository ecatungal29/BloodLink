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

**Stack**: Next.js 15, React 18, TypeScript, Tailwind CSS

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

## Visual Development

### Design Principles

Comprehensive design checklist in `/context/design-principles.md`. When making visual (front-end, UI/UX) changes, always refer to this file for guidance.

### Quick Visual Check

IMMEDIATELY after implementing any front-end change:

1. **Identify what changed** - Review the modified components/pages
2. **Navigate to affected pages** - Use `mcp__playwright__browser_navigate` to visit each changed view
3. **Verify design compliance** - Compare against `/context/design-principles.md`
4. **Validate feature implementation** - Ensure the change fulfills the user's specific request
5. **Capture evidence** - Take a full page screenshot at desktop viewport (1440px) of each changed view
6. **Check for errors** - Run `mcp__playwright__browser_console_messages`

### Comprehensive Design Review

Use `/design-review` (slash command) for thorough design validation when:

- Completing significant UI/UX features
- Before finalizing PRs with visual changes
- Needing comprehensive accessibility and responsiveness testing

The agent tests all interactive states, responsiveness (375/768/1440px), WCAG 2.1 AA accessibility, and produces a structured report (Blockers / High-Priority / Medium-Priority / Nitpicks).

