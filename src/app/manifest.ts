import type { MetadataRoute } from "next";

/** Rende NIGHTWAY installabile sulla schermata Home del telefono, a tutto schermo. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NIGHTWAY",
    short_name: "NIGHTWAY",
    description: "Confronta i percorsi a piedi su ciò che la mappa documenta, e vedi dove i dati mancano.",
    lang: "it",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0f17",
    theme_color: "#0b0f17",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
