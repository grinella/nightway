"use client";

import { useEffect, type ReactNode } from "react";
import { connectNativeShell } from "@/lib/app-state";

/** Avvolge le pagine mostrate dentro l'app iOS e le collega all'involucro nativo. */
export function NativeShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.shell = "native";
    connectNativeShell();
  }, []);
  return children;
}
