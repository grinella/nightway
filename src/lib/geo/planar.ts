import { PILOT } from "@/lib/config";

/** Geometria piana locale in metri (proiezione equirettangolare sul centro dell'area pilota):
 *  su pochi km l'errore è trascurabile e i calcoli restano semplici e testabili. */

export type XY = { x: number; y: number };
/** Ordine GeoJSON: [lon, lat]. */
export type LonLat = [number, number];

const EARTH_RADIUS_M = 6_371_008.8;
const RAD = Math.PI / 180;
const LAT0 = PILOT.center.lat * RAD;
const LON0 = PILOT.center.lon * RAD;
const COS0 = Math.cos(LAT0);

export const toXY = ([lon, lat]: LonLat): XY => ({
  x: (lon * RAD - LON0) * COS0 * EARTH_RADIUS_M,
  y: (lat * RAD - LAT0) * EARTH_RADIUS_M,
});

export const toLonLat = ({ x, y }: XY): LonLat => [
  (x / (COS0 * EARTH_RADIUS_M) + LON0) / RAD,
  (y / EARTH_RADIUS_M + LAT0) / RAD,
];

export const distance = (a: XY, b: XY) => Math.hypot(a.x - b.x, a.y - b.y);

export function polylineLength(points: XY[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i]);
  return total;
}

export function pointToSegment(p: XY, a: XY, b: XY): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return distance(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

export function pointToPolyline(p: XY, points: XY[]): number {
  let best = Infinity;
  for (let i = 1; i < points.length; i++) best = Math.min(best, pointToSegment(p, points[i - 1], points[i]));
  return best;
}

/** Direzione non orientata in gradi, 0..180. */
export function bearing(a: XY, b: XY): number {
  const deg = Math.atan2(b.y - a.y, b.x - a.x) / RAD;
  return ((deg % 180) + 180) % 180;
}

/** Differenza tra due direzioni non orientate, 0..90. */
export function angleDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 180;
  return d > 90 ? 180 - d : d;
}
