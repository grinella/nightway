import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible_Next({ variable: "--font-atkinson", subsets: ["latin"], adjustFontFallback: false });

export const metadata: Metadata = {
  title: "NIGHTWAY — confronta i percorsi a piedi su ciò che la mappa documenta",
  description:
    "Confronta percorsi pedonali a Roma (Testaccio / Ostiense) su illuminazione dichiarata, punti luce mappati e copertura dei dati OpenStreetMap. Non valuta la sicurezza personale.",
  appleWebApp: { capable: true, title: "NIGHTWAY", statusBarStyle: "black" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#0b0f17", viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${atkinson.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
