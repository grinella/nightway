import type { PilotData } from "@/lib/osm/dataset";
import type { OsmNode, OsmWay } from "@/lib/osm/types";

export type Place = { name: string; kind: string; lat: number; lon: number };

const KIND_KEYS = ["amenity", "shop", "tourism", "historic", "leisure", "railway", "public_transport", "highway"];

const normalize = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

function positionOf(element: OsmNode | OsmWay): { lat: number; lon: number } {
  if (element.type === "node") return { lat: element.lat, lon: element.lon };
  return element.geometry[Math.floor(element.geometry.length / 2)];
}

function toPlace(element: OsmNode | OsmWay): Place | null {
  const key = KIND_KEYS.find((k) => element.tags[k]);
  if (!element.tags.name || !key) return null;
  const kind = key === "highway" ? "strada" : `${key}=${element.tags[key]}`;
  return { name: element.tags.name, kind, ...positionOf(element) };
}

const cache = new WeakMap<PilotData, Place[]>();

/** Luoghi con nome presenti nei dati OSM dell'area pilota (una voce per coppia nome/tipo). */
function placesOf(data: PilotData): Place[] {
  let places = cache.get(data);
  if (!places) {
    const unique = new Map<string, Place>();
    for (const element of data.dataset.elements) {
      const place = toPlace(element);
      if (place && !unique.has(`${place.name}|${place.kind}`)) unique.set(`${place.name}|${place.kind}`, place);
    }
    places = [...unique.values()];
    cache.set(data, places);
  }
  return places;
}

/** Cerca per nome dentro l'area pilota: non è un geocoder generale, solo ciò che OSM ha mappato qui. */
export function findPlaces(data: PilotData, query: string, limit = 5): Place[] {
  const words = normalize(query).split(" ").filter((w) => w.length > 1);
  if (!words.length) return [];
  return placesOf(data)
    .map((place) => {
      const name = normalize(place.name);
      const hits = words.filter((w) => name.includes(w)).length;
      // A parità di parole trovate, preferisci i luoghi alle strade e i nomi più corti (più specifici).
      return { place, hits, rank: hits * 1000 - (place.kind === "strada" ? 100 : 0) - name.length };
    })
    .filter((m) => m.hits === words.length)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
    .map((m) => m.place);
}
