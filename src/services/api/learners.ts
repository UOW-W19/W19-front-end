// Nearby Learners API Service - Real backend integration
import type { NearbyLearner } from '@/types/meetup';
import { API_BASE_URL } from './config';
import { getStoredToken } from './auth';

// Backend response types (matching snake_case API)
interface BackendLearner {
  id: string;
  display_name: string;
  avatar_url?: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  languages: Array<{
    code: string;
    name: string;
    flag_emoji: string;
    proficiency: string;
    is_learning: boolean;
  }>;
}

interface BackendLearnersResponse {
  learners: BackendLearner[];
}

// Transform backend learner to frontend NearbyLearner
const transformLearner = (learner: BackendLearner): NearbyLearner => ({
  id: learner.id,
  displayName: learner.display_name,
  avatarUrl: learner.avatar_url,
  coordinates: {
    lat: learner.latitude,
    lng: learner.longitude,
  },
  languages: learner.languages.map(l => ({
    code: l.code,
    name: l.name,
    flagEmoji: l.flag_emoji,
    proficiency: l.proficiency,
    isLearning: l.is_learning
  })),
  distanceKm: learner.distance_km,
});

// Helper for API requests
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getStoredToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'Request failed';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
};

export interface GetNearbyLearnersParams {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  language?: string;
}

export const learnersApi = {
  async getNearbyLearners(params: GetNearbyLearnersParams): Promise<NearbyLearner[]> {
    const queryParams = new URLSearchParams();

    // Required params
    queryParams.set('latitude', String(params.latitude));
    queryParams.set('longitude', String(params.longitude));

    // Optional params
    if (params.radiusKm !== undefined) {
      queryParams.set('radius_km', String(params.radiusKm));
    }
    if (params.language) {
      queryParams.set('language', params.language);
    }

    const url = `/learners/nearby?${queryParams.toString()}`;
    console.log('[learnersApi] Fetching nearby learners:', url);

    const response = await apiRequest<BackendLearnersResponse>(url);
    console.log('[learnersApi] Raw response:', response);
    console.log('[learnersApi] Response type:', typeof response);
    console.log('[learnersApi] Has learners property:', 'learners' in response);

    // Defensive check for response format
    if (!response || typeof response !== 'object') {
      console.error('[learnersApi] Invalid response format:', response);
      return [];
    }

    if (!('learners' in response) || !Array.isArray(response.learners)) {
      console.error('[learnersApi] Response missing learners array:', response);
      return [];
    }

    console.log('[learnersApi] Learners count:', response.learners.length);
    return response.learners.map(transformLearner);
  },
};
