"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { BottomSheet, type Detent } from "@/components/layout/BottomSheet";
import { EvidenceLegend } from "@/components/routes/EvidenceLegend";
import { RouteComparison } from "@/components/routes/RouteComparison";
import { CloseIcon, FitIcon, InfoIcon, LayersIcon, RouteIcon, VoiceIcon } from "@/components/ui/icons";
import { LensFilter } from "@/components/ui/LensFilter";
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
type Tab = "routes" | "assistant" | "info";

const TABS: { id: Tab; label: string; title: string; icon: ReactNode }[] = [
  { id: "routes", label: "Percorsi", title: "Percorsi", icon: <RouteIcon /> },
  { id: "assistant", label: "Assistente", title: "Assistente", icon: <VoiceIcon /> },
  { id: "info", label: "Legenda", title: "Come leggere la mappa", icon: <InfoIcon /> },
];

const { south, west, north, east } = PILOT.bbox;
const inPilot = (p: LatLon) => p.lat >= south && p.lat <= north && p.lon >= west && p.lon <= east;

/** Indicazione nella barra in alto: cosa fare adesso, o cosa sta succedendo. */
function guidance(origin: LatLon | null, destination: LatLon | null, status: Status, result: RoutesResponse | null) {
  if (status.kind === "loading") return "Calcolo i percorsi…";
  if (result) return "Scegli un percorso per i dettagli.";
  if (!origin) return "Tocca la mappa: scegli la partenza.";
  if (!destination) return "Ora tocca il punto di arrivo.";
  return "Tocca la mappa per ripartire.";
}

export function NightwayApp() {
  const [origin, setOrigin] = useState<LatLon | null>(null);
  const [destination, setDestination] = useState<LatLon | null>(null);
  const [result, setResult] = useState<RoutesResponse | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [showLayer, setShowLayer] = useState(true);
  const [tab, setTab] = useState<Tab>("routes");
  const [detent, setDetent] = useState<Detent>("half");
  const [fitSignal, setFitSignal] = useState(0);

  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0];
  const hidden = (name: Tab) => (tab === name ? "" : "hidden");

  function showAnalysis(analysis: RoutesResponse) {
    setResult(analysis);
    setSelectedRouteId(analysis.routes[0]?.id ?? null);
    setStatus({ kind: "idle" });
    setDetent((current) => (current === "peek" ? "half" : current));
  }

  function reset() {
    setOrigin(null);
    setDestination(null);
    setResult(null);
    setSelectedRouteId(null);
    setStatus({ kind: "idle" });
  }

  async function analyze(from: LatLon, to: LatLon) {
    reset();
    setOrigin(from);
    setDestination(to);
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
    reset();
    setOrigin(point);
    // Lascia libera la mappa per scegliere l'arrivo.
    setDetent("peek");
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

  function openTab(next: Tab) {
    setTab(next);
    setDetent((current) => (current === "peek" ? "half" : current));
  }

  return (
    <div className="fixed inset-0">
      <LensFilter />

      <RouteMap
        origin={origin}
        destination={destination}
        result={result}
        selectedRouteId={selectedRouteId}
        showLayer={showLayer}
        detent={detent}
        fitSignal={fitSignal}
        onPick={pick}
        onSelectRoute={setSelectedRouteId}
      />

      <header className="glass fixed inset-x-3 top-[calc(var(--safe-top)+0.5rem)] z-[1100] flex min-h-14 items-center gap-3 rounded-[28px] py-2 pl-5 pr-2 lg:inset-x-auto lg:left-4 lg:top-4 lg:w-[24rem]">
        <div className="min-w-0 flex-1">
          <h1 className="text-[0.8125rem] font-bold tracking-wide text-sodium">NIGHTWAY</h1>
          <p aria-live="polite" className="leading-snug">
            {guidance(origin, destination, status, result)}
          </p>
          {status.kind === "error" && (
            <p role="alert" className="mt-1 text-sm leading-snug text-alert">
              {status.message}
            </p>
          )}
        </div>
        {origin && (
          <button type="button" onClick={reset} aria-label="Cancella partenza e arrivo" className="btn size-11 shrink-0 p-0">
            <CloseIcon />
          </button>
        )}
      </header>

      <div className="fixed right-3 top-[calc(var(--safe-top)+6.25rem)] z-[1100] grid gap-2 lg:right-4 lg:top-4">
        <button
          type="button"
          aria-pressed={showLayer}
          aria-label="Mostra i dati mappati attorno ai percorsi"
          title="Dati mappati attorno ai percorsi"
          onClick={() => setShowLayer(!showLayer)}
          className="glass fab"
        >
          <LayersIcon />
        </button>
        {result && (
          <button type="button" aria-label="Inquadra i percorsi" title="Inquadra i percorsi" onClick={() => setFitSignal(fitSignal + 1)} className="glass fab">
            <FitIcon />
          </button>
        )}
      </div>

      <BottomSheet
        detent={detent}
        onDetentChange={setDetent}
        title={activeTab.title}
        summary={tab === "routes" && result ? (result.routes.length === 1 ? "1 percorso" : `${result.routes.length} percorsi`) : undefined}
      >
        <div className={`grid gap-5 ${hidden("routes")}`}>
          {result && <RouteComparison result={result} selectedRouteId={selectedRouteId} onSelect={setSelectedRouteId} />}
          <section aria-labelledby="pick-title" className="grid gap-2">
            <h3 id="pick-title" className="font-semibold">
              {result ? "Prova un altro tragitto" : "Prova un tragitto"}
            </h3>
            <p className="text-sm text-dim">Scegli due punti sulla mappa, oppure parti da luoghi reali della zona.</p>
            {EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                disabled={status.kind === "loading"}
                onClick={() => analyze(example.origin, example.destination)}
                className="btn btn-row"
              >
                {example.label}
              </button>
            ))}
          </section>
        </div>

        <div className={hidden("assistant")}>
          <AssistantPanel origin={origin} destination={destination} result={result} onAnalysis={adoptAgentAnalysis} />
        </div>

        <div className={`grid gap-4 ${hidden("info")}`}>
          <EvidenceLegend />
          <div className="glass-card p-4 text-sm text-dim">
            <p>
              NIGHTWAY confronta i percorsi a piedi su ciò che la mappa documenta e mostra dove i dati mancano. Area pilota: {PILOT.name}.
            </p>
            <p className="mt-2">
              Non valuta la sicurezza personale e non prevede reati: mostra caratteristiche ambientali documentate e i loro limiti. La scelta del
              percorso resta tua.
            </p>
            <p className="mt-2">
              Dati © contributori di{" "}
              <a href="https://www.openstreetmap.org/copyright" className="text-ink underline underline-offset-2">
                OpenStreetMap
              </a>{" "}
              (ODbL). Routing: Valhalla. Nessun account, nessun tragitto salvato.
            </p>
          </div>
        </div>
      </BottomSheet>

      <nav
        aria-label="Sezioni"
        className="glass fixed inset-x-3 bottom-[calc(var(--safe-bottom)+0.5rem)] z-[1100] rounded-full p-1.5 lg:inset-x-auto lg:bottom-auto lg:left-4 lg:top-[5.25rem] lg:w-[24rem]"
      >
        <div role="tablist" className="grid grid-cols-3 gap-1">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => openTab(id)}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-full text-xs font-semibold transition-colors lg:min-h-11 lg:flex-row lg:gap-2 lg:text-sm ${
                tab === id ? "bg-white/14 text-sodium" : "text-dim hover:text-ink"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
