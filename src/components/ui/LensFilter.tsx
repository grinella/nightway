/** Mappa di spostamento a forma di lente: neutra al centro, piega la luce verso l'interno lungo i bordi.
 *  Il canale rosso sposta in orizzontale, il verde in verticale; `bandX`/`bandY` sono la larghezza del bordo in %. */
function lensMap(bandX: number, bandY: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><defs><linearGradient id='l' x1='0' x2='1'><stop offset='0' stop-color='rgb(255,0,0)'/><stop offset='1' stop-color='rgb(128,0,0)'/></linearGradient><linearGradient id='r' x1='0' x2='1'><stop offset='0' stop-color='rgb(128,0,0)'/><stop offset='1' stop-color='rgb(0,0,0)'/></linearGradient><linearGradient id='t' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='rgb(0,255,0)'/><stop offset='1' stop-color='rgb(0,128,0)'/></linearGradient><linearGradient id='b' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='rgb(0,128,0)'/><stop offset='1' stop-color='rgb(0,0,0)'/></linearGradient></defs><rect width='100' height='100' fill='rgb(128,0,0)'/><rect width='${bandX}' height='100' fill='url(#l)'/><rect x='${100 - bandX}' width='${bandX}' height='100' fill='url(#r)'/><g style='mix-blend-mode:screen'><rect width='100' height='100' fill='rgb(0,128,0)'/><rect width='100' height='${bandY}' fill='url(#t)'/><rect y='${100 - bandY}' width='100' height='${bandY}' fill='url(#b)'/></g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const LENSES = [
  { id: "nw-lens", bandX: 14, bandY: 30, scale: 40 },
  { id: "nw-lens-wide", bandX: 8, bandY: 8, scale: 44 },
];

/** Filtri di rifrazione usati dalle classi `.glass` e `.glass-dense` (vedi globals.css). */
export function LensFilter() {
  return (
    <svg width="0" height="0" aria-hidden="true" className="pointer-events-none absolute">
      {LENSES.map(({ id, bandX, bandY, scale }) => (
        <filter key={id} id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feImage href={lensMap(bandX, bandY)} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={scale} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      ))}
    </svg>
  );
}
