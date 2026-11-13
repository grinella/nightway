import type { LonLat } from "@/lib/geo/planar";

export type LatLon = { lat: number; lon: number };

export type PedestrianRoute = {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: LonLat[];
};

export type RoutingErrorCode = "rate_limited" | "timeout" | "no_route" | "provider_error";

export class RoutingError extends Error {
  constructor(
    public code: RoutingErrorCode,
    message: string,
  ) {
    super(message);
  }
}
