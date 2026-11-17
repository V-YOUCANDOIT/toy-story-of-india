import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setSessionFallbackToken } from '../services/api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get<{ user: User | null }>('/api/auth/session');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<User> => {
    const data = await api.post<{ user: User; token?: string }>('/api/auth/login', {
      email,
      password,
    });
    if (data.token) {
      setSessionFallbackToken(data.token);
    }
    setUser(data.user);
    return data.user;
  };

  const register = async (payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<User> => {
    const data = await api.post<{ user: User; token?: string }>(
      '/api/auth/register',
      payload
    );
    if (data.token) {
      setSessionFallbackToken(data.token);
    }
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await api.post('/api/auth/logout');
    setSessionFallbackToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
