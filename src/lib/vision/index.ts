import { vision } from "@/lib/config";
import { noopVisionProvider } from "@/lib/vision/noop-provider";
import type { VisionDetection } from "@/lib/vision/types";

export type VisionStatus = {
  status: "disabled" | "unavailable";
  message: string;
  detections: VisionDetection[];
};

/** Stato delle osservazioni visive per la risposta dell'API.
 *  Nessun adapter reale è collegato: un provider Mapillary va aggiunto solo dopo aver verificato
 *  endpoint, classi, date, licenze e copertura dell'area pilota con un token autorizzato. */
export async function getVisionStatus(bbox: [number, number, number, number]): Promise<VisionStatus> {
  if (!vision.enabled) {
    return { status: "disabled", message: "Dati visivi non disponibili: modulo predisposto ma disattivato.", detections: [] };
  }
  const detections = await noopVisionProvider.getDetections({ bbox });
  return {
    status: "unavailable",
    message: "Dati visivi non disponibili: nessun provider di immagini autorizzato è collegato.",
    detections,
  };
}
