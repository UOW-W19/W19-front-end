import type { DetectedObject } from "@/types/scanner";

export const MAX_SCANNER_DETECTIONS = 2;
export const UNKNOWN_SCANNER_LABEL = "unknown object";

const normalizeScannerLabel = (value: string) => value.trim().toLowerCase();

export const isKnownScannerObject = (object: DetectedObject) =>
  normalizeScannerLabel(object.label) !== UNKNOWN_SCANNER_LABEL;

export const getScannerConfidenceLabel = (confidence: number) => {
  if (confidence >= 0.06) return "High confidence";
  if (confidence >= 0.045) return "Good confidence";
  return "Needs review";
};

export const prepareScannerDetections = (objects: DetectedObject[]) =>
  objects
    .filter(isKnownScannerObject)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_SCANNER_DETECTIONS);
