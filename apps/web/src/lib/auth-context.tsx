'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserDto, AuthResponseDto } from '@mess/shared';
import { apiFetch } from './api-client';

interface AuthContextValue {
  user: UserDto | null;
  token: string | null;
  activeMessId: string | null;
  isLoading: boolean;
  login: (data: AuthResponseDto) => void;
  logout: () => Promise<void>;
  setActiveMessId: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeMessId, setActiveMessIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Attempt silent refresh on startup using the httpOnly refresh cookie
    const initSession = async () => {
      try {
        const data = await apiFetch<AuthResponseDto>('/auth/refresh', { method: 'POST' });
        setUser(data.user);
        setToken(data.accessToken);
        if (data.activeMessId) {
          setActiveMessIdState(data.activeMessId);
        }
      } catch {
        // Unauthenticated session
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, []);

  const login = (data: AuthResponseDto) => {
    setUser(data.user);
    setToken(data.accessToken);
    if (data.activeMessId) {
      setActiveMessIdState(data.activeMessId);
    }
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' }, token || undefined);
    } catch {
      // Ignored
    } finally {
      setUser(null);
      setToken(null);
      setActiveMessIdState(null);
    }
  };

  const setActiveMessId = (id: string) => {
    setActiveMessIdState(id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeMessId,
        isLoading,
        login,
        logout,
        setActiveMessId
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
