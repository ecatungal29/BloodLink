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
      const raw = localStorage.getItem("user");
      const user: User | null = raw ? JSON.parse(raw) : null;

      if (!user?.hospital) {
        if (!cancelled) {
          setError("Your account is not linked to a hospital.");
          setLoading(false);
        }
        return;
      }

      try {
        const { data } = await api.get<Hospital>(
          `/api/donations/hospitals/${user.hospital}/`
        );

        if (cancelled) return;

        if (data?.latitude != null && data?.longitude != null) {
          setCoords([Number(data.latitude), Number(data.longitude)]);
          setHospitalName(data.name);
        } else {
          setError("Your hospital does not have coordinates set up yet.");
        }
      } catch {
        if (!cancelled) {
          setError("Could not load your hospital location.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, []);

  return { coords, hospitalName, loading, error };
}
