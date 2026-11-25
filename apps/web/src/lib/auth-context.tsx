'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserDto, AuthResponseDto } from '@mess/shared';
import { apiFetch, ApiClientError } from './api-client';

const ACTIVE_MESS_STORAGE_KEY = 'mm_active_mess_id';
const SESSION_INIT_TIMEOUT_MS = 5000;

interface AuthContextValue {
  user: UserDto | null;
  token: string | null;
  activeMessId: string | null;
  isLoading: boolean;
  apiUnreachable: boolean;
  retrySession: () => Promise<void>;
  login: (data: AuthResponseDto) => void;
  logout: () => Promise<void>;
  setActiveMessId: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Provides authenticated user session state with strict timeout protection
 * so the application never remains stuck on an endless loading screen.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeMessId, setActiveMessIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiUnreachable, setApiUnreachable] = useState(false);

  const initSession = useCallback(async () => {
    setIsLoading(true);
    setApiUnreachable(false);

    let finished = false;
    const failsafe = setTimeout(() => {
      if (!finished) {
        finished = true;
        setApiUnreachable(true);
        setIsLoading(false);
      }
    }, SESSION_INIT_TIMEOUT_MS + 500);

    try {
      const data = await apiFetch<AuthResponseDto>('/auth/refresh', {
        method: 'POST',
        timeoutMs: SESSION_INIT_TIMEOUT_MS
      });
      if (finished) return;
      setUser(data.user);
      setToken(data.accessToken);
      const savedMessId =
        typeof window !== 'undefined' ? window.localStorage.getItem(ACTIVE_MESS_STORAGE_KEY) : null;
      if (savedMessId) {
        setActiveMessIdState(savedMessId);
      } else if (data.activeMessId) {
        setActiveMessIdState(data.activeMessId);
      }
    } catch (err: unknown) {
      if (finished) return;
      setUser(null);
      setToken(null);
      if (
        err instanceof ApiClientError &&
        (err.statusCode >= 500 || err.errorCode === 'NETWORK_ERROR')
      ) {
        setApiUnreachable(true);
      }
    } finally {
      if (!finished) {
        finished = true;
        clearTimeout(failsafe);
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    initSession();
  }, [initSession]);

  const login = (data: AuthResponseDto) => {
    setApiUnreachable(false);
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
      await apiFetch('/auth/logout', { method: 'POST', timeoutMs: 3000 }, token || undefined);
    } catch {
      // Ignored on logout
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
        apiUnreachable,
        retrySession: initSession,
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
