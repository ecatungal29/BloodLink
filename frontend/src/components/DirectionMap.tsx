"use client";

import { useEffect, useRef } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // React 18 StrictMode mounts → unmounts → remounts in dev.
    // Leaflet leaves _leaflet_id on the DOM node after map.remove(), so the
    // second mount throws "Map container is already initialized".
    // Clearing it before init prevents the error without affecting production.
    if ((container as any)._leaflet_id) {
      (container as any)._leaflet_id = undefined;
    }

    // Parse to numbers — Django DecimalField serializes as strings in JSON
    const lat0 = Number(origin[0]);
    const lng0 = Number(origin[1]);
    const lat1 = Number(destination[0]);
    const lng1 = Number(destination[1]);

    const map = L.map(container).setView([(lat0 + lat1) / 2, (lng0 + lng1) / 2], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const control = (L as any).Routing.control({
      waypoints: [L.latLng(lat0, lng0), L.latLng(lat1, lng1)],
      routeWhileDragging: false,
      show: false,
      addWaypoints: false,
      collapsible: false,
    }).addTo(map);

    // Hide the itinerary panel — LRM ignores show:false after routesfound,
    // so we target the container element directly via DOM.
    const hideItinerary = () => {
      const el = control.getContainer?.() as HTMLElement | undefined;
      if (el) el.style.display = "none";
    };
    hideItinerary();

    control.on("routesfound", (e: any) => {
      hideItinerary();
      const route = e.routes[0];
      onRouteFound(route.summary.totalDistance, route.summary.totalTime);
    });

    control.on("routingerror", () => {
      onRouteError();
    });

    return () => {
      map.remove();
    };
    // Coordinates are stable for the lifetime of this modal instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
