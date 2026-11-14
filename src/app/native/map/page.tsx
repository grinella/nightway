"use client";

import dynamic from "next/dynamic";
import { pick, selectRoute, useAppState } from "@/lib/app-state";

const RouteMap = dynamic(() => import("@/components/map/RouteMap"), { ssr: false });

/** Spazio occupato dai comandi nativi: stato in alto, pulsanti a destra, capsula e barra in basso. */
const FIT_PADDING = { top: 96, right: 84, bottom: 200, left: 32 };

export default function NativeMapPage() {
  const state = useAppState();
  return (
    <main className="fixed inset-0">
      <h1 className="sr-only">NIGHTWAY, mappa</h1>
      <RouteMap
        origin={state.origin}
        destination={state.destination}
        result={state.result}
        selectedRouteId={state.selectedRouteId}
        showLayer={state.showLayer}
        detent="peek"
        fitSignal={state.fitSignal}
        fitPadding={FIT_PADDING}
        tilted={state.tilted}
        onPick={pick}
        onSelectRoute={selectRoute}
      />
    </main>
  );
}
