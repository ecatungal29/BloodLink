# Show Direction Map Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Show Direction" button to each hospital card in the blood search results that opens a modal with an interactive Leaflet map showing the road route from the user's hospital to the selected hospital.

**Architecture:** A `DirectionModal` shell component owns the origin-resolution logic (via `useOriginLocation` hook) and renders a dynamically-imported `DirectionMap` (SSR-disabled) that uses `react-leaflet` + `leaflet-routing-machine` with the free OSRM routing API. The search page (`search/page.tsx`) manages which hospital is selected and renders the modal.

**Tech Stack:** Next.js 15, React 18, TypeScript, Tailwind CSS, `react-leaflet` v4, `leaflet-routing-machine`, OSRM (public demo, free), `focus-trap-react`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/app/layout.tsx` | Modify | Add `leaflet/dist/leaflet.css` global import |
| `src/types/leaflet-routing-machine.d.ts` | Create | TypeScript shim for untyped LRM package |
| `src/hooks/useOriginLocation.ts` | Create | Resolve origin coords: hospital API fetch → GPS fallback |
| `src/components/DirectionMap.tsx` | Create | Leaflet map + routing machine, SSR-unsafe, never import directly |
| `src/components/DirectionModal.tsx` | Create | Modal shell: header, dynamic DirectionMap, trip info, footer |
| `src/app/dashboard/search/page.tsx` | Modify | Add "Show Direction" button + `selectedHospital` state + render modal |

---

## Task 1: Install packages and add Leaflet CSS

**Files:**
- Modify: `src/app/layout.tsx` (line 3 — after `globals.css` import)
- Create: `src/types/leaflet-routing-machine.d.ts`

- [ ] **Step 1: Install npm packages**

Run from `frontend/` directory:

```bash
cd "d:/My Personal Projects/BloodLink/frontend"
npm install leaflet react-leaflet leaflet-routing-machine focus-trap-react
npm install --save-dev @types/leaflet
```

Expected: packages added to `package.json`, no errors. npm may warn about `focus-trap` peer dependency — this is expected and handled automatically on npm 7+.

- [ ] **Step 2: Add Leaflet CSS import to `src/app/layout.tsx`**

Current file contents (lines 1–4):
```ts
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
```

Add the Leaflet CSS import after `globals.css`:
```ts
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import ClientLayout from "@/components/ClientLayout";
```

Why it must go here (not in `DirectionMap.tsx`): Leaflet's CSS controls map tile positioning and marker placement. If loaded inside a dynamically-imported component, CSS injection order is not guaranteed and the map renders broken.

- [ ] **Step 3: Create TypeScript shim for leaflet-routing-machine**

Create `src/types/leaflet-routing-machine.d.ts`:

```ts
declare module 'leaflet-routing-machine';
```

This file tells TypeScript to accept any import from `'leaflet-routing-machine'` without type errors. Do not use `@ts-ignore` on the import instead — that suppresses all type errors in the consuming file.

- [ ] **Step 4: Verify the dev server starts without errors**

```bash
npm run dev
```

Open http://localhost:3000. Expected: no build errors in terminal. The app should look identical to before — this task only adds packages and CSS.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/types/leaflet-routing-machine.d.ts package.json package-lock.json
git commit -m "chore(deps): install leaflet, react-leaflet, leaflet-routing-machine, focus-trap-react"
```

---

## Task 2: Create `useOriginLocation` hook

**Files:**
- Create: `src/hooks/useOriginLocation.ts`

This hook resolves the "starting location" for directions. It tries the logged-in user's hospital coordinates first (fetched from the API), then falls back to the browser's GPS.

- [ ] **Step 1: Create `src/hooks/useOriginLocation.ts`**

```ts
import { useEffect, useState } from "react";
import { api } from "@/api/client";
import type { User, Hospital } from "@/types";

interface OriginLocation {
  coords: [number, number] | null;
  hospitalName: string | null;
  loading: boolean;
  error: string | null;
}

export function useOriginLocation(): OriginLocation {
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [hospitalName, setHospitalName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      // Step 1: Try the user's stored hospital record
      try {
        const raw = localStorage.getItem("user");
        const user: User | null = raw ? JSON.parse(raw) : null;

        if (user?.hospital) {
          const { data } = await api.get<Hospital>(
            `/api/donations/hospitals/${user.hospital}/`
          );
          if (!cancelled && data?.latitude != null && data?.longitude != null) {
            setCoords([data.latitude, data.longitude]);
            setHospitalName(data.name);
            setLoading(false);
            return;
          }
        }
      } catch {
        // fall through to GPS
      }

      if (cancelled) return;

      // Step 2: Fall back to browser GPS
      if (!navigator.geolocation) {
        setError("Could not determine your location.");
        setLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!cancelled) {
            setCoords([position.coords.latitude, position.coords.longitude]);
            setHospitalName("Your Location");
            setLoading(false);
          }
        },
        () => {
          if (!cancelled) {
            setError("Could not determine your location.");
            setLoading(false);
          }
        }
      );
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, []);

  return { coords, hospitalName, loading, error };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no TypeScript errors for this file. (Full build may fail if other tasks are incomplete — that is fine at this stage. Only look for errors in `src/hooks/useOriginLocation.ts`.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useOriginLocation.ts
git commit -m "feat(search): add useOriginLocation hook with API + GPS fallback"
```

---

## Task 3: Create `DirectionMap` component

**Files:**
- Create: `src/components/DirectionMap.tsx`

This is the Leaflet map with routing. It is **never imported directly** — always loaded via `dynamic(..., { ssr: false })` because Leaflet uses browser globals (`window`, `document`) that do not exist in Node.js (Next.js SSR).

- [ ] **Step 1: Create `src/components/DirectionMap.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-routing-machine"; // side-effect: registers L.Routing on the Leaflet namespace

// Fix Leaflet's broken default marker icons in webpack/Next.js builds.
// Webpack cannot resolve the marker PNGs via Leaflet's internal require() calls.
// Override with absolute CDN URLs before any map renders.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface RoutingLayerProps {
  origin: [number, number];
  destination: [number, number];
  onRouteFound: (distanceM: number, durationS: number) => void;
  onRouteError: () => void;
}

// Inner component: uses useMap() to access the Leaflet map instance.
// Must be rendered as a child of <MapContainer>.
function RoutingLayer({
  origin,
  destination,
  onRouteFound,
  onRouteError,
}: RoutingLayerProps) {
  const map = useMap();

  useEffect(() => {
    // L.Routing is added to L by the side-effect import above.
    // Cast to any because the declare module shim types it as unknown.
    const control = (L as any).Routing.control({
      waypoints: [L.latLng(origin[0], origin[1]), L.latLng(destination[0], destination[1])],
      routeWhileDragging: false,
      show: false,        // hide the text turn-by-turn panel
      addWaypoints: false, // prevent drag-to-add-waypoint
    }).addTo(map);

    control.on("routesfound", (e: any) => {
      const route = e.routes[0];
      onRouteFound(route.summary.totalDistance, route.summary.totalTime);
    });

    control.on("routingerror", () => {
      onRouteError();
    });

    return () => {
      map.removeControl(control);
    };
    // Deps are primitives/stable callbacks — safe to run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

interface DirectionMapProps {
  origin: [number, number];
  destination: [number, number];
  onRouteFound: (distanceM: number, durationS: number) => void;
  onRouteError: () => void;
}

export default function DirectionMap({
  origin,
  destination,
  onRouteFound,
  onRouteError,
}: DirectionMapProps) {
  // Center the map between origin and destination
  const centerLat = (origin[0] + destination[0]) / 2;
  const centerLng = (origin[1] + destination[1]) / 2;

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={13}
      className="h-full w-full"
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RoutingLayer
        origin={origin}
        destination={destination}
        onRouteFound={onRouteFound}
        onRouteError={onRouteError}
      />
    </MapContainer>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: No errors in `src/components/DirectionMap.tsx`. The `Routing` import line and `e: any` usage are intentional given the lack of LRM types.

- [ ] **Step 3: Commit**

```bash
git add src/components/DirectionMap.tsx
git commit -m "feat(search): add DirectionMap component with Leaflet + OSRM routing"
```

---

## Task 4: Create `DirectionModal` component

**Files:**
- Create: `src/components/DirectionModal.tsx`

The modal shell. It owns the `useOriginLocation` call, manages route state (loading, distance, duration, error), and renders everything: header, dynamic map, trip info bar, and footer buttons.

- [ ] **Step 1: Create `src/components/DirectionModal.tsx`**

```tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { X, MapPin, ExternalLink } from "lucide-react";
import { FocusTrap } from "focus-trap-react";
import { useOriginLocation } from "@/hooks/useOriginLocation";
import type { HospitalSearchResult } from "@/types";

// Load the map lazily with SSR disabled.
// Leaflet uses window/document — it cannot run in Node.js/SSR context.
const DirectionMap = dynamic(
  () => import("@/components/DirectionMap"),
  { ssr: false }
);

interface DirectionModalProps {
  hospital: HospitalSearchResult;
  onClose: () => void;
}

export default function DirectionModal({
  hospital,
  onClose,
}: DirectionModalProps) {
  const { coords: originCoords, hospitalName: originName, loading: originLoading, error: originError } =
    useOriginLocation();

  const [routeLoading, setRouteLoading] = useState(true);
  const [routeError, setRouteError] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const destination: [number, number] | null =
    hospital.latitude != null && hospital.longitude != null
      ? [hospital.latitude, hospital.longitude]
      : null;

  const handleRouteFound = (distanceM: number, durationS: number) => {
    setDistanceKm(Math.round((distanceM / 1000) * 10) / 10);
    setDurationMin(Math.round(durationS / 60));
    setRouteLoading(false);
  };

  const handleRouteError = () => {
    setRouteError(true);
    setRouteLoading(false);
  };

  const googleMapsUrl =
    originCoords && destination
      ? `https://www.google.com/maps/dir/?api=1&origin=${originCoords[0]},${originCoords[1]}&destination=${destination[0]},${destination[1]}`
      : destination
        ? `https://www.google.com/maps/search/?api=1&query=${destination[0]},${destination[1]}`
        : null;

  const isLoading = originLoading || (originCoords != null && destination != null && routeLoading);
  const hasError = originError || routeError || !destination;

  return (
    <FocusTrap>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="direction-modal-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 w-full max-w-lg overflow-hidden">
          {/* Header */}
          <div className="bg-rose-600 px-5 py-4 flex items-start justify-between gap-3">
            <div>
              <h2
                id="direction-modal-title"
                className="text-white font-semibold text-sm"
              >
                Directions to {hospital.name}
              </h2>
              <p className="text-rose-200 text-xs mt-0.5">
                From: {originName ?? "Resolving your location…"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 bg-white/20 hover:bg-white/30 text-white rounded-lg p-1 transition-colors"
              aria-label="Close directions"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Map area */}
          <div className="h-[40vh] min-h-[200px] relative bg-slate-100">
            {originLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 bg-slate-100">
                <div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-500">Getting your location…</p>
              </div>
            )}

            {!originLoading && hasError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 bg-slate-50 p-6 text-center">
                <MapPin className="w-8 h-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-700">
                  {originError ?? "Route could not be calculated."}
                </p>
                <p className="text-xs text-slate-400">
                  Use the button below to open Google Maps instead.
                </p>
              </div>
            )}

            {!originLoading && !hasError && originCoords && destination && (
              <>
                {routeLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 bg-slate-100/80">
                    <div className="w-6 h-6 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-slate-500">Calculating route…</p>
                  </div>
                )}
                <DirectionMap
                  origin={originCoords}
                  destination={destination}
                  onRouteFound={handleRouteFound}
                  onRouteError={handleRouteError}
                />
              </>
            )}
          </div>

          {/* Trip info bar */}
          {distanceKm != null && durationMin != null && (
            <div className="bg-slate-50 border-y border-slate-100 px-5 py-3 flex justify-around">
              <div className="text-center">
                <p className="text-base font-bold text-slate-900">
                  {distanceKm} km
                </p>
                <p className="text-[11px] text-slate-500">Road distance</p>
              </div>
              <div className="w-px bg-slate-200" />
              <div className="text-center">
                <p className="text-base font-bold text-slate-900">
                  ~{durationMin} min
                </p>
                <p className="text-[11px] text-slate-500">Est. drive time</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3 p-4">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-[2] flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in Google Maps
              </a>
            )}
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no TypeScript errors in `src/components/DirectionModal.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/DirectionModal.tsx
git commit -m "feat(search): add DirectionModal with origin resolution and map"
```

---

## Task 5: Wire into the search page

**Files:**
- Modify: `src/app/dashboard/search/page.tsx`

Add `selectedHospital` state, a "Show Direction" button on each card (hidden when no coordinates), and render `<DirectionModal>` when a hospital is selected.

- [ ] **Step 1: Add `selectedHospital` state and import to `search/page.tsx`**

At the top of the file, add the new import alongside the existing ones:

```ts
// Add this import after the existing imports:
import DirectionModal from "@/components/DirectionModal";
```

Inside `SearchPage()`, add the new state alongside the existing `inquiryTarget` state:

```ts
// Add after line 42 (after the inquirySent state):
const [selectedHospital, setSelectedHospital] =
  useState<HospitalSearchResult | null>(null);
```

- [ ] **Step 2: Add "Show Direction" button to each hospital card**

Find the existing "Send Inquiry" button in the results `.map()` (currently around line 247–251):

```tsx
<button
  onClick={() => openInquiry(hospital)}
  className="flex-shrink-0 px-4 py-2 text-xs font-semibold text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-50 transition-colors">
  Send Inquiry
</button>
```

Replace with a button group — "Send Inquiry" unchanged, "Show Direction" added conditionally:

```tsx
<div className="flex-shrink-0 flex flex-col gap-2">
  <button
    onClick={() => openInquiry(hospital)}
    className="px-4 py-2 text-xs font-semibold text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-50 transition-colors">
    Send Inquiry
  </button>
  {hospital.latitude != null && hospital.longitude != null && (
    <button
      onClick={() => setSelectedHospital(hospital)}
      className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center justify-center gap-1.5">
      <MapPin className="w-3 h-3" />
      Show Direction
    </button>
  )}
</div>
```

Note: `MapPin` is already imported on line 4 of `search/page.tsx` — confirm this before running. If it is missing, add it to the existing lucide-react import: `import { Search, Phone, Clock, MapPin, AlertTriangle } from "lucide-react";`

- [ ] **Step 3: Render `<DirectionModal>` in the JSX**

Find the closing `{/* Inquiry Modal */}` block (around line 259). After the closing `}` of the inquiry modal block (just before the final `</div>` that closes the outer return), add:

```tsx
{/* Direction Modal */}
{selectedHospital && (
  <DirectionModal
    hospital={selectedHospital}
    onClose={() => setSelectedHospital(null)}
  />
)}
```

- [ ] **Step 4: Verify the full build passes**

```bash
npm run build
```

Expected: clean build with no TypeScript errors.

- [ ] **Step 5: Manual smoke test**

```bash
npm run dev
```

1. Navigate to http://localhost:3000/dashboard/search
2. Perform a blood search (requires Django backend running at port 8000)
3. Confirm "Show Direction" button appears on hospital cards that have coordinates
4. Confirm button is absent on cards without coordinates
5. Click "Show Direction" — modal opens with spinner while origin resolves
6. If your test hospital record has `latitude`/`longitude`, the map should render and draw the route
7. Trip info bar shows distance in km and estimated drive time
8. Click "Open in Google Maps" — new tab opens with `maps.google.com/dir/` URL
9. Click Close or backdrop — modal closes, search list is unchanged

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/search/page.tsx
git commit -m "feat(search): add Show Direction button and DirectionModal integration"
```

---

## Task 6: Final verification and cleanup

- [ ] **Step 1: Full build check**

```bash
npm run build && npm run lint
```

Expected: no errors, no lint warnings introduced by this feature.

- [ ] **Step 2: Verify `.gitignore` excludes brainstorm artifacts**

Check that `.superpowers/` is in `.gitignore`. If not, add it:

```bash
echo ".superpowers/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore .superpowers brainstorm directory"
```

- [ ] **Step 3: Final commit if anything remains unstaged**

```bash
git status
# Stage specific files listed by git status — do not use git add -p (interactive, hangs in non-TTY)
git add <file1> <file2>
git commit -m "chore(search): cleanup after Show Direction feature"
```
