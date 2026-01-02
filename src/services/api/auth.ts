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
const USER_KEY = 'locale_user';

// Token management
export const getStoredToken = (): string | null => 
  localStorage.getItem(TOKEN_KEY);

export const getStoredUser = (): UserProfile | null => {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const storeAuth = (response: AuthResponse) => {
  localStorage.setItem(TOKEN_KEY, response.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(response.user));
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// Helper for API requests
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getStoredToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
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
    if (response.status === 403) {
      clearAuth();
      throw new Error('Session expired or unauthorized');
    }
    
    let errorMessage = 'Request failed';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // Use status text if JSON parsing fails
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  
  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json();
};

// Backend response types (matching Spring Boot)
interface BackendAuthResponse {
  userId: number;
  accessToken: string;
}

interface BackendProfile {
  id: number;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  latitude?: number;
  longitude?: number;
  roles: string[];
}

// Transform backend profile to frontend UserProfile
const transformProfile = (profile: BackendProfile): UserProfile => ({
  id: String(profile.id),
  email: profile.email,
  displayName: profile.displayName,
  avatarUrl: profile.avatarUrl,
  bio: profile.bio,
  nativeLanguage: 'en', // Default - backend doesn't have this yet
  learningLanguages: [], // Default - backend doesn't have this yet
  location: profile.latitude && profile.longitude 
    ? `${profile.latitude}, ${profile.longitude}` 
    : undefined,
  createdAt: new Date().toISOString(), // Backend doesn't return this
  followersCount: 0, // Backend doesn't have this yet
  followingCount: 0, // Backend doesn't have this yet
  postsCount: 0, // Backend doesn't have this yet
});

// Auth API functions
export const authApi = {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    // Register user
    const authResponse = await apiRequest<BackendAuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        username: data.displayName.toLowerCase().replace(/\s+/g, '_'),
        password: data.password,
        displayName: data.displayName,
      }),
    });
    
    // Store token temporarily to fetch profile
    localStorage.setItem(TOKEN_KEY, authResponse.accessToken);
    
    // Fetch user profile
    const profile = await apiRequest<BackendProfile>('/profiles/me');
    const user = transformProfile(profile);
    
    return {
      accessToken: authResponse.accessToken,
      refreshToken: '', // Backend doesn't use refresh tokens
      expiresIn: 86400, // Default 24h
      user,
    };
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    // Login user
    const authResponse = await apiRequest<BackendAuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        password: data.password,
      }),
    });
    
    // Store token temporarily to fetch profile
    localStorage.setItem(TOKEN_KEY, authResponse.accessToken);
    
    // Fetch user profile
    const profile = await apiRequest<BackendProfile>('/profiles/me');
    const user = transformProfile(profile);
    
    return {
      accessToken: authResponse.accessToken,
      refreshToken: '', // Backend doesn't use refresh tokens
      expiresIn: 86400, // Default 24h
      user,
    };
  },

  async logout(): Promise<void> {
    clearAuth();
  },

  async getProfile(): Promise<UserProfile> {
    const profile = await apiRequest<BackendProfile>('/profiles/me');
    return transformProfile(profile);
  },

  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    // For now, update locally since backend may not have this endpoint yet
    const storedUser = getStoredUser();
    if (!storedUser) {
      throw new Error('Not authenticated');
    }
    
    const updatedUser = { ...storedUser, ...data };
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    return updatedUser;
  },
};
