import { API_BASE_URL } from './config';
import { clearAuth, getStoredRefreshToken, getStoredToken } from './auth';

// Must match the key constants in auth.ts
const TOKEN_KEY = 'locale_access_token';
const REFRESH_TOKEN_KEY = 'locale_refresh_token';

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

const performTokenRefresh = async (): Promise<string> => {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available');

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    clearAuth();
    throw new Error('Token refresh failed');
  }

  const data = await response.json() as Record<string, string>;
  localStorage.setItem(TOKEN_KEY, data.access_token);
  if (data.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  }
  return data.access_token;
};

export const authenticatedRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<T> => {
  const token = getStoredToken();
  const isMultipart = options.body instanceof FormData;

  const headers: HeadersInit = {
    'ngrok-skip-browser-warning': 'true',
    ...options.headers,
  };
  if (!isMultipart) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

  if (response.status === 401 && !isRetry) {
    try {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = performTokenRefresh();
      }
      await refreshPromise;
      isRefreshing = false;
      refreshPromise = null;
      return authenticatedRequest<T>(endpoint, options, true);
    } catch {
      isRefreshing = false;
      refreshPromise = null;
      clearAuth();
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearAuth();
      throw new Error('Session expired or unauthorized');
    }
    let errorMessage = 'Request failed';
    try {
      const errorData = await response.json() as Record<string, string>;
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) return {} as T;
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
};
