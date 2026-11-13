"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { EvidenceLegend } from "@/components/routes/EvidenceLegend";
import { RouteComparison } from "@/components/routes/RouteComparison";
import { postJson } from "@/lib/api-client";
import { PILOT } from "@/lib/config";
import { formatDistance, formatMinutes } from "@/lib/format";
import { EXAMPLES } from "@/lib/map-config";
import type { LatLon } from "@/lib/routing/types";
import type { RoutesResponse } from "@/lib/schemas/routes";

const RouteMap = dynamic(() => import("@/components/map/RouteMap"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-dim">Carico la mappa…</div>,
});

type Status = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string };
type Tab = "routes" | "assistant" | "info";

const TABS: { id: Tab; label: string }[] = [
  { id: "routes", label: "Percorsi" },
  { id: "assistant", label: "Assistente" },
  { id: "info", label: "Legenda" },
];

const { south, west, north, east } = PILOT.bbox;
const inPilot = (p: LatLon) => p.lat >= south && p.lat <= north && p.lon >= west && p.lon <= east;

/** Riga di stato sempre visibile: su telefono è ciò che resta quando il pannello è abbassato. */
function statusLine(origin: LatLon | null, destination: LatLon | null, status: Status, result: RoutesResponse | null, selectedId: string | null) {
  if (status.kind === "loading") return "Calcolo i percorsi e leggo i dati della mappa…";
  if (result) {
    const index = Math.max(0, result.routes.findIndex((route) => route.id === selectedId));
    const route = result.routes[index];
    const count = result.routes.length === 1 ? "1 percorso" : `${result.routes.length} percorsi`;
    return `${count} · Percorso ${index + 1}: ${formatDistance(route.distanceMeters)}, ${formatMinutes(route.durationSeconds)}`;
  }
  if (!origin) return "Tocca la mappa per scegliere la partenza (A).";
  if (!destination) return "Ora tocca il punto di arrivo (B).";
  return "Tocca la mappa per scegliere una nuova partenza.";
}

export function NightwayApp() {
  const [origin, setOrigin] = useState<LatLon | null>(null);
  const [destination, setDestination] = useState<LatLon | null>(null);
  const [result, setResult] = useState<RoutesResponse | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [showLayer, setShowLayer] = useState(true);
  const [tab, setTab] = useState<Tab>("routes");
  const [sheetOpen, setSheetOpen] = useState(true);

  /** Su telefono ogni blocco appartiene a una scheda; su schermi larghi si vedono tutti. */
  const inTab = (name: Tab) => (tab === name ? "" : "max-lg:hidden");

  function showAnalysis(analysis: RoutesResponse) {
    setResult(analysis);
    setSelectedRouteId(analysis.routes[0]?.id ?? null);
    setStatus({ kind: "idle" });
    setSheetOpen(true);
  }

  async function analyze(from: LatLon, to: LatLon) {
    setOrigin(from);
    setDestination(to);
    setResult(null);
    setSelectedRouteId(null);
    setStatus({ kind: "loading" });
    try {
      showAnalysis(await postJson<RoutesResponse>("/api/routes", { origin: from, destination: to }));
      setTab("routes");
    } catch (cause) {
      setStatus({ kind: "error", message: cause instanceof Error ? cause.message : "Analisi non riuscita." });
    }
  }

  function pick(point: LatLon) {
    if (status.kind === "loading") return;
    if (!inPilot(point)) {
      setStatus({ kind: "error", message: `Punto fuori dall'area pilota (${PILOT.name}).` });
      return;
    }
    if (origin && !destination) {
      analyze(origin, point);
      return;
    }
    setOrigin(point);
    setDestination(null);
    setResult(null);
    setSelectedRouteId(null);
    setStatus({ kind: "idle" });
    // Lascia libera la mappa per scegliere l'arrivo.
    setSheetOpen(false);
  }

  /** L'assistente ha calcolato dei percorsi: allinea mappa e pannello alla sua analisi. */
  function adoptAgentAnalysis(analysis: RoutesResponse) {
    const coords = analysis.routes[0]?.geometry.coordinates;
    if (coords?.length) {
      const [startLon, startLat] = coords[0];
      const [endLon, endLat] = coords[coords.length - 1];
      setOrigin({ lat: startLat, lon: startLon });
      setDestination({ lat: endLat, lon: endLon });
    }
    showAnalysis(analysis);
  }

  return (
    <div className="max-lg:h-dvh max-lg:overflow-hidden lg:grid lg:h-dvh lg:grid-cols-[26rem_1fr]">
      <main
        className={`flex flex-col bg-panel max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-[1100] max-lg:rounded-t-2xl max-lg:border-t max-lg:border-line max-lg:pb-[env(safe-area-inset-bottom)] lg:overflow-y-auto lg:border-r lg:border-line ${sheetOpen ? "max-lg:h-[62dvh]" : ""}`}
      >
        <div className="shrink-0 px-4 pt-2 sm:px-5 lg:pt-5">
          <button
            type="button"
            aria-expanded={sheetOpen}
            aria-controls="panel-body"
            onClick={() => setSheetOpen(!sheetOpen)}
            className="mx-auto mb-1 grid h-8 w-full place-items-center lg:hidden"
          >
            <span className="h-1 w-10 rounded-full bg-line" aria-hidden="true" />
            <span className="sr-only">{sheetOpen ? "Abbassa il pannello" : "Alza il pannello"}</span>
          </button>
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="text-lg font-bold lg:text-[1.375rem]">NIGHTWAY</h1>
            <span className="text-sm text-dim lg:hidden">{PILOT.name}</span>
          </div>
          <p aria-live="polite" className="mt-1 pb-3">
            {statusLine(origin, destination, status, result, selectedRouteId)}
          </p>
          {status.kind === "error" && (
            <p role="alert" className="mb-3 rounded-control border border-alert px-3 py-2 text-alert">
              {status.message}
            </p>
          )}
        </div>

        <div id="panel-body" className={`flex min-h-0 flex-1 flex-col ${sheetOpen ? "" : "max-lg:hidden"}`}>
          <div role="tablist" aria-label="Sezioni" className="grid shrink-0 grid-cols-3 border-y border-line lg:hidden">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`min-h-11 border-b-2 text-sm ${tab === id ? "border-sodium font-bold text-ink" : "border-transparent text-dim"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid content-start gap-6 overscroll-contain p-4 max-lg:min-h-0 max-lg:flex-1 max-lg:overflow-y-auto sm:p-5 lg:pt-2">
            <p className={`text-dim ${inTab("info")}`}>
              Confronta i percorsi a piedi su ciò che la mappa documenta, e vedi dove i dati mancano. Area pilota: {PILOT.name}.
            </p>

            {result && (
              <div className={inTab("routes")}>
                <RouteComparison result={result} selectedRouteId={selectedRouteId} onSelect={setSelectedRouteId} />
              </div>
            )}

            <section aria-labelledby="pick-title" className={`grid gap-2 ${inTab("routes")}`}>
              <h2 id="pick-title" className="font-bold">
                {result ? "Prova un altro tragitto" : "Prova un tragitto"}
              </h2>
              <p className="text-sm text-dim">Scegli due punti sulla mappa, oppure parti da luoghi reali della zona:</p>
              {EXAMPLES.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  disabled={status.kind === "loading"}
                  onClick={() => analyze(example.origin, example.destination)}
                  className="min-h-11 rounded-control border border-line px-3 py-2 text-left text-sm hover:bg-raised disabled:opacity-60"
                >
                  {example.label}
                </button>
              ))}
            </section>

            <div className={inTab("assistant")}>
              <AssistantPanel origin={origin} destination={destination} result={result} onAnalysis={adoptAgentAnalysis} />
            </div>

            <div className={`grid gap-3 ${inTab("info")}`}>
              <EvidenceLegend />
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={showLayer} onChange={(event) => setShowLayer(event.target.checked)} className="size-4 accent-sodium" />
                Mostra anche i dati mappati attorno ai percorsi
              </label>
            </div>

            <footer className={`border-t border-line pt-4 text-sm text-dim ${inTab("info")}`}>
              <p>
                NIGHTWAY non valuta la sicurezza personale e non prevede reati: mostra caratteristiche ambientali documentate e i loro limiti. La
                scelta del percorso resta tua.
              </p>
              <p className="mt-2">
                Dati © contributori di{" "}
                <a href="https://www.openstreetmap.org/copyright" className="text-ink underline underline-offset-2">
                  OpenStreetMap
                </a>{" "}
                (ODbL). Routing: Valhalla. Nessun account, nessun tragitto salvato.
              </p>
            </footer>
          </div>
        </div>
      </main>

      <div className="max-lg:fixed max-lg:inset-0 lg:order-2">
        <RouteMap
          origin={origin}
          destination={destination}
          result={result}
          selectedRouteId={selectedRouteId}
          showLayer={showLayer}
          sheetOpen={sheetOpen}
          onPick={pick}
          onSelectRoute={setSelectedRouteId}
        />
      </div>
    </div>
  );
}
