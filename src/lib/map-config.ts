import type { LitValue } from "@/lib/osm/normalize";
import type { LatLon } from "@/lib/routing/types";

/** Tile standard di OpenStreetMap, scurite via CSS (vedi globals.css): uso leggero da demo, senza prefetch,
 *  con attribuzione sempre visibile, come richiesto dalla tile policy. */
export const TILES = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; contributori di <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
};

/** Stile delle linee per valore di `lit`: colore e tratteggio insieme, mai solo colore. */
export const LIT_STYLE: Record<LitValue, { color: string; dashArray?: string }> = {
  yes: { color: "#ffb347" },
  automatic: { color: "#ffb347" },
  "24/7": { color: "#ffb347" },
  limited: { color: "#ffb347", dashArray: "14 8" },
  no: { color: "#7aa2e8" },
  other: { color: "#8f9bb3", dashArray: "3 8" },
  unknown: { color: "#8f9bb3", dashArray: "3 8" },
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
