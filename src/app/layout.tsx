import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NIGHTWAY — confronta i percorsi a piedi su ciò che la mappa documenta",
  description:
    "Confronta percorsi pedonali a Roma (Testaccio / Ostiense) su illuminazione dichiarata, punti luce mappati e copertura dei dati OpenStreetMap. Non valuta la sicurezza personale.",
  appleWebApp: { capable: true, title: "NIGHTWAY", statusBarStyle: "black-translucent" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#0b0f17", viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className="h-full antialiased">
      <body>{children}</body>
    </html>
  );
}
