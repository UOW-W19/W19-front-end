export type ScannerTranslationSource =
  | "DICTIONARY"
  | "TRANSLATION_CACHE"
  | "TRANSLATION_API"
  | "FALLBACK";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedObject {
  id?: string;
  label: string;
  confidence: number;
  box?: BoundingBox;
  nativeWord: string;
  learningWord: string;
  languageCode: string;
  translationSource?: ScannerTranslationSource;
}

export interface ScanResult {
  scanSessionId?: string;
  detectedObjects: DetectedObject[];
}
