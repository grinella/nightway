"use client";

import { useRef, useState } from "react";

type State = "idle" | "loading" | "playing" | "error";

/** Voce del dispositivo: riserva gratuita e locale quando la sintesi ElevenLabs non è disponibile. */
function speakWithDevice(text: string, onEnd: () => void): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "it-IT";
  utterance.voice = window.speechSynthesis.getVoices().find((voice) => voice.lang.startsWith("it")) ?? null;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

async function fetchAudio(text: string): Promise<HTMLAudioElement> {
  const res = await fetch("/api/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
  if (!res.ok) throw new Error("Sintesi vocale non riuscita.");
  return new Audio(URL.createObjectURL(await res.blob()));
}

/** Legge un testo ad alta voce: ElevenLabs (tramite /api/speak) e, se non risponde, la voce del dispositivo. */
export function SpeakButton({ text, label = "Ascolta" }: { text: string; label?: string }) {
  const [state, setState] = useState<State>("idle");
  const [usedDevice, setUsedDevice] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  function stop() {
    audio.current?.pause();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setState("idle");
  }

  async function play() {
    setState("loading");
    setUsedDevice(false);
    try {
      const player = await fetchAudio(text);
      player.onended = () => setState("idle");
      audio.current = player;
      await player.play();
      setState("playing");
    } catch {
      const started = speakWithDevice(text, () => setState("idle"));
      setUsedDevice(started);
      setState(started ? "playing" : "error");
    }
  }

  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <button
        type="button"
        onClick={state === "playing" ? stop : play}
        disabled={state === "loading"}
        className="min-h-11 rounded-control border border-line px-3 hover:bg-raised disabled:opacity-60 lg:min-h-9"
      >
        {state === "loading" ? "Preparo l'audio…" : state === "playing" ? "Ferma" : label}
      </button>
      {state === "playing" && usedDevice && <span className="text-dim">Voce del dispositivo: la sintesi online non risponde.</span>}
      {state === "error" && (
        <span role="alert" className="text-alert">
          Lettura vocale non disponibile su questo dispositivo.
        </span>
      )}
    </span>
  );
}
