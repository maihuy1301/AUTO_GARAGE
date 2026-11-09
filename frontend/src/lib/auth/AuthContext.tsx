import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { CurrentUser, LoginRequest } from '@/types/auth.types';
import { RoleType } from '@/types/role.types';
import { tokenStorage } from './token-storage';
import { canAccessWeb, WEB_ACCESS_MESSAGE } from './web-access';
import { authService } from '@/features/auth/services/auth.service';
import { registerUnauthorizedHandler } from '@/lib/api/error-handler';

export interface AuthContextType {
  user: CurrentUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasRole: (role: RoleType) => boolean;
  hasAnyRole: (roles: RoleType[]) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [token, setToken] = useState<string | null>(() => tokenStorage.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    tokenStorage.removeToken();
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const currentToken = tokenStorage.getToken();
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const meData = await authService.getCurrentUser();
      if (!canAccessWeb(meData.roles)) throw new Error(WEB_ACCESS_MESSAGE);

      setUser({
        maNguoiDung: meData.maNguoiDung,
        tenDangNhap: meData.tenDangNhap,
        hoTen: meData.hoTen,
        email: meData.email,
        roles: meData.roles,
        maChiNhanh: meData.maChiNhanh,
        tenChiNhanh: meData.tenChiNhanh,
      });
      setError(null);
    } catch (err: unknown) {
      console.warn('Failed to fetch current user profile:', err);
      logout();
      setError(err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      logout();
    });
    refreshUser();
  }, [logout, refreshUser]);

  const login = async (credentials: LoginRequest): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const loginResponse = await authService.login(credentials);
      tokenStorage.setToken(loginResponse.accessToken);
      const meData = await authService.getCurrentUser();
      if (!canAccessWeb(meData.roles)) throw new Error(WEB_ACCESS_MESSAGE);
      setToken(loginResponse.accessToken);
      setUser({ ...meData, roles: meData.roles });
    } catch (err: unknown) {
      logout();
      const message = (err && typeof err === 'object' && 'message' in err)
        ? (err as { message: string }).message
        : 'Đăng nhập thất bại';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const hasRole = useCallback(
    (role: RoleType): boolean => {
      if (!user) return false;
      return user.roles.includes(role);
    },
    [user]
  );

  const hasAnyRole = useCallback(
    (roles: RoleType[]): boolean => {
      if (!user) return false;
      return roles.some((r) => user.roles.includes(r));
    },
    [user]
  );

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    error,
    login,
    logout,
    refreshUser,
    hasRole,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
