"use client";

import "leaflet/dist/leaflet.css";
import { divIcon, type LatLngBoundsExpression, type LatLngExpression } from "leaflet";
import { useEffect } from "react";
import { AttributionControl, CircleMarker, MapContainer, Marker, Polyline, Rectangle, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import { detentHeight, type Detent } from "@/components/layout/BottomSheet";
import { PILOT } from "@/lib/config";
import type { LonLat } from "@/lib/geo/planar";
import { LIT_STYLE, TILES } from "@/lib/map-config";
import type { LatLon } from "@/lib/routing/types";
import type { RoutesResponse } from "@/lib/schemas/routes";

type Props = {
  origin: LatLon | null;
  destination: LatLon | null;
  result: RoutesResponse | null;
  selectedRouteId: string | null;
  showLayer: boolean;
  /** Posizione del pannello: su telefono copre la parte bassa della mappa. */
  detent: Detent;
  /** Cambia quando l'utente chiede di inquadrare di nuovo i percorsi. */
  fitSignal: number;
  onPick: (point: LatLon) => void;
  onSelectRoute: (id: string) => void;
};

const { south, west, north, east } = PILOT.bbox;
const PILOT_BOUNDS: LatLngBoundsExpression = [[south, west], [north, east]];
const MAX_BOUNDS: LatLngBoundsExpression = [[south - 0.01, west - 0.015], [north + 0.01, east + 0.015]];

const toLatLng = ([lon, lat]: LonLat): LatLngExpression => [lat, lon];
const endpointIcon = (label: string) => divIcon({ className: "", html: `<span class="endpoint-marker">${label}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] });

function ClickToPick({ onPick }: Pick<Props, "onPick">) {
  useMapEvents({ click: (event) => onPick({ lat: event.latlng.lat, lon: event.latlng.lng }) });
  return null;
}

/** Inquadra i percorsi nella parte di mappa libera da barra, pannello e navigazione. */
function FitToRoutes({ result, detent, fitSignal }: Pick<Props, "result" | "detent" | "fitSignal">) {
  const map = useMap();
  useEffect(() => {
    const points = result?.routes.flatMap((route) => route.geometry.coordinates.map(toLatLng)) ?? [];
    if (!points.length) return;
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    // Il pannello aperto del tutto lascia poca mappa: si inquadra come se fosse a metà.
    const sheet = detentHeight(detent === "full" ? "half" : detent, window.innerHeight);
    map.fitBounds(points as LatLngBoundsExpression, {
      paddingTopLeft: desktop ? [432, 48] : [32, 150],
      paddingBottomRight: desktop ? [88, 48] : [72, sheet + 110],
    });
  }, [map, result, detent, fitSignal]);
  return null;
}

export default function RouteMap({ origin, destination, result, selectedRouteId, showLayer, detent, fitSignal, onPick, onSelectRoute }: Props) {
  const routes = result?.routes ?? [];
  const selected = routes.find((route) => route.id === selectedRouteId);

  return (
    <MapContainer bounds={PILOT_BOUNDS} maxBounds={MAX_BOUNDS} minZoom={14} className="h-full w-full" attributionControl={false} zoomControl={false}>
      {/* In alto: su telefono il pannello copre il bordo inferiore e l'attribuzione deve restare visibile. */}
      <AttributionControl position="topleft" prefix={false} />
      <ZoomControl position="bottomright" />
      <TileLayer url={TILES.url} attribution={TILES.attribution} />
      <Rectangle bounds={PILOT_BOUNDS} pathOptions={{ color: "#a3aec4", weight: 1, dashArray: "2 6", fill: false, interactive: false }} />
      <ClickToPick onPick={onPick} />
      <FitToRoutes result={result} detent={detent} fitSignal={fitSignal} />

      {showLayer &&
        result?.layer.litWays.map((way, i) => (
          <Polyline key={`way-${i}`} positions={way.coords.map(toLatLng)} pathOptions={{ ...LIT_STYLE[way.lit], weight: 1.5, opacity: 0.3, interactive: false }} />
        ))}
      {showLayer &&
        result?.layer.lamps.map((lamp, i) => (
          <CircleMarker key={`lamp-${i}`} center={toLatLng(lamp)} radius={2.5} pathOptions={{ color: "#ffb347", weight: 0, fillOpacity: 0.45, interactive: false }} />
        ))}

      {routes
        .filter((route) => route.id !== selectedRouteId)
        .map((route) => (
          <Polyline
            key={route.id}
            positions={route.geometry.coordinates.map(toLatLng)}
            pathOptions={{ color: "#e8ecf4", weight: 4, opacity: 0.35 }}
            eventHandlers={{ click: () => onSelectRoute(route.id) }}
          />
        ))}

      {selected && <Polyline positions={selected.geometry.coordinates.map(toLatLng)} pathOptions={{ color: "#0b0f17", weight: 9, opacity: 0.9, interactive: false }} />}
      {selected?.segments.map((segment, i) => (
        <Polyline key={`${selected.id}-${i}`} positions={segment.coords.map(toLatLng)} pathOptions={{ ...LIT_STYLE[segment.lit], weight: 5, lineCap: "butt", interactive: false }} />
      ))}
      {selected?.lamps.map((lamp) => (
        <CircleMarker
          key={lamp.id}
          center={toLatLng(lamp.coord)}
          radius={5}
          pathOptions={{ color: "#ffb347", weight: 2, fillColor: "#ffb347", fillOpacity: lamp.status === "attributed" ? 1 : 0, interactive: false }}
        />
      ))}

      {origin && <Marker position={[origin.lat, origin.lon]} icon={endpointIcon("A")} interactive={false} />}
      {destination && <Marker position={[destination.lat, destination.lon]} icon={endpointIcon("B")} interactive={false} />}
    </MapContainer>
  );
}
