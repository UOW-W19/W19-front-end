// Auth API Service - Mock implementation
import type { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  UserProfile,
  UpdateProfileRequest 
} from '@/types/api';
import { mockUsers, simulateDelay } from './config';

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

export const storeAuth = (response: AuthResponse) => {
  localStorage.setItem(TOKEN_KEY, response.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(response.user));
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// Generate mock JWT (in real app, this comes from backend)
const generateMockToken = (userId: string): string => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ 
    sub: userId, 
    iat: Date.now(), 
    exp: Date.now() + 24 * 60 * 60 * 1000 
  }));
  const signature = btoa('mock-signature');
  return `${header}.${payload}.${signature}`;
};

// Auth API functions
export const authApi = {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    await simulateDelay(800);
    
    // Check if email already exists
    const existing = Array.from(mockUsers.values()).find(u => u.email === data.email);
    if (existing) {
      throw new Error('Email already registered');
    }
    
    // Create new user
    const userId = `user-${Date.now()}`;
    const newUser: UserProfile & { password: string } = {
      id: userId,
      email: data.email,
      password: data.password,
      displayName: data.displayName,
      nativeLanguage: data.nativeLanguage,
      learningLanguages: data.learningLanguages,
      createdAt: new Date().toISOString(),
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
    };
    
    mockUsers.set(userId, newUser);
    
    const { password: _, ...userWithoutPassword } = newUser;
    
    return {
      accessToken: generateMockToken(userId),
      refreshToken: generateMockToken(userId + '-refresh'),
      expiresIn: 86400,
      user: userWithoutPassword,
    };
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    await simulateDelay(600);
    
    // Find user by email
    const user = Array.from(mockUsers.values()).find(u => u.email === data.email);
    
    if (!user || user.password !== data.password) {
      throw new Error('Invalid email or password');
    }
    
    const { password: _, ...userWithoutPassword } = user;
    
    return {
      accessToken: generateMockToken(user.id),
      refreshToken: generateMockToken(user.id + '-refresh'),
      expiresIn: 86400,
      user: userWithoutPassword,
    };
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    await simulateDelay(300);
    
    // In mock, just return the stored user with new tokens
    const storedUser = getStoredUser();
    if (!storedUser) {
      throw new Error('Session expired');
    }
    
    return {
      accessToken: generateMockToken(storedUser.id),
      refreshToken: generateMockToken(storedUser.id + '-refresh'),
      expiresIn: 86400,
      user: storedUser,
    };
  },

  async logout(): Promise<void> {
    await simulateDelay(200);
    clearAuth();
  },

  async getProfile(): Promise<UserProfile> {
    await simulateDelay(400);
    
    const storedUser = getStoredUser();
    if (!storedUser) {
      throw new Error('Not authenticated');
    }
    
    return storedUser;
  },

  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    await simulateDelay(500);
    
    const storedUser = getStoredUser();
    if (!storedUser) {
      throw new Error('Not authenticated');
    }
    
    const mockUser = mockUsers.get(storedUser.id);
    if (mockUser) {
      Object.assign(mockUser, data);
      const { password: _, ...updated } = mockUser;
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    }
    
    const updatedUser = { ...storedUser, ...data };
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    return updatedUser;
  },
};
