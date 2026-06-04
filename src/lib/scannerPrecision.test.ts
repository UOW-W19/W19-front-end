import { describe, expect, test } from "vitest";
import {
  getScannerConfidenceLabel,
  prepareScannerDetections,
} from "./scannerPrecision";
import type { DetectedObject } from "@/types/scanner";

const detection = (label: string, confidence: number): DetectedObject => ({
  label,
  confidence,
  nativeWord: label,
  learningWord: label,
  languageCode: "en",
});

describe("scanner precision helpers", () => {
  test("filters unknown objects, sorts by confidence, and caps to two detections", () => {
    const result = prepareScannerDetections([
      detection("table", 0.052),
      detection("unknown object", 0.2),
      detection("lamp", 0.061),
      detection("chair", 0.058),
      detection(" UNKNOWN OBJECT ", 0.19),
    ]);

    expect(result).toHaveLength(2);
    expect(result.map((object) => object.label)).toEqual(["lamp", "chair"]);
  });

  test("scene mode caps sorted known detections to four", () => {
    const result = prepareScannerDetections([
      detection("table", 0.052),
      detection("unknown object", 0.2),
      detection("lamp", 0.061),
      detection("chair", 0.058),
      detection("menu board", 0.074),
      detection("plant pot", 0.069),
    ], "scene");

    expect(result).toHaveLength(4);
    expect(result.map((object) => object.label)).toEqual(["menu board", "plant pot", "lamp", "chair"]);
  });

  test("uses calibrated confidence labels instead of percent text", () => {
    expect(getScannerConfidenceLabel(0.061)).toBe("High confidence");
    expect(getScannerConfidenceLabel(0.045)).toBe("Good confidence");
    expect(getScannerConfidenceLabel(0.044)).toBe("Needs review");
    expect(getScannerConfidenceLabel(0.05)).not.toContain("%");
  });
});
