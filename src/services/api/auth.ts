// Auth API Service - Real backend integration
import type { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  UserProfile,
  UpdateProfileRequest 
} from '@/types/api';
import { API_BASE_URL } from './config';

const TOKEN_KEY = 'locale_access_token';
const REFRESH_TOKEN_KEY = 'locale_refresh_token';
const USER_KEY = 'locale_user';

// Token management
export const getStoredToken = (): string | null => 
  localStorage.getItem(TOKEN_KEY);

export const getStoredRefreshToken = (): string | null => 
  localStorage.getItem(REFRESH_TOKEN_KEY);

export const getStoredUser = (): UserProfile | null => {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const storeAuth = (response: AuthResponse, user?: UserProfile) => {
  const token = response.accessToken;
  localStorage.setItem(TOKEN_KEY, token);
  if (response.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
  }
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else if (response.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
  }
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// Track if we're currently refreshing to avoid infinite loops
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

// Refresh token and return new access token
const performTokenRefresh = async (): Promise<string> => {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

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

  const data = await response.json();
  localStorage.setItem(TOKEN_KEY, data.access_token);
  if (data.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  }
  
  return data.access_token;
};

// Helper for API requests with automatic token refresh
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
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
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  // Handle 401 - try to refresh token and retry once
  if (response.status === 401 && !isRetry) {
    try {
      // Use a single refresh promise to avoid multiple simultaneous refreshes
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = performTokenRefresh();
      }
      
      await refreshPromise;
      isRefreshing = false;
      refreshPromise = null;
      
      // Retry the original request with the new token
      return apiRequest<T>(endpoint, options, true);
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
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json();
};

// Backend response types (matching snake_case API documentation)
interface BackendAuthResponse {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface BackendProfile {
  id: string | number;
  username?: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  latitude?: number;
  longitude?: number;
  languages?: Array<{
    code: string;
    name?: string;
    flag_emoji?: string;
    proficiency: string;
    is_learning?: boolean;
  }>;
  created_at?: string;
  roles?: string[];
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
}

// Transform backend profile to frontend UserProfile
const transformProfile = (profile: BackendProfile): UserProfile => {
  // Transform backend languages array to frontend format
  const languages = profile.languages?.map(l => ({
    code: l.code,
    name: l.name ?? l.code.toUpperCase(),
    flagEmoji: l.flag_emoji ?? '🏳️',
    proficiency: l.proficiency as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'NATIVE',
    isLearning: l.is_learning ?? false,
  })) ?? [];

  return {
    id: String(profile.id),
    email: profile.email,
    username: profile.username ?? profile.display_name?.toLowerCase().replace(/\s+/g, '_') ?? 'user',
    displayName: profile.display_name ?? profile.username ?? 'User',
    avatarUrl: profile.avatar_url,
    bio: profile.bio,
    latitude: profile.latitude,
    longitude: profile.longitude,
    location: profile.latitude && profile.longitude 
      ? `${profile.latitude}, ${profile.longitude}` 
      : undefined,
    createdAt: profile.created_at ?? new Date().toISOString(),
    languages,
    roles: profile.roles ?? [],
    followersCount: profile.followers_count ?? 0,
    followingCount: profile.following_count ?? 0,
    postsCount: profile.posts_count ?? 0,
  };
};

const buildUpdateProfileFormData = (data: UpdateProfileRequest) => {
  const formData = new FormData();

  if (data.avatar) {
    formData.append('avatar', data.avatar);
  }
  if (data.displayName !== undefined) {
    formData.append('displayName', data.displayName);
  }
  if (data.bio !== undefined) {
    formData.append('bio', data.bio);
  }
  if (data.latitude !== undefined) {
    formData.append('latitude', String(data.latitude));
  }
  if (data.longitude !== undefined) {
    formData.append('longitude', String(data.longitude));
  }

  return formData;
};

// Auth API functions
export const authApi = {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const authResponse = await apiRequest<BackendAuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        username: data.username ?? data.displayName.toLowerCase().replace(/\s+/g, '_'),
        password: data.password,
        display_name: data.displayName,
      }),
    });
    
    // Store token to fetch profile
    localStorage.setItem(TOKEN_KEY, authResponse.access_token);
    if (authResponse.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, authResponse.refresh_token);
    }
    
    // Fetch user profile
    const profile = await apiRequest<BackendProfile>('/users/me');
    const user = transformProfile(profile);
    
    return {
      userId: authResponse.user_id,
      accessToken: authResponse.access_token,
      refreshToken: authResponse.refresh_token,
      expiresIn: authResponse.expires_in,
      user,
    };
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    const authResponse = await apiRequest<BackendAuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        password: data.password,
      }),
    });
    
    // Store token to fetch profile
    localStorage.setItem(TOKEN_KEY, authResponse.access_token);
    if (authResponse.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, authResponse.refresh_token);
    }
    
    // Fetch user profile
    const profile = await apiRequest<BackendProfile>('/users/me');
    const user = transformProfile(profile);
    
    return {
      userId: authResponse.user_id,
      accessToken: authResponse.access_token,
      refreshToken: authResponse.refresh_token,
      expiresIn: authResponse.expires_in,
      user,
    };
  },

  async refreshToken(): Promise<AuthResponse> {
    const newToken = await performTokenRefresh();
    const storedUser = getStoredUser();
    
    return {
      userId: storedUser?.id ?? '',
      accessToken: newToken,
      refreshToken: getStoredRefreshToken() ?? '',
      expiresIn: 3600,
      user: storedUser ?? undefined,
    };
  },

  async logout(): Promise<void> {
    clearAuth();
  },

  async getProfile(): Promise<UserProfile> {
    let profile: BackendProfile;
    try {
      profile = await apiRequest<BackendProfile>('/users/me');
    } catch {
      // Fallback to legacy endpoint
      profile = await apiRequest<BackendProfile>('/profiles/me');
    }
    return transformProfile(profile);
  },

  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    let profile: BackendProfile;
    try {
      profile = await apiRequest<BackendProfile>('/users/me', {
        method: 'PATCH',
        body: buildUpdateProfileFormData(data),
      });
    } catch (error) {
      if (data.avatar) {
        throw error;
      }

      // Fallback: update locally if endpoint doesn't exist
      const storedUser = getStoredUser();
      if (!storedUser) {
        throw new Error('Not authenticated');
      }
      const localPatch = { ...data };
      delete localPatch.avatar;
      const updatedUser = { ...storedUser, ...localPatch };
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      return updatedUser;
    }
    
    const user = transformProfile(profile);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  },
};
