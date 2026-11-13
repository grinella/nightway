import { bearing, distance, toLonLat, toXY, type LonLat, type XY } from "@/lib/geo/planar";

export type RouteSegment = {
  index: number;
  points: XY[];
  coords: LonLat[];
  lengthM: number;
  mid: XY;
  /** Direzione locale nel punto medio (non orientata, 0..180). */
  bearing: number;
};

type Located = { point: XY; edge: number };

/** Punto a distanza `d` lungo la polilinea; `cumulative[i]` è la distanza del vertice i dall'inizio. */
function locate(points: XY[], cumulative: number[], d: number): Located {
  let edge = 1;
  while (edge < points.length - 1 && cumulative[edge] < d) edge++;
  const a = points[edge - 1];
  const b = points[edge];
  const span = cumulative[edge] - cumulative[edge - 1];
  const t = span === 0 ? 0 : (d - cumulative[edge - 1]) / span;
  return { point: { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }, edge };
}

/** Divide il percorso in finestre di circa `targetM` metri: la somma delle lunghezze resta quella del tracciato. */
export function segmentRoute(coords: LonLat[], targetM: number): RouteSegment[] {
  const points = coords.map(toXY);
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + distance(points[i - 1], points[i]));
  const total = cumulative[cumulative.length - 1] ?? 0;
  if (points.length < 2 || total === 0) return [];

  const count = Math.max(1, Math.round(total / targetM));
  const step = total / count;
  return Array.from({ length: count }, (_, index) => {
    const from = index * step;
    const to = index === count - 1 ? total : from + step;
    const start = locate(points, cumulative, from);
    const end = locate(points, cumulative, to);
    const mid = locate(points, cumulative, (from + to) / 2);
    const inner = points.filter((_, i) => cumulative[i] > from && cumulative[i] < to);
    const segmentPoints = [start.point, ...inner, end.point];
    return {
      index,
      points: segmentPoints,
      coords: segmentPoints.map(toLonLat),
      lengthM: to - from,
      mid: mid.point,
      bearing: bearing(points[mid.edge - 1], points[mid.edge]),
    };
  });
}
