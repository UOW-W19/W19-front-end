import type { DetectedObject, ScannerMode } from "@/types/scanner";

export const MAX_SCANNER_DETECTIONS = 2;
export const SCENE_SCANNER_DETECTIONS = 4;
export const SCANNER_MODE_RESULT_LIMITS: Record<ScannerMode, number> = {
  precision: MAX_SCANNER_DETECTIONS,
  scene: SCENE_SCANNER_DETECTIONS,
};
export const UNKNOWN_SCANNER_LABEL = "unknown object";

const normalizeScannerLabel = (value: string) => value.trim().toLowerCase();

export const isKnownScannerObject = (object: DetectedObject) =>
  normalizeScannerLabel(object.label) !== UNKNOWN_SCANNER_LABEL;

export const getScannerConfidenceLabel = (confidence: number) => {
  if (confidence >= 0.06) return "High confidence";
  if (confidence >= 0.045) return "Good confidence";
  return "Needs review";
};

export const prepareScannerDetections = (
  objects: DetectedObject[],
  mode: ScannerMode = "precision"
) =>
  objects
    .filter(isKnownScannerObject)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, SCANNER_MODE_RESULT_LIMITS[mode]);
