"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import { AgentHost } from "@/components/assistant/AgentHost";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { BottomSheet, type Detent } from "@/components/layout/BottomSheet";
import { AboutCard } from "@/components/routes/AboutCard";
import { EvidenceLegend } from "@/components/routes/EvidenceLegend";
import { RouteComparison } from "@/components/routes/RouteComparison";
import { RouteExamples } from "@/components/routes/RouteExamples";
import { CloseIcon, FitIcon, InfoIcon, LayersIcon, RouteIcon, VoiceIcon } from "@/components/ui/icons";
import { LensFilter } from "@/components/ui/LensFilter";
import * as app from "@/lib/app-state";
import type { LatLon } from "@/lib/routing/types";

const RouteMap = dynamic(() => import("@/components/map/RouteMap"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-dim">Carico la mappa…</div>,
});

type Tab = "routes" | "assistant" | "info";

const TABS: { id: Tab; label: string; title: string; icon: ReactNode }[] = [
  { id: "routes", label: "Percorsi", title: "Percorsi", icon: <RouteIcon /> },
  { id: "assistant", label: "Assistente", title: "Assistente", icon: <VoiceIcon /> },
  { id: "info", label: "Legenda", title: "Come leggere la mappa", icon: <InfoIcon /> },
];

export function NightwayApp() {
  const state = app.useAppState();
  const { origin, destination, result, selectedRouteId, status, showLayer, fitSignal, tour } = state;
  const [tab, setTab] = useState<Tab>("routes");
  const [detent, setDetent] = useState<Detent>("half");

  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0];
  const hidden = (name: Tab) => (tab === name ? "" : "hidden");
  const raiseSheet = () => setDetent((current) => (current === "peek" ? "half" : current));

  async function analyze(from: LatLon, to: LatLon) {
    if (!(await app.analyze(from, to))) return;
    raiseSheet();
    setTab("routes");
  }

  function pick(point: LatLon) {
    const outcome = app.pick(point);
    // Lascia libera la mappa per scegliere l'arrivo.
    if (outcome === "origin") setDetent("peek");
    if (outcome === "analyzing") raiseSheet();
  }

  // Quando parte un volo sul percorso (dal pannello o dall'assistente) il pannello si abbassa: la mappa è la protagonista.
  const [seenTour, setSeenTour] = useState(0);
  if (tour && tour.nonce !== seenTour) {
    setSeenTour(tour.nonce);
    setDetent("peek");
  }

  function openTab(next: Tab) {
    setTab(next);
    raiseSheet();
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
        tour={tour}
        onTourEnd={app.endTour}
        onPick={pick}
        onSelectRoute={app.selectRoute}
      />

      <header className="glass fixed inset-x-3 top-[calc(var(--safe-top)+0.5rem)] z-[1100] flex min-h-14 items-center gap-3 rounded-[28px] py-2 pl-5 pr-2 lg:inset-x-auto lg:left-4 lg:top-4 lg:w-[24rem]">
        <div className="min-w-0 flex-1">
          <h1 className="text-[0.8125rem] font-bold tracking-wide text-sodium">NIGHTWAY</h1>
          <p aria-live="polite" className="leading-snug">
            {app.guidance(state)}
          </p>
          {status.kind === "error" && (
            <p role="alert" className="mt-1 text-sm leading-snug text-alert">
              {status.message}
            </p>
          )}
        </div>
        {origin && (
          <button type="button" onClick={app.reset} aria-label="Cancella partenza e arrivo" className="btn size-11 shrink-0 p-0">
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
          onClick={app.toggleLayer}
          className="glass fab"
        >
          <LayersIcon />
        </button>
        {result && (
          <button type="button" aria-label="Inquadra i percorsi" title="Inquadra i percorsi" onClick={app.requestFit} className="glass fab">
            <FitIcon />
          </button>
        )}
      </div>

      <AgentHost dock="right-3 top-[calc(var(--safe-top)+13.5rem)] flex-row-reverse items-start lg:right-4 lg:top-[8.5rem]" />

      <BottomSheet
        detent={detent}
        onDetentChange={setDetent}
        title={activeTab.title}
        summary={tab === "routes" && result ? (result.routes.length === 1 ? "1 percorso" : `${result.routes.length} percorsi`) : undefined}
      >
        <div className={`grid gap-5 ${hidden("routes")}`}>
          {result && <RouteComparison result={result} selectedRouteId={selectedRouteId} onSelect={app.selectRoute} onTour={app.startTour} />}
          <RouteExamples hasResult={result !== null} disabled={status.kind === "loading"} onChoose={analyze} />
        </div>

        <div className={hidden("assistant")}>
          <AssistantPanel />
        </div>

        <div className={`grid gap-4 ${hidden("info")}`}>
          <EvidenceLegend />
          <AboutCard />
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
