'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserDto, AuthResponseDto } from '@mess/shared';
import { apiFetch } from './api-client';

const ACTIVE_MESS_STORAGE_KEY = 'mm_active_mess_id';

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
    const initSession = async () => {
      try {
        const data = await apiFetch<AuthResponseDto>('/auth/refresh', { method: 'POST' });
        setUser(data.user);
        setToken(data.accessToken);
        const savedMessId =
          typeof window !== 'undefined'
            ? window.localStorage.getItem(ACTIVE_MESS_STORAGE_KEY)
            : null;
        if (savedMessId) {
          setActiveMessIdState(savedMessId);
        } else if (data.activeMessId) {
          setActiveMessIdState(data.activeMessId);
        }
      } catch {
        setUser(null);
        setToken(null);
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
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(ACTIVE_MESS_STORAGE_KEY, data.activeMessId);
      }
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
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(ACTIVE_MESS_STORAGE_KEY);
      }
    }
  };

  const setActiveMessId = (id: string) => {
    setActiveMessIdState(id);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_MESS_STORAGE_KEY, id);
    }
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
