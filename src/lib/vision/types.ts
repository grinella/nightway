import type { Geometry } from "geojson";

export type VisionDetection = {
  className: string;
  confidence: number;
  geometry?: Geometry;
  imageId: string;
  capturedAt?: string;
  provider: string;
  licenseRef: string;
};

export interface VisionProvider {
  readonly name: string;
  getDetections(input: {
    /** W, S, E, N */
    bbox: [number, number, number, number];
    classes?: string[];
  }): Promise<VisionDetection[]>;
}
