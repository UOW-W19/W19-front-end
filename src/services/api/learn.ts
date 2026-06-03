// Learn API Service - integrates with Spring Boot backend
import { API_BASE_URL } from './config';
import { getStoredToken } from './auth';

// ============================================
// Types matching backend snake_case contract
// ============================================

export interface SavedWordResponse {
  id: string;
  word: string;
  translation: string;
  language_code: string;
  language_name: string;
  language_flag: string;
  source: 'POST' | 'MANUAL' | 'SCANNER' | 'STARTER';
  source_id?: string;
  context?: string;
  topic?: string;
  mastery_level: number;
  next_review?: string;
  created_at: string;
}

export interface CreateWordRequest {
  word: string;
  translation: string;
  language_code: string;
  source?: 'POST' | 'MANUAL' | 'SCANNER' | 'STARTER';
  source_id?: string;
  context?: string;
  topic?: string;
}

export interface UpdateWordRequest {
  translation?: string;
  mastery_level?: number;
  topic?: string;
}

export interface StartSessionRequest {
  session_size: 5 | 10 | 15;
  language_code?: string | null;
}

export interface PracticeSessionResponse {
  session_id: string;
  words: SessionWord[];
  started_at: string;
}

export interface SessionWord {
  id: string;
  word: string;
  translation: string;
  language_code: string;
  language_name: string;
  language_flag: string;
  mastery_level: number;
}

export interface SubmitResultRequest {
  word_id: string;
  is_correct: boolean;
  response_time_ms?: number;
}

export interface SubmitResultResponse {
  word_id: string;
  is_correct: boolean;
  old_mastery: number;
  new_mastery: number;
}

export interface CompleteSessionResponse {
  session_id: string;
  words_practiced: number;
  correct_count: number;
  accuracy: number;
  duration_seconds: number;
  results: SessionResult[];
}

export interface SessionResult {
  word_id: string;
  word: string;
  is_correct: boolean;
  old_mastery: number;
  new_mastery: number;
}

export interface PracticeHistoryResponse {
  session_id: string;
  words_practiced: number;
  correct_count: number;
  accuracy: number;
  duration_seconds: number;
  completed_at: string;
}

export interface LanguageStats {
  code: string;
  name: string;
  flag: string;
  word_count: number;
  average_mastery: number;
}

export interface MasteryDistribution {
  beginner: number;    // 0-25%
  learning: number;    // 26-50%
  familiar: number;    // 51-75%
  mastered: number;    // 76-100%
}

export interface LearningStatsResponse {
  total_words: number;
  average_mastery: number;
  languages: LanguageStats[];
  mastery_distribution: MasteryDistribution;
}

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path?: string;
}

// ============================================
// Helper to get auth token
// ============================================
const getAuthHeaders = (): HeadersInit => {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // Skip ngrok interstitial page
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

// ============================================
// Saved Words API
// ============================================

export const fetchSavedWords = async (params?: {
  language_code?: string;
  sort?: 'newest' | 'mastery_high' | 'mastery_low';
  page?: number;
  size?: number;
}): Promise<SavedWordResponse[]> => {
  const searchParams = new URLSearchParams();
  if (params?.language_code) searchParams.set('language', params.language_code); // Backend expects 'language' not 'language_code'
  if (params?.sort) searchParams.set('sort', params.sort);
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.size) searchParams.set('size', params.size.toString());
  
  const queryString = searchParams.toString();
  const url = `${API_BASE_URL}/words${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Failed to fetch words');
  }
  
  // Backend returns Spring Data Page object, extract content array
  const pageData = await response.json();
  return pageData.content || [];
};

export const fetchSavedWord = async (wordId: string): Promise<SavedWordResponse> => {
  const response = await fetch(`${API_BASE_URL}/words/${wordId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Failed to fetch word');
  }
  
  return response.json();
};

export const createSavedWord = async (data: CreateWordRequest): Promise<SavedWordResponse> => {
  const response = await fetch(`${API_BASE_URL}/words`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  if (response.status === 409) {
    throw new Error('Word already saved');
  }
  
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Failed to save word');
  }
  
  return response.json();
};

export const updateSavedWord = async (
  wordId: string, 
  data: UpdateWordRequest
): Promise<SavedWordResponse> => {
  const response = await fetch(`${API_BASE_URL}/words/${wordId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Failed to update word');
  }
  
  return response.json();
};

export const deleteSavedWord = async (wordId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/words/${wordId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Failed to delete word');
  }
};

// ============================================
// Practice Sessions API
// ============================================

export const startPracticeSession = async (
  data: StartSessionRequest
): Promise<PracticeSessionResponse> => {
  const response = await fetch(`${API_BASE_URL}/learn/sessions/start`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  if (response.status === 400) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Invalid session request');
  }
  
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Failed to start session');
  }
  
  return response.json();
};

export const submitPracticeResult = async (
  sessionId: string,
  data: SubmitResultRequest
): Promise<SubmitResultResponse> => {
  const response = await fetch(`${API_BASE_URL}/learn/sessions/${sessionId}/submit`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  
  if (response.status === 409) {
    throw new Error('Result already submitted for this word');
  }
  
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Failed to submit result');
  }
  
  return response.json();
};

export const completePracticeSession = async (
  sessionId: string
): Promise<CompleteSessionResponse> => {
  const response = await fetch(`${API_BASE_URL}/learn/sessions/${sessionId}/complete`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  
  if (response.status === 400) {
    throw new Error('Session already completed');
  }
  
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Failed to complete session');
  }
  
  return response.json();
};

export const fetchPracticeHistory = async (params?: {
  page?: number;
  size?: number;
}): Promise<PracticeHistoryResponse[]> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.size) searchParams.set('size', params.size.toString());
  
  const queryString = searchParams.toString();
  const url = `${API_BASE_URL}/learn/sessions${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Failed to fetch practice history');
  }
  
  // Backend returns Spring Data Page object, extract content array
  const pageData = await response.json();
  return pageData.content || [];
};

// ============================================
// Learning Stats API
// ============================================

export const fetchLearningStats = async (): Promise<LearningStatsResponse> => {
  const response = await fetch(`${API_BASE_URL}/learn/stats`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Failed to fetch learning stats');
  }
  
  return response.json();
};
