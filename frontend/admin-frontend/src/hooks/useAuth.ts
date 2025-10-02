import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { User } from '../types';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiService.verifyToken();
      if (response.success) {
        // Извлекаем информацию о пользователе из токена или используем статические данные
        setUser({ username: 'admin', role: 'admin' });
      } else {
        localStorage.removeItem('admin_token');
        setUser(null);
      }
    } catch (error) {
      localStorage.removeItem('admin_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await apiService.login({ username, password });
      
      if (response.success && response.data) {
        setUser({ username: response.data.user.username, role: 'admin' });
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };
};
