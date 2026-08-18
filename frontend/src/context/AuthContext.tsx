import React, { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/client';
import { User } from '../types';
import { invalidation } from '../lib/invalidation';
import { authKeys } from '../lib/queryKeys';
import { AuthContext } from './authContextDef';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const currentUser = await authApi.getMe();
      setUser(currentUser);
      queryClient.setQueryData(authKeys.me(), currentUser);
    } catch (err: unknown) {
      console.warn('Session expired or invalid token:', err);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      invalidation.clearUserCacheOnLogout(queryClient);
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem('token', res.access_token);
    setToken(res.access_token);
    await fetchCurrentUser();
  };

  const register = async (name: string, email: string, password: string) => {
    await authApi.register({ name, email, password });
    await login(email, password);
  };

  /**
   * User Switch & Logout Security:
   * 1. Remove auth token
   * 2. Evict all user-sensitive cache data via invalidation matrix
   * 3. Reset local auth state
   * Ensures Student A's cached queries will NEVER be visible to Student B
   */
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    invalidation.clearUserCacheOnLogout(queryClient);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const isAuthenticated = !!user && user.status === 'ACTIVE';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
