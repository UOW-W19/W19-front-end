import { useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { UserProfile, LoginRequest, RegisterRequest, UpdateProfileRequest } from '@/types/api';
import { authApi, getStoredToken, storeAuth } from '@/services/api';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Validate token by calling the backend
        const profile = await authApi.getProfile();
        setUser(profile);
      } catch {
        // Token is invalid or expired - clear auth
        console.warn('Session expired or invalid, clearing auth');
        clearAuth();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    const response = await authApi.login(data);
    if (response.user) {
      storeAuth(response, response.user);
      setUser(response.user);
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const response = await authApi.register(data);
    if (response.user) {
      storeAuth(response, response.user);
      setUser(response.user);
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: UpdateProfileRequest) => {
    const updatedUser = await authApi.updateProfile(data);
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
