import type { OsmDataset } from "@/lib/osm/types";

type Tags = Record<string, string>;

/** Valori di `lit` tenuti distinti: l'assenza del tag è "unknown", mai "no". */
export type LitValue = "yes" | "no" | "limited" | "automatic" | "24/7" | "other" | "unknown";

export function normalizeLit(tags: Tags): LitValue {
  const raw = tags.lit?.trim().toLowerCase();
  if (!raw) return "unknown";
  if (raw === "yes" || raw === "no" || raw === "limited" || raw === "automatic" || raw === "24/7") return raw;
  return "other";
}

/** Punteggio 0..1 dell'illuminazione dichiarata; null = non valutabile. */
export function litScore(lit: LitValue): number | null {
  if (lit === "yes" || lit === "automatic" || lit === "24/7") return 1;
  if (lit === "limited") return 0.5;
  if (lit === "no") return 0;
  return null;
}

export type WalkValue = "pedestrian" | "sidewalk" | "steps" | "no_sidewalk" | "unknown";

const PEDESTRIAN_WAYS = new Set(["footway", "pedestrian", "path", "living_street"]);

/** Infrastruttura pedonale dichiarata dal way percorso. Una strada senza tag `sidewalk` resta "unknown". */
export function normalizeWalk(tags: Tags): WalkValue {
  if (tags.highway === "steps") return "steps";
  if (PEDESTRIAN_WAYS.has(tags.highway)) return "pedestrian";
  const sidewalk = tags.sidewalk ?? tags["sidewalk:both"];
  if (!sidewalk) return "unknown";
  if (sidewalk === "no" || sidewalk === "none") return "no_sidewalk";
  return "sidewalk";
}

export function walkScore(walk: WalkValue): number | null {
  if (walk === "pedestrian" || walk === "sidewalk") return 1;
  if (walk === "steps") return 0.5;
  if (walk === "no_sidewalk") return 0;
  return null;
}

/** Way su cui non ha senso agganciare un tratto a piedi. */
const NON_WALKABLE = new Set(["construction", "proposed", "platform", "bus_stop", "elevator", "motorway", "motorway_link"]);
export const isWalkableWay = (tags: Tags) => Boolean(tags.highway) && !NON_WALKABLE.has(tags.highway);

export const isStreetLamp = (tags: Tags) => tags.highway === "street_lamp";

/** Arredo e sosta: sono `amenity` ma non sono attività o servizi. */
const NOT_A_SERVICE = new Set([
  "bench", "waste_basket", "waste_disposal", "recycling", "parking", "parking_entrance", "parking_space",
  "bicycle_parking", "motorcycle_parking", "vending_machine", "telephone", "post_box", "clock", "fountain",
  "drinking_water", "charging_station", "bicycle_rental", "taxi", "grit_bin", "hunting_stand",
]);

export function isServicePoi(tags: Tags): boolean {
  if (tags.shop && tags.shop !== "vacant") return true;
  if (tags.public_transport || tags.railway === "station") return true;
  return Boolean(tags.amenity) && !NOT_A_SERVICE.has(tags.amenity);
}

export type Provenance = {
  source: "OpenStreetMap";
  via: string;
  retrievedAt: string;
  osmBase?: string;
  origin: OsmDataset["origin"];
  license: "ODbL 1.0";
};

export const provenanceOf = (dataset: OsmDataset): Provenance => ({
  source: "OpenStreetMap",
  via: new URL(dataset.endpoint).host,
  retrievedAt: dataset.retrievedAt,
  osmBase: dataset.osmBase,
  origin: dataset.origin,
  license: "ODbL 1.0",
});
