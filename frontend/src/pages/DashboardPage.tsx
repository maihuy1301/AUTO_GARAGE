import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { RoleType } from '@/types/role.types';
import { AdminDashboard } from '@/features/dashboard/components/AdminDashboard';
import { ManagerDashboard } from '@/features/dashboard/components/ManagerDashboard';
import { ReceptionistDashboard } from '@/features/dashboard/components/ReceptionistDashboard';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const userRoles = (user?.roles || []) as RoleType[];

  if (userRoles.includes('ROLE_ADMIN')) {
    return <AdminDashboard />;
  }

  if (userRoles.includes('ROLE_MANAGER')) {
    return <ManagerDashboard />;
  }

  if (userRoles.includes('ROLE_FRONT_DESK')) {
    return <ReceptionistDashboard />;
  }

  return <Navigate to="/unauthorized" replace />;
};
