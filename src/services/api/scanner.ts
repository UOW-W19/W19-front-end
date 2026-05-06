import { API_BASE_URL } from './config';
import { getStoredToken } from './auth';
import type { DetectedObject } from '@/types/scanner';

interface BackendDetectedObject {
  label: string;
  confidence: number;
  native_word: string;
  learning_word: string;
  language_code: string;
}

interface BackendScanResponse {
  detected_objects: BackendDetectedObject[];
}

const transformDetectedObject = (object: BackendDetectedObject): DetectedObject => ({
  label: object.label,
  confidence: object.confidence,
  nativeWord: object.native_word,
  learningWord: object.learning_word,
  languageCode: object.language_code,
});

export const scanImage = async (image: File): Promise<DetectedObject[]> => {
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
    let message = 'Failed to scan image';
    try {
      const error = await response.json();
      message = error.message || error.error || message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  const data: BackendScanResponse = await response.json();
  return (data.detected_objects ?? []).map(transformDetectedObject);
};

export const scannerApi = {
  scanImage,
};
