import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { userService } from '@/features/users/services/user.service';
import {
  UserResponse,
  CreateUserRequest,
  UpdateUserRequest,
} from '@/types/user.types';
import { UserTable } from '@/features/users/components/UserTable';
import { UserDetailModal } from '@/features/users/components/UserDetailModal';
import { UserFormModal } from '@/features/users/components/UserFormModal';
import { UserStatusModal } from '@/features/users/components/UserStatusModal';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { DashboardSkeleton } from '@/features/dashboard/components/DashboardSkeleton';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const isSystemAdmin = (currentUser?.roles || []).includes('ROLE_ADMIN');

  const [users, setUsers] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Modals state
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [formEditUser, setFormEditUser] = useState<UserResponse | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState<boolean>(false);
  const [statusTargetUser, setStatusTargetUser] = useState<UserResponse | null>(null);

  // Load user data
  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await userService.getAll();
      setUsers(data);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('Không tải được danh sách tài khoản. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Handle Form Submit (Create / Update)
  const handleFormSubmit = async (
    payload: CreateUserRequest | UpdateUserRequest,
    isEdit: boolean
  ) => {
    if (isEdit && formEditUser) {
      const updated = await userService.update(
        formEditUser.maNguoiDung,
        payload as UpdateUserRequest
      );
      setUsers((prev) =>
        prev.map((u) => (u.maNguoiDung === updated.maNguoiDung ? updated : u))
      );
    } else {
      const created = await userService.create(payload as CreateUserRequest);
      setUsers((prev) => [created, ...prev]);
    }
  };

  // Handle Status Toggle
  const handleStatusConfirm = async (id: number, nextStatus: boolean) => {
    const updated = await userService.updateStatus(id, nextStatus);
    setUsers((prev) =>
      prev.map((u) => (u.maNguoiDung === updated.maNguoiDung ? updated : u))
    );
  };

  // Metric summaries (filtered by actor view)
  const metrics = useMemo(() => {
    const visibleUsers = isSystemAdmin
      ? users
      : users.filter((u) => !u.roles?.includes('ROLE_ADMIN'));

    const total = visibleUsers.length;
    const active = visibleUsers.filter((u) => u.trangThai).length;
    const admins = users.filter((u) => u.roles?.includes('ROLE_ADMIN')).length;
    const managers = users.filter((u) => u.roles?.includes('ROLE_MANAGER')).length;
    const technicians = visibleUsers.filter((u) => u.roles?.includes('ROLE_TECHNICIAN')).length;
    const customers = visibleUsers.filter((u) => u.roles?.includes('ROLE_CUSTOMER')).length;

    return { total, active, admins, managers, technicians, customers };
  }, [users, isSystemAdmin]);

  if (isLoading && users.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            Tài Khoản & Phân Quyền
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
            Tạo tài khoản, gán vai trò và quản lý quyền truy cập.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {lastUpdated && (
            <span style={{ fontSize: '0.8rem', color: 'var(--color-outline)' }}>
              Cập nhật lúc: {lastUpdated}
            </span>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadUsers}
            disabled={isLoading}
          >
            <span className={`material-symbols-outlined ${isLoading ? 'animate-spin' : ''}`} style={{ fontSize: '18px' }}>
              refresh
            </span>
            <span>{isLoading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>

          <Button
            variant="primary"
            onClick={() => {
              setFormEditUser(null);
              setIsFormOpen(true);
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              person_add
            </span>
            <span>Thêm tài khoản</span>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger">
          <span className="material-symbols-outlined">error</span>
          <span style={{ flex: 1 }}>{error}</span>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
            onClick={loadUsers}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 4 Summary KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          label="Tổng Người Dùng"
          value={metrics.total}
          icon="group"
          colorTheme="default"
          trend={isSystemAdmin ? 'Toàn hệ thống' : 'Phạm vi quản lý'}
          trendUp={true}
        />
        <KpiCard
          label="Đang Hoạt Động"
          value={metrics.active}
          icon="check_circle"
          colorTheme="green"
          trend={`Tỉ lệ ${metrics.total > 0 ? Math.round((metrics.active / metrics.total) * 100) : 0}%`}
          trendUp={true}
        />
        {isSystemAdmin ? (
          <KpiCard
            label="Quản Trị Viên (Admin)"
            value={metrics.admins}
            icon="shield_person"
            colorTheme="orange"
            trend="Quản trị hệ thống"
            trendUp={true}
          />
        ) : (
          <KpiCard
            label="Kỹ Thuật Viên"
            value={metrics.technicians}
            icon="engineering"
            colorTheme="orange"
            trend="Nhân viên sửa chữa"
            trendUp={true}
          />
        )}
        {isSystemAdmin ? (
          <KpiCard
            label="Quản Lý Chi Nhánh"
            value={metrics.managers}
            icon="store_mall_directory"
            colorTheme="slate"
            trend="Phụ trách chi nhánh"
            trendUp={true}
          />
        ) : (
          <KpiCard
            label="Khách Hàng"
            value={metrics.customers}
            icon="groups"
            colorTheme="slate"
            trend="Tài khoản khách hàng"
            trendUp={true}
          />
        )}
      </div>

      {/* Main Table */}
      <UserTable
        users={users}
        onView={(u) => {
          setSelectedUser(u);
          setIsDetailOpen(true);
        }}
        onEdit={(u) => {
          setFormEditUser(u);
          setIsFormOpen(true);
        }}
        onToggleStatus={(u) => {
          setStatusTargetUser(u);
          setIsStatusOpen(true);
        }}
      />

      {/* Modals */}
      <UserDetailModal
        user={selectedUser}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedUser(null);
        }}
        onEdit={(u) => {
          setFormEditUser(u);
          setIsFormOpen(true);
        }}
      />

      <UserFormModal
        user={formEditUser}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setFormEditUser(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <UserStatusModal
        user={statusTargetUser}
        isOpen={isStatusOpen}
        onClose={() => {
          setIsStatusOpen(false);
          setStatusTargetUser(null);
        }}
        onConfirm={handleStatusConfirm}
      />
    </div>
  );
};
