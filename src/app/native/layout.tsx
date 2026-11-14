import type { ReactNode } from "react";
import "./native.css";
import { NativeShell } from "@/components/layout/NativeShell";

export const metadata = { robots: { index: false } };

/** Schermate dell'app iOS: barra, pulsanti e pannelli sono nativi, qui c'è solo il contenuto. */
export default function NativeLayout({ children }: { children: ReactNode }) {
  return <NativeShell>{children}</NativeShell>;
}
