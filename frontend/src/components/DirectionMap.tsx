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
