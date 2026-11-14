"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { type GeoJSONSource, type LngLatBoundsLike, type Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { detentHeight, type Detent } from "@/components/layout/BottomSheet";
import { PILOT } from "@/lib/config";
import type { LonLat } from "@/lib/geo/planar";
import { LIT_STYLE, MAP_STYLE_URL, TILT } from "@/lib/map-config";
import type { Tour } from "@/lib/app-state";
import type { LatLon } from "@/lib/routing/types";
import type { RoutesResponse } from "@/lib/schemas/routes";

type Padding = { top: number; right: number; bottom: number; left: number };

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
  /** Spazio occupato dai comandi attorno alla mappa; se manca si calcola dal layout web. */
  fitPadding?: Padding;
  /** Vista inclinata con edifici in 3D (predefinita) oppure dall'alto. */
  tilted?: boolean;
  /** Volo di camera in corso lungo un percorso o una sua strada. */
  tour?: Tour | null;
  onTourEnd?: () => void;
  onPick: (point: LatLon) => void;
  onSelectRoute: (id: string) => void;
};

type Feature = GeoJSON.Feature;

const { south, west, north, east } = PILOT.bbox;
const PILOT_BOUNDS: LngLatBoundsLike = [[west, south], [east, north]];
const MAX_BOUNDS: LngLatBoundsLike = [[west - 0.02, south - 0.015], [east + 0.02, north + 0.015]];
const PILOT_RING: LonLat[] = [[west, south], [east, south], [east, north], [west, north], [west, south]];

const SOURCES = ["nw-pilot", "nw-around-ways", "nw-around-lamps", "nw-alt", "nw-selected", "nw-segments", "nw-lamps"] as const;
type SourceId = (typeof SOURCES)[number];

const line = (coords: LonLat[], properties: Record<string, unknown> = {}): Feature => ({
  type: "Feature",
  properties,
  geometry: { type: "LineString", coordinates: coords },
});
const point = (coord: LonLat, properties: Record<string, unknown> = {}): Feature => ({
  type: "Feature",
  properties,
  geometry: { type: "Point", coordinates: coord },
});
const collection = (features: Feature[]): GeoJSON.FeatureCollection => ({ type: "FeatureCollection", features });

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Padding del layout web: barra in alto, pannello e navigazione in basso (o colonna a sinistra su desktop). */
function webPadding(detent: Detent): Padding {
  if (window.matchMedia("(min-width: 1024px)").matches) return { top: 48, right: 88, bottom: 48, left: 432 };
  // Il pannello aperto del tutto lascia poca mappa: si inquadra come se fosse a metà.
  const sheet = detentHeight(detent === "full" ? "half" : detent, window.innerHeight);
  return { top: 150, right: 72, bottom: sheet + 110, left: 32 };
}

/** Tre layer per sorgente: il tratteggio non può dipendere dai dati, quindi si filtra per tipo di tratto. */
function addLitLines(map: MapLibreMap, source: SourceId, width: number, opacity: number) {
  const dashes = { solid: undefined, long: [2.8, 1.6], dot: [0.7, 1.7] } as const;
  for (const [dash, pattern] of Object.entries(dashes)) {
    map.addLayer({
      id: `${source}-${dash}`,
      type: "line",
      source,
      filter: ["==", ["get", "dash"], dash],
      layout: { "line-cap": "butt", "line-join": "round" },
      paint: { "line-color": ["get", "color"], "line-width": width, "line-opacity": opacity, ...(pattern ? { "line-dasharray": [...pattern] } : {}) },
    });
  }
}

/** Porta la base scura di OpenFreeMap nei toni del tema: strade e nomi leggibili, acqua blu notte. */
function tuneBaseStyle(map: MapLibreMap) {
  for (const layer of map.getStyle().layers) {
    const sourceLayer = "source-layer" in layer ? layer["source-layer"] : undefined;
    if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", "#0b0f17");
    else if (layer.type === "fill" && sourceLayer === "water") map.setPaintProperty(layer.id, "fill-color", "#13233d");
    else if (layer.type === "fill" && (sourceLayer === "landuse" || sourceLayer === "landcover")) map.setPaintProperty(layer.id, "fill-color", "#101a22");
    else if (layer.type === "fill" && sourceLayer === "building") map.setPaintProperty(layer.id, "fill-color", "#161d2b");
    else if (layer.type === "line" && sourceLayer === "transportation" && layer.id.startsWith("highway")) {
      const tone = layer.id.includes("casing") ? "#0b0f17" : layer.id.includes("major") || layer.id.includes("motorway") ? "#465270" : "#2f394f";
      map.setPaintProperty(layer.id, "line-color", tone);
    } else if (layer.type === "symbol" && layer.layout?.["text-field"]) {
      map.setPaintProperty(layer.id, "text-color", "#b4bdd0");
      map.setPaintProperty(layer.id, "text-halo-color", "#0b0f17");
      map.setPaintProperty(layer.id, "text-halo-width", 1.4);
    }
  }
}

function addLayers(map: MapLibreMap) {
  tuneBaseStyle(map);
  const firstLabel = map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
  map.addLayer(
    {
      id: "nw-buildings-3d",
      type: "fill-extrusion",
      source: "openmaptiles",
      "source-layer": "building",
      minzoom: 14,
      paint: {
        "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 8], 0, "#222c40", 40, "#3a4868"],
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], 8],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
        "fill-extrusion-opacity": 0.86,
      },
    },
    firstLabel,
  );

  for (const id of SOURCES) map.addSource(id, { type: "geojson", data: collection([]) });

  map.addLayer({ id: "nw-pilot", type: "line", source: "nw-pilot", paint: { "line-color": "#a3aec4", "line-width": 1, "line-dasharray": [2, 6] } });
  addLitLines(map, "nw-around-ways", 1.5, 0.4);
  map.addLayer({ id: "nw-around-lamps", type: "circle", source: "nw-around-lamps", paint: { "circle-radius": 2.5, "circle-color": "#ffb347", "circle-opacity": 0.5 } });
  map.addLayer({
    id: "nw-alt",
    type: "line",
    source: "nw-alt",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#e8ecf4", "line-width": 4, "line-opacity": 0.4 },
  });
  // Bersaglio largo e invisibile: su telefono una linea da 4 px non si tocca.
  map.addLayer({ id: "nw-alt-hit", type: "line", source: "nw-alt", paint: { "line-color": "#000", "line-width": 26, "line-opacity": 0 } });
  map.addLayer({
    id: "nw-selected",
    type: "line",
    source: "nw-selected",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#0b0f17", "line-width": 10, "line-opacity": 0.92 },
  });
  addLitLines(map, "nw-segments", 5.5, 1);
  map.addLayer({
    id: "nw-lamps-glow",
    type: "circle",
    source: "nw-lamps",
    filter: ["==", ["get", "status"], "attributed"],
    paint: { "circle-radius": 20, "circle-color": "#ffb347", "circle-opacity": 0.38, "circle-blur": 1 },
  });
  map.addLayer({
    id: "nw-lamps",
    type: "circle",
    source: "nw-lamps",
    paint: {
      "circle-radius": 4.5,
      "circle-color": "#ffb347",
      "circle-opacity": ["case", ["==", ["get", "status"], "attributed"], 1, 0],
      "circle-stroke-color": "#ffb347",
      "circle-stroke-width": 2,
    },
  });
}

const TO_RAD = Math.PI / 180;
const metersBetween = (a: LonLat, b: LonLat) => Math.hypot((b[0] - a[0]) * Math.cos(a[1] * TO_RAD), b[1] - a[1]) * 111_320;
const bearingBetween = (a: LonLat, b: LonLat) => Math.atan2((b[0] - a[0]) * Math.cos(a[1] * TO_RAD), b[1] - a[1]) / TO_RAD;

/** Linea misurata: restituisce il punto a una certa distanza dall'inizio. */
function measuredPath(coords: LonLat[]) {
  const marks = [0];
  for (let i = 1; i < coords.length; i++) marks.push(marks[i - 1] + metersBetween(coords[i - 1], coords[i]));
  const total = marks[marks.length - 1];
  function at(meters: number): LonLat {
    const d = Math.min(total, Math.max(0, meters));
    let i = 1;
    while (i < marks.length - 1 && marks[i] < d) i++;
    const span = marks[i] - marks[i - 1] || 1;
    const t = (d - marks[i - 1]) / span;
    return [coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t, coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t];
  }
  return { total, at };
}

/** Sorvola la linea con la camera bassa che segue la direzione di marcia; un globo fa da guida.
 *  Restituisce la funzione che interrompe il volo. */
function flyAlong(map: MapLibreMap, coords: LonLat[], padding: Padding, onDone: () => void) {
  const path = measuredPath(coords);
  // Il marcatore lo posiziona MapLibre: il globo sta in un elemento interno per non contendergli lo stile.
  const element = document.createElement("div");
  element.innerHTML = '<span class="guide-orb"><span></span></span>';
  const guide = new maplibregl.Marker({ element }).setLngLat(coords[0]).addTo(map);
  const duration = Math.min(20_000, Math.max(7_000, path.total * 13));
  const lookAhead = Math.max(40, path.total * 0.08);
  let frame = 0;
  let bearing = bearingBetween(coords[0], path.at(lookAhead));
  let startedAt = 0;
  let stopped = false;

  function stop() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    map.off("moveend", begin);
    guide.remove();
    for (const gesture of GESTURES) map.off(gesture, interrupt);
  }
  function interrupt() {
    stop();
    onDone();
  }
  function step(now: number) {
    startedAt ||= now;
    const progress = Math.min(1, (now - startedAt) / duration);
    const meters = progress * path.total;
    const here = path.at(meters);
    // La direzione cambia con dolcezza: agli incroci la camera curva, non scatta.
    const turn = ((bearingBetween(here, path.at(meters + lookAhead)) - bearing + 540) % 360) - 180;
    if (meters + 5 < path.total) bearing += turn * 0.045;
    guide.setLngLat(here);
    map.jumpTo({ center: here, bearing, pitch: 62, zoom: 17.4, padding });
    if (progress < 1) {
      frame = requestAnimationFrame(step);
      return;
    }
    stop();
    const bounds = coords.reduce((box, coord) => box.extend(coord), new maplibregl.LngLatBounds(coords[0], coords[0]));
    map.fitBounds(bounds, { padding, pitch: TILT.pitch, bearing: map.getBearing(), maxZoom: 17.5, duration: 1800 });
    onDone();
  }
  function begin() {
    if (!stopped) frame = requestAnimationFrame(step);
  }

  const GESTURES = ["dragstart", "wheel", "touchstart"] as const;
  for (const gesture of GESTURES) map.on(gesture, interrupt);
  // Prima il volo, poi l'ascolto: avviarlo chiude l'animazione precedente, che non deve far partire la guida.
  map.flyTo({ center: coords[0], bearing, pitch: 62, zoom: 17.4, padding, duration: 1600 });
  map.once("moveend", begin);
  return stop;
}

const litFeature = (coords: LonLat[], lit: keyof typeof LIT_STYLE) => line(coords, { color: LIT_STYLE[lit].color, dash: LIT_STYLE[lit].dash });

function endpointMarker(label: string, at: LatLon, map: MapLibreMap) {
  const element = document.createElement("span");
  element.className = "endpoint-marker";
  element.textContent = label;
  return new maplibregl.Marker({ element }).setLngLat([at.lon, at.lat]).addTo(map);
}

export default function RouteMap({ origin, destination, result, selectedRouteId, showLayer, detent, fitSignal, fitPadding, tilted = true, tour = null, onTourEnd, onPick, onSelectRoute }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  // Il tocco che interrompe un volo non deve anche scegliere un punto sulla mappa.
  const tourEndedAt = useRef(-Infinity);
  // Le callback e lo stato della camera si leggono da ref: la mappa si crea una volta sola.
  const latest = useRef({ onPick, onSelectRoute, onTourEnd, tilted, result, detent, fitPadding });
  useEffect(() => {
    latest.current = { onPick, onSelectRoute, onTourEnd, tilted, result, detent, fitPadding };
  });

  useEffect(() => {
    if (!container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: MAP_STYLE_URL,
      bounds: PILOT_BOUNDS,
      maxBounds: MAX_BOUNDS,
      minZoom: 13,
      maxPitch: 65,
      pitch: latest.current.tilted ? TILT.pitch : 0,
      bearing: latest.current.tilted ? TILT.bearing : 0,
      attributionControl: false,
    });
    mapRef.current = map;
    // In alto: su telefono il pannello copre il bordo inferiore e l'attribuzione deve restare visibile.
    map.addControl(new maplibregl.AttributionControl({ compact: false }), "top-left");
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");

    map.on("load", () => {
      addLayers(map);
      (map.getSource("nw-pilot") as GeoJSONSource).setData(collection([line(PILOT_RING)]));
      setReady(true);
    });
    map.on("click", (event) => {
      if (performance.now() - tourEndedAt.current < 600) return;
      const { x, y } = event.point;
      const hit = map.getLayer("nw-alt-hit") ? map.queryRenderedFeatures([[x - 4, y - 4], [x + 4, y + 4]], { layers: ["nw-alt-hit"] })[0] : undefined;
      const id = hit?.properties?.id;
      if (typeof id === "string") latest.current.onSelectRoute(id);
      else latest.current.onPick({ lat: event.lngLat.lat, lon: event.lngLat.lng });
    });

    return () => {
      mapRef.current = null;
      setReady(false);
      map.remove();
    };
  }, []);

  // Dati dei percorsi e del layer attorno.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const set = (id: SourceId, features: Feature[]) => (map.getSource(id) as GeoJSONSource).setData(collection(features));
    const routes = result?.routes ?? [];
    const selected = routes.find((route) => route.id === selectedRouteId);

    set("nw-around-ways", showLayer ? (result?.layer.litWays.map((way) => litFeature(way.coords, way.lit)) ?? []) : []);
    set("nw-around-lamps", showLayer ? (result?.layer.lamps.map((lamp) => point(lamp)) ?? []) : []);
    set("nw-alt", routes.filter((route) => route !== selected).map((route) => line(route.geometry.coordinates as LonLat[], { id: route.id })));
    set("nw-selected", selected ? [line(selected.geometry.coordinates as LonLat[])] : []);
    set("nw-segments", selected?.segments.map((segment) => litFeature(segment.coords, segment.lit)) ?? []);
    set("nw-lamps", selected?.lamps.map((lamp) => point(lamp.coord, { status: lamp.status })) ?? []);
  }, [ready, result, selectedRouteId, showLayer]);

  // Marcatori di partenza e arrivo.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const markers = [origin && endpointMarker("A", origin, map), destination && endpointMarker("B", destination, map)];
    return () => markers.forEach((marker) => marker && marker.remove());
  }, [ready, origin, destination]);

  // Inquadra i percorsi nella parte di mappa libera dai comandi, senza cambiare inclinazione.
  useEffect(() => {
    const map = mapRef.current;
    const coords = result?.routes.flatMap((route) => route.geometry.coordinates as LonLat[]) ?? [];
    if (!map || !ready || !coords.length) return;
    const bounds = coords.reduce((box, coord) => box.extend(coord), new maplibregl.LngLatBounds(coords[0], coords[0]));
    map.fitBounds(bounds, { padding: fitPadding ?? webPadding(detent), pitch: map.getPitch(), bearing: map.getBearing(), maxZoom: 17.5, animate: !reducedMotion() });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fitPadding è un oggetto: si confrontano i lati
  }, [ready, result, detent, fitSignal, fitPadding?.top, fitPadding?.right, fitPadding?.bottom, fitPadding?.left]);

  // Passaggio tra vista inclinata e dall'alto.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const camera = { pitch: tilted ? TILT.pitch : 0, bearing: tilted ? TILT.bearing : 0 };
    if (Math.abs(map.getPitch() - camera.pitch) < 0.5 && Math.abs(map.getBearing() - camera.bearing) < 0.5) return;
    if (reducedMotion()) map.jumpTo(camera);
    else map.easeTo({ ...camera, duration: 700 });
  }, [ready, tilted]);

  // Volo lungo il percorso (o lungo una sua strada) chiesto dall'assistente o dal pannello.
  useEffect(() => {
    const map = mapRef.current;
    const route = tour && latest.current.result?.routes.find((candidate) => candidate.id === tour.routeId);
    if (!map || !ready || !tour || !route) return;
    const stretch = tour.street ? route.segments.filter((segment) => segment.streetName === tour.street).flatMap((segment) => segment.coords) : [];
    const coords = (stretch.length > 1 ? stretch : route.geometry.coordinates) as LonLat[];
    const padding = latest.current.fitPadding ?? webPadding(latest.current.detent);
    const done = () => {
      tourEndedAt.current = performance.now();
      latest.current.onTourEnd?.();
    };
    if (reducedMotion()) {
      const bounds = coords.reduce((box, coord) => box.extend(coord), new maplibregl.LngLatBounds(coords[0], coords[0]));
      map.fitBounds(bounds, { padding, maxZoom: 17.5, animate: false });
      done();
      return;
    }
    return flyAlong(map, coords, padding, done);
  }, [ready, tour]);

  return <div ref={container} className="h-full w-full" />;
}
