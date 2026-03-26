import { useEffect, useState } from "react";
import type { User } from "@/types";

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
    const raw = localStorage.getItem("user");
    const user: User | null = raw ? JSON.parse(raw) : null;

    if (user?.latitude != null && user?.longitude != null) {
      setCoords([Number(user.latitude), Number(user.longitude)]);
      setHospitalName(user.hospital_name);
    } else {
      setError("Your hospital does not have coordinates set up yet.");
    }

    setLoading(false);
  }, []);

  return { coords, hospitalName, loading, error };
}
