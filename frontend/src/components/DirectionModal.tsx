"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { X, MapPin, ExternalLink } from "lucide-react";
import { FocusTrap } from "focus-trap-react";
import { useOriginLocation } from "@/hooks/useOriginLocation";
import type { HospitalSearchResult } from "@/types";

// Load the map lazily with SSR disabled.
// Leaflet uses window/document — it cannot run in Node.js/SSR context.
const DirectionMap = dynamic(() => import("@/components/DirectionMap"), {
	ssr: false,
});

interface DirectionModalProps {
	hospital: HospitalSearchResult;
	onClose: () => void;
}

export default function DirectionModal({
	hospital,
	onClose,
}: DirectionModalProps) {
	const {
		coords: originCoords,
		hospitalName: originName,
		loading: originLoading,
		error: originError,
	} = useOriginLocation();

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
		hospital.latitude != null && hospital.longitude != null ?
			[Number(hospital.latitude), Number(hospital.longitude)]
		:	null;

	const handleRouteFound = (distanceM: number, durationS: number) => {
		setDistanceKm(Math.round((distanceM / 1000) * 10) / 10);
		setDurationMin(Math.round(durationS / 60));
	};

	const handleRouteError = () => {
		setRouteError(true);
	};

	const googleMapsUrl =
		originCoords && destination ?
			`https://www.google.com/maps/dir/?api=1&origin=${originCoords[0]},${originCoords[1]}&destination=${destination[0]},${destination[1]}`
		: destination ?
			`https://www.google.com/maps/search/?api=1&query=${destination[0]},${destination[1]}`
		:	null;

	// Route is loading when origin + destination are ready but no result/error yet
	const routeLoading =
		!originLoading &&
		originCoords != null &&
		destination != null &&
		distanceKm === null &&
		!routeError;
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
				}}>
				<div className="bg-white rounded-2xl shadow-lg border border-slate-100 w-full max-w-4xl max-h-screen h-full aspect-[2/1] overflow-hidden">
					{/* Header */}
					<div className="bg-rose-600 px-5 py-4 flex items-start justify-between gap-3">
						<div>
							<h2
								id="direction-modal-title"
								className="text-white font-semibold text-sm">
								Directions to {hospital.name}
							</h2>
							<p className="text-rose-200 text-xs mt-0.5">
								From: {originName ?? "Resolving your location…"}
							</p>
						</div>
						<button
							onClick={onClose}
							className="flex-shrink-0 bg-white/20 hover:bg-white/30 text-white rounded-lg p-1 transition-colors"
							aria-label="Close directions">
							<X className="w-4 h-4" />
						</button>
					</div>

					{/* Map area */}
					<div className="h-[77vh] min-h-[200px] relative bg-slate-100">
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
					{/* {distanceKm != null && durationMin != null && (
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
          )} */}

					{/* Footer */}
					<div className="flex gap-3 p-4">
						<button
							onClick={onClose}
							className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
							Close
						</button>
						{googleMapsUrl && (
							<a
								href={googleMapsUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="flex-[2] flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors">
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
