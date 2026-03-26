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
            setCoords([Number(data.latitude), Number(data.longitude)]);
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
