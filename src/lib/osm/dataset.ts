import { PILOT, providers } from "@/lib/config";
import { indexWays, type IndexedWay } from "@/lib/geo/match-evidence";
import { isServicePoi, isStreetLamp, isWalkableWay } from "@/lib/osm/normalize";
import { fetchOverpass } from "@/lib/osm/overpass";
import type { OsmDataset, OsmNode, OsmWay } from "@/lib/osm/types";

/** Dati OSM dell'area pilota pronti per l'analisi. */
export type PilotData = {
  dataset: OsmDataset;
  ways: IndexedWay[];
  lamps: OsmNode[];
  services: OsmNode[];
};

/** Se Overpass non risponde entro questo tempo si usa l'estrazione salvata nel repository. */
const LIVE_BUDGET_MS = 6_000;

export function prepare(dataset: OsmDataset): PilotData {
  const nodes = dataset.elements.filter((e): e is OsmNode => e.type === "node");
  const ways = dataset.elements.filter((e): e is OsmWay => e.type === "way" && isWalkableWay(e.tags));
  return {
    dataset,
    ways: indexWays(ways),
    lamps: nodes.filter((n) => isStreetLamp(n.tags)),
    services: nodes.filter((n) => isServicePoi(n.tags)),
  };
}

let cached: { data: PilotData; expires: number } | null = null;
let inflight: Promise<PilotData | null> | null = null;
let snapshot: Promise<PilotData> | null = null;

function loadLive(): Promise<PilotData | null> {
  inflight ??= fetchOverpass(PILOT.bbox)
    .then((dataset) => {
      const data = prepare(dataset);
      cached = { data, expires: Date.now() + providers.overpassCacheMs };
      return data;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function loadSnapshot(): Promise<PilotData> {
  snapshot ??= import("../../../data/pilot-snapshot.json").then((mod) => prepare(mod.default as unknown as OsmDataset));
  return snapshot;
}

/** Una sola interrogazione per area, condivisa tra le richieste: cache, poi Overpass, poi snapshot datato. */
export async function getPilotData(): Promise<PilotData> {
  if (cached && cached.expires > Date.now()) return cached.data;
  const budget = new Promise<null>((resolve) => setTimeout(() => resolve(null), LIVE_BUDGET_MS));
  return (await Promise.race([loadLive(), budget])) ?? loadSnapshot();
}
