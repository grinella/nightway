"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";

export type Detent = "peek" | "half" | "full";

const ORDER: Detent[] = ["peek", "half", "full"];

/** Altezza in pixel di una posizione del pannello, per calcoli di trascinamento e inquadratura della mappa. */
export function detentHeight(detent: Detent, viewportHeight: number): number {
  if (detent === "peek") return 76;
  if (detent === "half") return Math.round(viewportHeight * 0.46);
  return Math.max(viewportHeight - 300, 320);
}

type Props = {
  detent: Detent;
  onDetentChange: (detent: Detent) => void;
  title: string;
  summary?: string;
  children: ReactNode;
};

/** Pannello sopra la mappa. Su telefono si trascina dall'intestazione tra tre posizioni (o si tocca per
 *  alzarlo e abbassarlo); su schermi larghi è una colonna fissa. */
export function BottomSheet({ detent, onDetentChange, title, summary, children }: Props) {
  const sheet = useRef<HTMLElement>(null);
  const drag = useRef<{ startY: number; startHeight: number; moved: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!sheet.current || window.matchMedia("(min-width: 1024px)").matches) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startY: event.clientY, startHeight: sheet.current.getBoundingClientRect().height, moved: 0 };
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || !sheet.current) return;
    const delta = drag.current.startY - event.clientY;
    drag.current.moved = delta;
    const min = detentHeight("peek", window.innerHeight);
    const max = detentHeight("full", window.innerHeight);
    sheet.current.style.setProperty("--sheet-h", `${Math.min(max, Math.max(min, drag.current.startHeight + delta))}px`);
  }

  function onPointerUp() {
    if (!drag.current || !sheet.current) return;
    const { moved } = drag.current;
    const height = sheet.current.getBoundingClientRect().height;
    drag.current = null;
    setDragging(false);
    sheet.current.style.removeProperty("--sheet-h");

    if (Math.abs(moved) < 6) {
      // Tocco senza trascinamento: alza se abbassato, altrimenti abbassa.
      onDetentChange(detent === "peek" ? "half" : "peek");
      return;
    }
    const nearest = ORDER.reduce((best, candidate) =>
      Math.abs(detentHeight(candidate, window.innerHeight) - height) < Math.abs(detentHeight(best, window.innerHeight) - height) ? candidate : best,
    );
    // Un gesto deciso che non supera la metà strada porta comunque alla posizione successiva.
    const step = nearest === detent && Math.abs(moved) > 40 ? Math.sign(moved) : 0;
    onDetentChange(ORDER[Math.min(2, Math.max(0, ORDER.indexOf(nearest) + step))]);
  }

  return (
    <section
      ref={sheet}
      aria-label={title}
      data-detent={detent}
      data-dragging={dragging}
      className="sheet glass glass-dense fixed inset-x-2 bottom-[calc(var(--safe-bottom)+4.75rem)] z-[1100] flex flex-col overflow-hidden rounded-[28px] lg:inset-x-auto lg:bottom-4 lg:left-4 lg:top-[9.25rem] lg:w-[24rem]"
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="shrink-0 cursor-grab touch-none select-none px-5 pb-3 pt-2 active:cursor-grabbing lg:cursor-auto lg:pt-4"
      >
        <span className="mx-auto mb-2 block h-1.5 w-10 rounded-full bg-white/35 lg:hidden" aria-hidden="true" />
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-bold">{title}</h2>
          {summary && <span className="text-sm text-dim">{summary}</span>}
        </div>
        <button
          type="button"
          aria-expanded={detent !== "peek"}
          onClick={() => onDetentChange(detent === "peek" ? "half" : "peek")}
          className="sr-only focus:not-sr-only lg:hidden"
        >
          {detent === "peek" ? "Alza il pannello" : "Abbassa il pannello"}
        </button>
      </div>
      <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 ${detent === "peek" ? "max-lg:invisible" : ""}`}>{children}</div>
    </section>
  );
}
