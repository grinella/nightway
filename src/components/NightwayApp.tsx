"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { EvidenceLegend } from "@/components/routes/EvidenceLegend";
import { RouteComparison } from "@/components/routes/RouteComparison";
import { postJson } from "@/lib/api-client";
import { PILOT } from "@/lib/config";
import { EXAMPLES } from "@/lib/map-config";
import type { LatLon } from "@/lib/routing/types";
import type { RoutesResponse } from "@/lib/schemas/routes";

const RouteMap = dynamic(() => import("@/components/map/RouteMap"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-dim">Carico la mappa…</div>,
});

type Status = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string };

const { south, west, north, east } = PILOT.bbox;
const inPilot = (p: LatLon) => p.lat >= south && p.lat <= north && p.lon >= west && p.lon <= east;

function instruction(origin: LatLon | null, destination: LatLon | null, status: Status) {
  if (status.kind === "loading") return "Calcolo i percorsi e leggo i dati della mappa…";
  if (!origin) return "Tocca la mappa per scegliere il punto di partenza (A).";
  if (!destination) return "Ora tocca il punto di arrivo (B).";
  return "Tocca di nuovo la mappa per scegliere una nuova partenza.";
}

export function NightwayApp() {
  const [origin, setOrigin] = useState<LatLon | null>(null);
  const [destination, setDestination] = useState<LatLon | null>(null);
  const [result, setResult] = useState<RoutesResponse | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [showLayer, setShowLayer] = useState(true);

  function showAnalysis(analysis: RoutesResponse) {
    setResult(analysis);
    setSelectedRouteId(analysis.routes[0]?.id ?? null);
    setStatus({ kind: "idle" });
  }

  async function analyze(from: LatLon, to: LatLon) {
    setOrigin(from);
    setDestination(to);
    setResult(null);
    setSelectedRouteId(null);
    setStatus({ kind: "loading" });
    try {
      showAnalysis(await postJson<RoutesResponse>("/api/routes", { origin: from, destination: to }));
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
    <div className="grid lg:h-dvh lg:grid-cols-[26rem_1fr]">
      <main className="grid content-start gap-6 border-line bg-panel p-4 max-lg:order-2 max-lg:border-t sm:p-5 lg:overflow-y-auto lg:border-r">
        <header>
          <h1 className="text-[1.375rem] font-bold">NIGHTWAY</h1>
          <p className="mt-1 text-dim">
            Confronta i percorsi a piedi su ciò che la mappa documenta, e vedi dove i dati mancano. Area pilota: {PILOT.name}.
          </p>
        </header>

        <section aria-labelledby="pick-title" className="grid gap-3">
          <h2 id="pick-title" className="font-bold">
            Partenza e arrivo
          </h2>
          <p aria-live="polite">{instruction(origin, destination, status)}</p>
          {status.kind === "error" && (
            <p role="alert" className="rounded-control border border-alert px-3 py-2 text-alert">
              {status.message}
            </p>
          )}
          <div className="grid gap-2">
            <p className="text-sm text-dim">Oppure prova un tragitto tra luoghi reali della zona:</p>
            {EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                disabled={status.kind === "loading"}
                onClick={() => analyze(example.origin, example.destination)}
                className="rounded-control border border-line px-3 py-2 text-left text-sm hover:bg-raised disabled:opacity-60"
              >
                {example.label}
              </button>
            ))}
          </div>
        </section>

        {result && <RouteComparison result={result} selectedRouteId={selectedRouteId} onSelect={setSelectedRouteId} />}

        <AssistantPanel origin={origin} destination={destination} result={result} onAnalysis={adoptAgentAnalysis} />

        <div className="grid gap-3">
          <EvidenceLegend />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showLayer} onChange={(event) => setShowLayer(event.target.checked)} className="size-4 accent-sodium" />
            Mostra anche i dati mappati attorno ai percorsi
          </label>
        </div>

        <footer className="border-t border-line pt-4 text-sm text-dim">
          <p>
            NIGHTWAY non valuta la sicurezza personale e non prevede reati: mostra caratteristiche ambientali documentate e i loro limiti. La scelta
            del percorso resta tua.
          </p>
          <p className="mt-2">
            Dati © contributori di{" "}
            <a href="https://www.openstreetmap.org/copyright" className="text-ink underline underline-offset-2">
              OpenStreetMap
            </a>{" "}
            (ODbL). Routing: Valhalla. Nessun account, nessun tragitto salvato.
          </p>
        </footer>
      </main>

      <div className="h-[52svh] max-lg:order-1 lg:h-auto">
        <RouteMap
          origin={origin}
          destination={destination}
          result={result}
          selectedRouteId={selectedRouteId}
          showLayer={showLayer}
          onPick={pick}
          onSelectRoute={setSelectedRouteId}
        />
      </div>
    </div>
  );
}
