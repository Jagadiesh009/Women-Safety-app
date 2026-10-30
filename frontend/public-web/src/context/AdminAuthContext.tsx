import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import type { AdminUser } from '../types';

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  token: string | null;
  isAdminAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  loginAdmin: (adminId: string, password: string) => Promise<boolean>;
  logoutAdmin: () => void;
  clearError: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  adminUser: null,
  token: null,
  isAdminAuthenticated: false,
  isLoading: true,
  error: null,
  loginAdmin: async () => false,
  logoutAdmin: () => {},
  clearError: () => {},
});

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const cached = localStorage.getItem('safeher_admin_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('safeher_admin_token');
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Validate admin token on startup
  useEffect(() => {
    const initAdmin = async () => {
      const storedToken = localStorage.getItem('safeher_admin_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const user = await adminApi.getMe();
        if (user && user.role === 'ADMIN') {
          setAdminUser(user);
          setToken(storedToken);
          localStorage.setItem('safeher_admin_user', JSON.stringify(user));
        } else {
          throw new Error('Not authorized as an administrator.');
        }
      } catch (err: any) {
        console.warn('[AdminAuth] Admin session invalid or expired:', err);
        localStorage.removeItem('safeher_admin_token');
        localStorage.removeItem('safeher_admin_user');
        setAdminUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAdmin();
  }, []);

  const loginAdmin = async (adminId: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.login(adminId, password);
      if (!res.access_token) {
        throw new Error('Authentication failed: Missing administrative token.');
      }

      localStorage.setItem('safeher_admin_token', res.access_token);
      setToken(res.access_token);

      // Verify and fetch admin details
      const user = await adminApi.getMe();
      if (!user || user.role !== 'ADMIN') {
        localStorage.removeItem('safeher_admin_token');
        throw new Error('Access denied: Account does not possess an authorized ADMIN role.');
      }

      setAdminUser(user);
      localStorage.setItem('safeher_admin_user', JSON.stringify(user));
      return true;
    } catch (err: any) {
      console.error('[AdminAuth] Login error:', err);
      const msg = err.message || 'Invalid administrative credentials.';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logoutAdmin = () => {
    localStorage.removeItem('safeher_admin_token');
    localStorage.removeItem('safeher_admin_user');
    setAdminUser(null);
    setToken(null);
    setError(null);
  };

  const isAdminAuthenticated = !!token && !!adminUser && adminUser.role === 'ADMIN';

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        token,
        isAdminAuthenticated,
        isLoading,
        error,
        loginAdmin,
        logoutAdmin,
        clearError,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext);
