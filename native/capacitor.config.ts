import type { CapacitorConfig } from "@capacitor/cli";

/** L'app nativa è un involucro: mostra l'app web pubblicata, così API e dati restano gli stessi. */
const config: CapacitorConfig = {
  appId: "app.nightway.demo",
  appName: "NIGHTWAY",
  webDir: "www",
  backgroundColor: "#0b0f17",
  server: { url: "https://nightway.vercel.app", allowNavigation: ["nightway.vercel.app"] },
  ios: { contentInset: "never", backgroundColor: "#0b0f17" },
};

export default config;
