import { API_BASE_URL } from './config';
import { getStoredToken } from './auth';
import type { BoundingBox, DetectedObject, ScanResult, ScannerTranslationSource } from '@/types/scanner';
import type { SavedWordResponse } from './learn';

interface BackendDetectedObject {
  id?: string;
  label: string;
  confidence: number;
  box?: BoundingBox;
  native_word: string;
  learning_word: string;
  language_code: string;
  translation_source?: ScannerTranslationSource;
}

interface BackendScanResponse {
  scan_session_id?: string;
  detected_objects: BackendDetectedObject[];
}

const transformDetectedObject = (object: BackendDetectedObject): DetectedObject => ({
  id: object.id,
  label: object.label,
  confidence: object.confidence,
  box: object.box,
  nativeWord: object.native_word,
  learningWord: object.learning_word,
  languageCode: object.language_code,
  translationSource: object.translation_source,
});

class ScannerApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ScannerApiError';
    this.status = status;
  }
}

const readErrorMessage = async (response: Response, fallback: string) => {
  try {
    const error = await response.json();
    return error.message || error.error || fallback;
  } catch {
    return response.statusText || fallback;
  }
};

export const scanImage = async (image: File): Promise<ScanResult> => {
  const formData = new FormData();
  formData.append('image', image);

  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}/scan`, {
    method: 'POST',
    headers: {
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const fallback = response.status === 503
      ? 'Object detection service unavailable'
      : 'Failed to scan image';
    throw new ScannerApiError(await readErrorMessage(response, fallback), response.status);
  }

  const data: BackendScanResponse = await response.json();
  return {
    scanSessionId: data.scan_session_id,
    detectedObjects: (data.detected_objects ?? []).map(transformDetectedObject),
  };
};

export const saveDetectedObject = async (detectionId: string): Promise<SavedWordResponse> => {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}/scan/detections/${detectionId}/save`, {
    method: 'POST',
    headers: {
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const fallback = response.status === 409
      ? 'Word already saved'
      : 'Failed to save word';
    throw new ScannerApiError(await readErrorMessage(response, fallback), response.status);
  }

  return response.json();
};

export const scannerApi = {
  scanImage,
  saveDetectedObject,
};
