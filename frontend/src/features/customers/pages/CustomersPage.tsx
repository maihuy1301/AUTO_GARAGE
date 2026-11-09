import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { customerService } from '@/features/customers/services/customer.service';
import {
  CustomerResponse,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from '@/types/customer.types';
import { VehicleResponse } from '@/types/vehicle.types';
import { CustomerTable } from '@/features/customers/components/CustomerTable';
import { CustomerDetailModal } from '@/features/customers/components/CustomerDetailModal';
import { CustomerFormModal } from '@/features/customers/components/CustomerFormModal';
import { CustomerStatusModal } from '@/features/customers/components/CustomerStatusModal';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { DashboardSkeleton } from '@/features/dashboard/components/DashboardSkeleton';
import { Button } from '@/components/common/Button';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Modals state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [formEditCustomer, setFormEditCustomer] = useState<CustomerResponse | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState<boolean>(false);
  const [statusTargetCustomer, setStatusTargetCustomer] = useState<CustomerResponse | null>(null);

  // Load customer and vehicle data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [custList, vehList] = await Promise.all([
        customerService.getAll(),
        customerService.getVehicles().catch(() => []),
      ]);

      setCustomers(custList);
      setVehicles(vehList);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('Không tải được danh sách khách hàng. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Form Submit (Create / Update)
  const handleFormSubmit = async (
    payload: CreateCustomerRequest | UpdateCustomerRequest,
    isEdit: boolean
  ) => {
    if (isEdit && formEditCustomer) {
      const updated = await customerService.update(
        formEditCustomer.maKhachHang,
        payload as UpdateCustomerRequest
      );
      setCustomers((prev) =>
        prev.map((c) => (c.maKhachHang === updated.maKhachHang ? updated : c))
      );
    } else {
      const created = await customerService.create(payload as CreateCustomerRequest);
      setCustomers((prev) => [created, ...prev]);
    }
  };

  // Handle Status Toggle
  const handleStatusConfirm = async (id: number, nextStatus: boolean) => {
    const updated = await customerService.updateStatus(id, nextStatus);
    setCustomers((prev) =>
      prev.map((c) => (c.maKhachHang === updated.maKhachHang ? updated : c))
    );
  };

  // Metric summaries
  const metrics = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.trangThai !== false).length;
    const withAccount = customers.filter((c) => c.tenDangNhap).length;
    const totalVehicles = vehicles.length;

    return { total, active, withAccount, totalVehicles };
  }, [customers, vehicles]);

  if (isLoading && customers.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            Quản Lý Khách Hàng
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
            Xem hồ sơ, thông tin liên hệ và xe của khách hàng.
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
            onClick={loadData}
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
              setFormEditCustomer(null);
              setIsFormOpen(true);
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              person_add
            </span>
            <span>Thêm khách hàng</span>
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
            onClick={loadData}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 4 Summary KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          label="Tổng Khách Hàng"
          value={metrics.total}
          icon="groups"
          colorTheme="default"
          trend="Hồ sơ khách hàng"
          trendUp={true}
        />
        <KpiCard
          label="Đang Hoạt Động"
          value={metrics.active}
          icon="verified_user"
          colorTheme="green"
          trend={`Tỉ lệ ${metrics.total > 0 ? Math.round((metrics.active / metrics.total) * 100) : 0}%`}
          trendUp={true}
        />
        <KpiCard
          label="Tài Khoản Đã Tạo"
          value={metrics.withAccount}
          icon="account_circle"
          colorTheme="orange"
          trend="Đã liên kết tài khoản"
          trendUp={true}
        />
        <KpiCard
          label="Xe Đã Đăng Ký"
          value={metrics.totalVehicles}
          icon="directions_car"
          colorTheme="slate"
          trend="Xe của khách hàng"
          trendUp={true}
        />
      </div>

      {/* Customer Table */}
      <CustomerTable
        customers={customers}
        onView={(cust) => {
          setSelectedCustomer(cust);
          setIsDetailOpen(true);
        }}
        onEdit={(cust) => {
          setFormEditCustomer(cust);
          setIsFormOpen(true);
        }}
        onToggleStatus={(cust) => {
          setStatusTargetCustomer(cust);
          setIsStatusOpen(true);
        }}
      />

      {/* Modals */}
      <CustomerDetailModal
        customer={selectedCustomer}
        vehicles={vehicles}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedCustomer(null);
        }}
        onEdit={(cust) => {
          setFormEditCustomer(cust);
          setIsFormOpen(true);
        }}
      />

      <CustomerFormModal
        customer={formEditCustomer}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setFormEditCustomer(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <CustomerStatusModal
        customer={statusTargetCustomer}
        isOpen={isStatusOpen}
        onClose={() => {
          setIsStatusOpen(false);
          setStatusTargetCustomer(null);
        }}
        onConfirm={handleStatusConfirm}
      />
    </div>
  );
};
