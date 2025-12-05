import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';

// ======================
// TYPES
// ======================

export type UserRole = 'tourist' | 'business_owner' | 'guide' | 'admin';

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  avatar?: string;
  isEmailVerified: boolean;
  guideProfile?: {
    bio?: string;
    languages?: string[];
    specialties?: string[];
    rate?: number;
    status: 'available' | 'on_tour' | 'unavailable';
    isVerified: boolean;
    phone?: string;
    messenger?: string;
  };
  stats: {
    reviewCount: number;
    contributionCount: number;
  };
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, username: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  loginWithGoogle: () => void;
  loginWithFacebook: () => void;
}

// ======================
// API CONFIG
// ======================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ======================
// CONTEXT
// ======================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ======================
// PROVIDER
// ======================

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  // Refresh access token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
        return true;
      }

      // Refresh failed, clear auth
      localStorage.removeItem('accessToken');
      setState(prev => ({ ...prev, user: null, isAuthenticated: false }));
      return false;
    } catch {
      return false;
    }
  }, []);

  // Helper to make authenticated requests
  const authFetch = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('accessToken');
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      credentials: 'include', // Include cookies for refresh token
    });

    // Handle token expiry
    if (response.status === 401) {
      const data = await response.json();
      if (data.code === 'TOKEN_EXPIRED') {
        // Try to refresh token
        const refreshed = await refreshToken();
        if (refreshed) {
          // Retry original request
          const newToken = localStorage.getItem('accessToken');
          return fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              ...(newToken && { Authorization: `Bearer ${newToken}` }),
              ...options.headers,
            },
            credentials: 'include',
          });
        }
      }
    }

    return response;
  }, [refreshToken]);

  // Fetch current user on mount
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const response = await authFetch('/auth/me');
      
      if (response.ok) {
        const data = await response.json();
        setState({
          user: data.user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
      } else {
        localStorage.removeItem('accessToken');
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        });
      }
    } catch {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to fetch user',
      }));
    }
  }, [authFetch]);

  // Initialize auth state
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Check for OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === 'success') {
      // OAuth login successful, refresh user
      refreshUser();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refreshUser]);

  // Login with email/password
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('accessToken', data.accessToken);
        setState({
          user: data.user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
        return true;
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: data.error || 'Login failed',
      }));
      return false;
    } catch {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Network error. Please try again.',
      }));
      return false;
    }
  }, []);

  // Register new user
  const register = useCallback(async (email: string, password: string, username: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, username }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('accessToken', data.accessToken);
        setState({
          user: data.user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
        return true;
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: data.error || 'Registration failed',
      }));
      return false;
    } catch {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Network error. Please try again.',
      }));
      return false;
    }
  }, []);

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore errors, clear local state anyway
    }

    localStorage.removeItem('accessToken');
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // OAuth redirects
  const loginWithGoogle = useCallback(() => {
    window.location.href = `${API_URL}/auth/google`;
  }, []);

  const loginWithFacebook = useCallback(() => {
    window.location.href = `${API_URL}/auth/facebook`;
  }, []);

  const value: AuthContextType = useMemo(() => ({
    ...state,
    login,
    register,
    logout,
    refreshUser,
    clearError,
    loginWithGoogle,
    loginWithFacebook,
  }), [state, login, register, logout, refreshUser, clearError, loginWithGoogle, loginWithFacebook]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ======================
// HOOK
// ======================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ======================
// EXPORT AUTH FETCH FOR API SERVICE
// ======================

export const getAuthToken = (): string | null => {
  return localStorage.getItem('accessToken');
};
