import { useSyncExternalStore } from "react";
import { postJson } from "@/lib/api-client";
import { PILOT } from "@/lib/config";
import { formatDistance, formatMinutes, formatPercent } from "@/lib/format";
import type { LatLon } from "@/lib/routing/types";
import type { RoutesResponse } from "@/lib/schemas/routes";

/** Stato dell'app fuori da React: nell'app iOS ogni schermata è una pagina web separata e l'involucro
 *  nativo ricopia questo stato dall'una all'altra (vedi `connectNativeShell`). */

export type Status = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string };

export type AppState = {
  origin: LatLon | null;
  destination: LatLon | null;
  result: RoutesResponse | null;
  selectedRouteId: string | null;
  status: Status;
  showLayer: boolean;
  /** Vista 3D inclinata (true) o dall'alto. */
  tilted: boolean;
  /** Cambia quando si chiede di inquadrare di nuovo i percorsi. */
  fitSignal: number;
};

const INITIAL: AppState = {
  origin: null,
  destination: null,
  result: null,
  selectedRouteId: null,
  status: { kind: "idle" },
  showLayer: true,
  tilted: true,
  fitSignal: 0,
};

const CLEARED = { origin: null, destination: null, result: null, selectedRouteId: null, status: { kind: "idle" } } satisfies Partial<AppState>;

let state = INITIAL;
const listeners = new Set<() => void>();

function update(patch: Partial<AppState>, fromShell = false) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
  if (!fromShell) publish();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, () => state, () => INITIAL);
}

const { south, west, north, east } = PILOT.bbox;
const inPilot = (p: LatLon) => p.lat >= south && p.lat <= north && p.lon >= west && p.lon <= east;

/** Cosa fare adesso, o cosa sta succedendo. */
export function guidance({ origin, destination, status, result }: AppState): string {
  if (status.kind === "loading") return "Calcolo i percorsi…";
  if (result) return "Scegli un percorso per i dettagli.";
  if (!origin) return "Tocca la mappa: scegli la partenza.";
  if (!destination) return "Ora tocca il punto di arrivo.";
  return "Tocca la mappa per ripartire.";
}

export function reset() {
  update(CLEARED);
}

function showAnalysis(analysis: RoutesResponse, endpoints: Partial<AppState> = {}) {
  update({ ...endpoints, result: analysis, selectedRouteId: analysis.routes[0]?.id ?? null, status: { kind: "idle" } });
}

/** Calcola e mostra i percorsi tra due punti. Restituisce `true` se l'analisi è riuscita. */
export async function analyze(from: LatLon, to: LatLon): Promise<boolean> {
  update({ ...CLEARED, origin: from, destination: to, status: { kind: "loading" } });
  try {
    showAnalysis(await postJson<RoutesResponse>("/api/routes", { origin: from, destination: to }));
    return true;
  } catch (cause) {
    update({ status: { kind: "error", message: cause instanceof Error ? cause.message : "Analisi non riuscita." } });
    return false;
  }
}

/** Tocco sulla mappa: primo punto = partenza, secondo = arrivo (e parte l'analisi). */
export function pick(point: LatLon): "ignored" | "origin" | "analyzing" {
  if (state.status.kind === "loading") return "ignored";
  if (!inPilot(point)) {
    update({ status: { kind: "error", message: `Punto fuori dall'area pilota (${PILOT.name}).` } });
    return "ignored";
  }
  if (state.origin && !state.destination) {
    void analyze(state.origin, point);
    return "analyzing";
  }
  update({ ...CLEARED, origin: point });
  return "origin";
}

/** L'assistente ha calcolato dei percorsi: allinea mappa e pannello alla sua analisi. */
export function adoptAnalysis(analysis: RoutesResponse) {
  const coords = analysis.routes[0]?.geometry.coordinates;
  if (!coords?.length) return showAnalysis(analysis);
  const [startLon, startLat] = coords[0];
  const [endLon, endLat] = coords[coords.length - 1];
  showAnalysis(analysis, { origin: { lat: startLat, lon: startLon }, destination: { lat: endLat, lon: endLon } });
}

export const selectRoute = (id: string) => update({ selectedRouteId: id });
export const toggleLayer = () => update({ showLayer: !state.showLayer });
export const toggleTilt = () => update({ tilted: !state.tilted });
export const requestFit = () => update({ fitSignal: state.fitSignal + 1 });

// ——— Involucro nativo iOS ———

type ShellMessage = { type: "ready" } | { type: "state"; state: string; chrome: ReturnType<typeof nativeChrome> };
type ShellWindow = Window & {
  webkit?: { messageHandlers?: { nightway?: { postMessage: (message: ShellMessage) => void } } };
  __nwReceive?: (json: string) => void;
  __nwAction?: (name: string) => void;
};

const shell = () => (typeof window === "undefined" ? undefined : (window as ShellWindow).webkit?.messageHandlers?.nightway);

/** Testi e stati che i comandi nativi (capsula sopra la barra, pulsanti) mostrano così come sono. */
export function nativeChrome(s: AppState) {
  const routes = s.result?.routes ?? [];
  const index = routes.findIndex((route) => route.id === s.selectedRouteId);
  const route = routes[index];
  const error = s.status.kind === "error" ? s.status.message : null;
  return {
    title: route ? `${formatMinutes(route.durationSeconds)} · ${formatDistance(route.distanceMeters)}` : guidance(s),
    subtitle:
      error ??
      (route
        ? `Percorso ${index + 1} di ${routes.length} · luce nota ${formatPercent(route.evidenceCoverage.litKnownFraction)}`
        : `Area pilota: ${PILOT.name}`),
    isError: error !== null,
    canReset: s.origin !== null,
    hasRoutes: routes.length > 0,
    showLayer: s.showLayer,
    tilted: s.tilted,
  };
}

let publishQueued = false;

/** Manda lo stato all'involucro, una volta sola anche se cambia più volte nello stesso istante. */
function publish() {
  if (!shell() || publishQueued) return;
  publishQueued = true;
  queueMicrotask(() => {
    publishQueued = false;
    shell()?.postMessage({ type: "state", state: JSON.stringify(state), chrome: nativeChrome(state) });
  });
}

const SHELL_ACTIONS: Record<string, () => void> = { reset, toggleLayer, toggleTilt, fit: requestFit };

/** Collega la pagina all'involucro: riceve lo stato delle altre schermate e i comandi dei pulsanti nativi. */
export function connectNativeShell() {
  const target = window as ShellWindow;
  target.__nwReceive = (json) => update(JSON.parse(json) as AppState, true);
  target.__nwAction = (name) => SHELL_ACTIONS[name]?.();
  shell()?.postMessage({ type: "ready" });
}
