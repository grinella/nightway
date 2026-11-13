import type { LitValue, WalkValue } from "@/lib/osm/normalize";
import type { Dimension } from "@/lib/scoring/coverage";

export const formatDistance = (meters: number) =>
  meters >= 1000 ? `${(meters / 1000).toLocaleString("it-IT", { maximumFractionDigits: 1 })} km` : `${Math.round(meters)} m`;

export const formatMinutes = (seconds: number) => `${Math.max(1, Math.round(seconds / 60))} min`;

export const formatPercent = (fraction: number) => `${Math.round(fraction * 100)}%`;

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("it-IT", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const DIMENSION_LABELS: Record<Dimension, string> = {
  lightingDeclared: "Illuminazione dichiarata",
  lamps: "Punti luce mappati",
  visibility: "Visibilità",
  walkability: "Infrastruttura pedonale",
  services: "Servizi mappati",
};

export const LIT_LABELS: Record<LitValue, string> = {
  yes: "Dichiarata (lit=yes)",
  automatic: "Dichiarata, automatica",
  "24/7": "Dichiarata, sempre accesa",
  limited: "Dichiarata limitata",
  no: "Dichiarata assente (lit=no)",
  other: "Valore non interpretato",
  unknown: "Ignota: tag assente",
};

export const WALK_LABELS: Record<WalkValue, string> = {
  pedestrian: "percorso pedonale",
  sidewalk: "marciapiede dichiarato",
  steps: "scale",
  no_sidewalk: "senza marciapiede dichiarato",
  unknown: "infrastruttura pedonale ignota",
};
