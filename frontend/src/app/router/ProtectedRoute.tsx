import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loading } from '@/components/common/Loading';
import { canAccessWeb } from '@/lib/auth/web-access';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loading fullScreen message="Đang xác thực tài khoản..." />;
  }

  if (!isAuthenticated || !canAccessWeb(user?.roles)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};
