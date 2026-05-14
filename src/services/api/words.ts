import { API_BASE_URL } from './config';
import { getStoredToken } from './auth';

const apiRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...options.headers as Record<string, string>,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  if (!response.ok) throw new Error(response.statusText);
  if (response.status === 204) return {} as T;
  return response.json();
};

export interface SaveWordPayload {
  word: string;
  translation: string;
  languageCode: string;
  postId: string;
  context?: string;
}

export const wordsApi = {
  async saveWord(payload: SaveWordPayload): Promise<void> {
    await apiRequest('/words', {
      method: 'POST',
      body: JSON.stringify({
        word: payload.word,
        translation: payload.translation,
        language_code: payload.languageCode,
        source: 'POST',
        source_id: payload.postId,
        context: payload.context,
      }),
    });
  },
};
