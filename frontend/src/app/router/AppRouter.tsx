import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleGuard } from './RoleGuard';

import { EmployeesPage } from '@/features/employees/pages/EmployeesPage';
import { CustomersPage } from '@/features/customers/pages/CustomersPage';
import { UsersPage } from '@/features/users/pages/UsersPage';
import { VehiclesPage } from '@/features/vehicles/pages/VehiclesPage';
import { BrandModelManagementPage } from '@/features/vehicles/pages/BrandModelManagementPage';
import { AppointmentsPage } from '@/features/appointments/pages/AppointmentsPage';
import { BranchesPage } from '@/features/branches/pages/BranchesPage';
import { ReceptionPage } from '@/features/reception/pages/ReceptionPage';
import { RepairOrdersPage } from '@/features/repair-orders/pages/RepairOrdersPage';
import { InvoicesPage } from '@/features/invoices/pages/InvoicesPage';
import { ServicesPage } from '@/features/services/pages/ServicesPage';
import { InventoryPage } from '@/features/inventory/pages/InventoryPage';
import { SupportChatPage } from '@/features/chat/pages/SupportChatPage';
import { RepairChatPage } from '@/features/repair-chat/components/RepairChatPage';
import { ReportsPage } from '@/features/reports/pages/ReportsPage';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

      {/* Protected Area */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="repair-orders/:id/chat" element={
          <RoleGuard roles={['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_FRONT_DESK']}><RepairChatPage /></RoleGuard>
        } />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Admin & Manager routes */}
        <Route
          path="branches"
          element={
            <RoleGuard roles={['ROLE_ADMIN']}>
              <BranchesPage />
            </RoleGuard>
          }
        />
        <Route
          path="users"
          element={
            <RoleGuard roles={['ROLE_ADMIN', 'ROLE_MANAGER']}>
              <UsersPage />
            </RoleGuard>
          }
        />

        {/* Manager & Admin routes */}
        <Route
          path="employees"
          element={
            <RoleGuard roles={['ROLE_ADMIN', 'ROLE_MANAGER']}>
              <EmployeesPage />
            </RoleGuard>
          }
        />
        <Route
          path="services"
          element={
            <RoleGuard roles={['ROLE_ADMIN', 'ROLE_MANAGER']}>
              <ServicesPage />
            </RoleGuard>
          }
        />
        <Route
          path="inventory"
          element={
            <RoleGuard roles={['ROLE_ADMIN', 'ROLE_MANAGER']}>
              <InventoryPage />
            </RoleGuard>
          }
        />
        <Route
          path="reports"
          element={
            <RoleGuard roles={['ROLE_ADMIN', 'ROLE_MANAGER']}>
              <ReportsPage />
            </RoleGuard>
          }
        />

        {/* Receptionist, Manager, Admin routes */}
        <Route
          path="reception"
          element={
            <RoleGuard roles={['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_FRONT_DESK']}>
              <ReceptionPage />
            </RoleGuard>
          }
        />
        <Route
          path="customers"
          element={
            <RoleGuard roles={['ROLE_ADMIN']}>
              <CustomersPage />
            </RoleGuard>
          }
        />

        {/* Common protected business routes */}
        <Route
          path="appointments"
          element={
            <RoleGuard roles={['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_FRONT_DESK']}>
              <AppointmentsPage />
            </RoleGuard>
          }
        />
        <Route
          path="repair-orders"
          element={
            <RoleGuard roles={['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_FRONT_DESK']}>
              <RepairOrdersPage />
            </RoleGuard>
          }
        />
        <Route
          path="vehicles"
          element={
            <RoleGuard roles={['ROLE_ADMIN', 'ROLE_MANAGER']}>
              <VehiclesPage />
            </RoleGuard>
          }
        />
        <Route
          path="brands-models"
          element={
            <RoleGuard roles={['ROLE_ADMIN', 'ROLE_MANAGER']}>
              <BrandModelManagementPage />
            </RoleGuard>
          }
        />
        <Route
          path="invoices"
          element={
            <RoleGuard roles={['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_FRONT_DESK']}>
              <InvoicesPage />
            </RoleGuard>
          }
        />
        <Route
          path="chat"
          element={<RoleGuard roles={['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_FRONT_DESK']}><SupportChatPage /></RoleGuard>}
        />
      </Route>

      {/* Error & Fallback Routes */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
