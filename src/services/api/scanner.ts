import { API_BASE_URL } from './config';
import { getStoredToken } from './auth';
import { prepareScannerDetections } from '@/lib/scannerPrecision';
import type { BoundingBox, DetectedObject, ScanResult, ScannerMode, ScannerTranslationSource } from '@/types/scanner';
import type { SavedWordResponse } from './learn';

export interface ScanPostImageOptions {
  imageIndex?: number;
  imageUrl?: string;
  scanMode?: ScannerMode;
}

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

const POST_IMAGE_NOT_AVAILABLE_ERROR = 'Post image is not stored in the configured object store';
const POST_IMAGE_NOT_AVAILABLE_MESSAGE = 'This post image is not available for scanning. Try an uploaded image.';

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
    const message = error.message || error.error || fallback;
    return message === POST_IMAGE_NOT_AVAILABLE_ERROR ? POST_IMAGE_NOT_AVAILABLE_MESSAGE : message;
  } catch {
    return response.statusText || fallback;
  }
};

export const scanImage = async (
  image: File,
  scanMode: ScannerMode = "precision"
): Promise<ScanResult> => {
  const formData = new FormData();
  formData.append('image', image);
  formData.append('scan_mode', scanMode);

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
    detectedObjects: prepareScannerDetections(
      (data.detected_objects ?? []).map(transformDetectedObject),
      scanMode
    ),
  };
};

export const scanPostImage = async (
  postId: string,
  options?: ScanPostImageOptions
): Promise<ScanResult> => {
  const token = getStoredToken();
  const scanMode = options?.scanMode ?? "precision";
  const body = options
    ? JSON.stringify({
        ...(options.imageIndex !== undefined ? { image_index: options.imageIndex } : {}),
        ...(options.imageUrl ? { image_url: options.imageUrl } : {}),
        scan_mode: scanMode,
      })
    : undefined;

  const response = await fetch(`${API_BASE_URL}/scan/post-image/${postId}`, {
    method: 'POST',
    headers: {
      'ngrok-skip-browser-warning': 'true',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
  });

  if (!response.ok) {
    const fallback = response.status === 503
      ? 'Object detection service unavailable'
      : 'Failed to scan post image';
    throw new ScannerApiError(await readErrorMessage(response, fallback), response.status);
  }

  const data: BackendScanResponse = await response.json();
  return {
    scanSessionId: data.scan_session_id,
    detectedObjects: prepareScannerDetections(
      (data.detected_objects ?? []).map(transformDetectedObject),
      scanMode
    ),
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
  scanPostImage,
  saveDetectedObject,
};
