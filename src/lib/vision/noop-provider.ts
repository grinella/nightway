import type { VisionProvider } from "@/lib/vision/types";

/** Provider di default: nessuna osservazione visiva, mai detection inventate. */
export const noopVisionProvider: VisionProvider = {
  name: "noop",
  getDetections: async () => [],
};
