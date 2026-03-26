# Show Direction Map Modal

**Date:** 2026-03-25
**Status:** Approved

## Context

The Smart Blood Search page (`/dashboard/search`) lists hospitals that have matching blood inventory. Staff need to physically travel to retrieve blood — but currently there is no way to get directions from inside the portal. They must manually open a maps app and type in the destination.

Adding a "Show Direction" button to each hospital result card solves this by opening an interactive map modal with a real road route drawn from the user's hospital to the destination, without leaving the portal.

## Decisions

| Question | Decision |
|---|---|
| Modal placement | Full-screen overlay modal |
| Map library | react-leaflet + OpenStreetMap (free, no API key) |
| Routing | Leaflet Routing Machine via OSRM (free routing API, public demo server — MVP-only, see note below) |
| Origin location | Fetch user's hospital record from API to get lat/lng; fall back to browser GPS if no coordinates stored |
| Route style | Actual road route with distance + ETA from OSRM |

## Architecture

### New files

**`src/components/DirectionModal.tsx`**
Modal shell component. Accepts `hospital: HospitalSearchResult` and `onClose: () => void` props. Internally calls `useOriginLocation` to resolve the starting coordinates. Renders the header (hospital name, origin label), the `DirectionMap` (dynamically imported, SSR disabled), the trip info bar (distance, ETA), and the footer (Close + Open in Google Maps buttons). Uses `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the header title. Implements focus lock via `focus-trap-react` (install alongside map packages). Returns focus to the trigger button on close. Stacking context: `z-50`.

**`src/components/DirectionMap.tsx`**
Leaflet map component. **Never imported directly** — always loaded via:

```ts
const DirectionMap = dynamic(() => import('../components/DirectionMap'), { ssr: false });
```

Accepts `origin: [lat, lng]`, `destination: [lat, lng]`, and `onRouteFound: (distanceM: number, durationS: number) => void`.

Uses `react-leaflet`'s `MapContainer`, `TileLayer`. Uses `leaflet-routing-machine` with the OSRM backend to draw the road route. Emits distance and duration via `onRouteFound`.

**Leaflet default marker fix (required):** Leaflet's default icon PNGs break in webpack/Next.js builds because webpack cannot resolve the `require()` paths Leaflet uses internally. At the top of `DirectionMap.tsx`, override the icon before mounting:

```ts
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
```

**`src/hooks/useOriginLocation.ts`**
Custom hook. On mount, reads `user` from `localStorage` to get `user.hospital` (the hospital ID). Fetches `GET /api/donations/hospitals/{id}/` to retrieve the full `Hospital` object and extract `latitude`/`longitude`. If coordinates are present, returns them. If the fetch fails or coordinates are null, calls `navigator.geolocation.getCurrentPosition` and returns those coords. Returns `{ coords: [number, number] | null, loading: boolean, error: string | null }`.

**`src/types/leaflet-routing-machine.d.ts`**
TypeScript shim for the untyped `leaflet-routing-machine` package:

```ts
declare module 'leaflet-routing-machine';
```

Do **not** use `@ts-ignore` on the import — that suppresses all type errors in the consuming file.

### Modified files

**`src/app/layout.tsx`**
Add the Leaflet CSS global import — this must be in the root layout, not inside `DirectionMap.tsx`, to guarantee correct CSS injection order:

```ts
import 'leaflet/dist/leaflet.css';
```

**`src/app/dashboard/search/page.tsx`**
- Add `selectedHospital: HospitalSearchResult | null` state (default `null`).
- Add `directionButtonRef: React.RefObject<HTMLButtonElement>` per card (for returning focus on modal close).
- Add "Show Direction" button alongside "Send Inquiry" on each hospital card. Button is **hidden** (`display: none` or conditional render) when `hospital.latitude == null || hospital.longitude == null`.
- Render `<DirectionModal>` when `selectedHospital !== null`.

## Component interfaces

```typescript
// DirectionModal props
interface DirectionModalProps {
  hospital: HospitalSearchResult;
  onClose: () => void;
}

// DirectionMap props
interface DirectionMapProps {
  origin: [number, number];
  destination: [number, number];
  onRouteFound: (distanceM: number, durationS: number) => void;
}

// useOriginLocation return
interface OriginLocation {
  coords: [number, number] | null;
  loading: boolean;
  error: string | null;
}
```

## Data flow

1. User clicks "Show Direction" on a hospital card → `setSelectedHospital(hospital)`
2. `DirectionModal` opens; `useOriginLocation` fetches the user's hospital record via API
3. If origin resolved: `DirectionMap` mounts, calls OSRM via Leaflet Routing Machine
4. OSRM returns route → `onRouteFound` fires with distance (metres) and duration (seconds)
5. Modal converts: `(distanceM / 1000).toFixed(1) km` and `Math.round(durationS / 60) min`
6. "Open in Google Maps" builds: `https://www.google.com/maps/dir/?api=1&origin={lat},{lng}&destination={lat},{lng}`

## Loading and error states

| State | Behaviour |
|---|---|
| Fetching hospital record | Spinner with "Getting your location…" inside map area |
| Hospital has no coordinates + GPS resolving | Spinner with "Getting your location…" |
| GPS permission denied + no stored coords | Error: "Could not determine your location." "Open in Google Maps" shows destination only |
| Route loading | Spinner inside map area while OSRM fetches |
| OSRM route not found | Error: "Route could not be calculated." "Open in Google Maps" fallback shown |
| `hospital.latitude == null` | "Show Direction" button not rendered for that card |
| User with `hospital: null` (non-hospital role) | `useOriginLocation` skips the API fetch, goes directly to GPS fallback |

## Packages to install

```
npm install leaflet react-leaflet leaflet-routing-machine focus-trap-react
npm install --save-dev @types/leaflet
```

## Design

- Modal: `rounded-2xl shadow-lg border border-slate-100 z-50`
- Backdrop: `fixed inset-0 bg-black/50 z-50` (click backdrop → close)
- Header: `bg-red-600` with white text (destination hospital name + "From: [your hospital name]")
- Map container: `h-[40vh] min-h-[200px]` (responsive, no overflow on mobile)
- Trip info bar: `bg-slate-50 border-y border-slate-100` with bold distance and ETA
- "Show Direction" button: `bg-red-600 text-white rounded-xl` alongside `bg-slate-100` "Send Inquiry"
- "Open in Google Maps": opens in new tab (`target="_blank" rel="noopener noreferrer"`)

## OSRM note

`router.project-osrm.org` is the OSRM public demo server. It is free and requires no API key, but is rate-limited and not recommended for production. This is acceptable for MVP. Before launch, evaluate self-hosting OSRM or switching to a paid routing API (GraphHopper, Mapbox Directions).

## Verification

1. Run `npm run dev` and log in as a hospital staff user
2. Navigate to `/dashboard/search`, perform a blood search
3. Confirm "Show Direction" button appears only on hospital cards that have coordinates
4. Click "Show Direction" → modal opens with a spinner while origin resolves
5. Confirm map renders with route drawn from origin to destination
6. Confirm trip info bar shows distance in km and time in minutes
7. Click "Open in Google Maps" → new tab opens with correct `maps.google.com/dir/` URL containing both lat/lng pairs
8. Test GPS fallback: log in as a user whose hospital has no stored lat/lng — confirm browser GPS prompt appears; if approved, map draws from GPS coords
9. Test error state: use a user with no hospital coords and deny GPS permission — confirm error message is shown and "Open in Google Maps" still works
10. Click Close button or backdrop → modal dismisses, focus returns to the "Show Direction" button
11. Confirm `z-index` does not conflict with the existing "Send Inquiry" modal if both are triggered in sequence
