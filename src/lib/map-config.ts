import type { LitValue } from "@/lib/osm/normalize";
import type { LatLon } from "@/lib/routing/types";

/** Stile vettoriale scuro di OpenFreeMap (dati OpenStreetMap, schema OpenMapTiles): pubblico, senza chiave,
 *  con le altezze degli edifici per la vista 3D. L'attribuzione arriva dallo stile e resta sempre visibile. */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

/** Camera della vista inclinata. */
export const TILT = { pitch: 52, bearing: -17 };

/** Stile delle linee per valore di `lit`: colore e tratteggio insieme, mai solo colore.
 *  `dash` è il tipo di tratto sulla mappa, `dashArray` lo stesso tratto per l'SVG della legenda. */
export const LIT_STYLE: Record<LitValue, { color: string; dash: "solid" | "long" | "dot"; dashArray?: string }> = {
  yes: { color: "#ffb347", dash: "solid" },
  automatic: { color: "#ffb347", dash: "solid" },
  "24/7": { color: "#ffb347", dash: "solid" },
  limited: { color: "#ffb347", dash: "long", dashArray: "14 8" },
  no: { color: "#7aa2e8", dash: "solid" },
  other: { color: "#8f9bb3", dash: "dot", dashArray: "3 8" },
  unknown: { color: "#8f9bb3", dash: "dot", dashArray: "3 8" },
};

/** Coppie di luoghi reali dell'area pilota (coordinate dai nodi OpenStreetMap con quel nome). */
export const EXAMPLES: { label: string; origin: LatLon; destination: LatLon }[] = [
  {
    label: "Metro Piramide → Città dell'Altra Economia",
    origin: { lat: 41.8748621, lon: 12.4824769 },
    destination: { lat: 41.8745328, lon: 12.472269 },
  },
  {
    label: "Città dell'Altra Economia → Emporio",
    origin: { lat: 41.8745328, lon: 12.472269 },
    destination: { lat: 41.8827453, lon: 12.4760185 },
  },
  {
    label: "Santa Maria Liberatrice → Gazometro",
    origin: { lat: 41.8793013, lon: 12.4745173 },
    destination: { lat: 41.8692969, lon: 12.4749169 },
  },
];
