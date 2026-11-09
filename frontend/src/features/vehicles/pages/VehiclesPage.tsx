import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { vehicleService } from '@/features/vehicles/services/vehicle.service';
import {
  VehicleResponse,
  CreateVehicleRequest,
  UpdateVehicleRequest,
} from '@/types/vehicle.types';
import { VehicleTable } from '@/features/vehicles/components/VehicleTable';
import { VehicleDetailModal } from '@/features/vehicles/components/VehicleDetailModal';
import { VehicleFormModal } from '@/features/vehicles/components/VehicleFormModal';
import { VehicleDeleteModal } from '@/features/vehicles/components/VehicleDeleteModal';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { DashboardSkeleton } from '@/features/dashboard/components/DashboardSkeleton';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import { RoleType } from '@/types/role.types';

export const VehiclesPage: React.FC = () => {
  const { user } = useAuth();
  const userRoles = (user?.roles || []) as RoleType[];
  const isAdmin = userRoles.includes('ROLE_ADMIN');

  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Modals state
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [formEditVehicle, setFormEditVehicle] = useState<VehicleResponse | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [deleteTargetVehicle, setDeleteTargetVehicle] = useState<VehicleResponse | null>(null);

  // Load vehicles from backend
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await vehicleService.getAll();
      setVehicles(data);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('Không tải được danh sách xe. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Form Submit (Create / Update)
  const handleFormSubmit = async (payload: CreateVehicleRequest | UpdateVehicleRequest) => {
    if (formEditVehicle) {
      const updated = await vehicleService.update(
        formEditVehicle.maXe,
        payload as UpdateVehicleRequest
      );
      setVehicles((prev) =>
        prev.map((v) => (v.maXe === updated.maXe ? updated : v))
      );
    } else {
      const created = await vehicleService.create(payload as CreateVehicleRequest);
      setVehicles((prev) => [created, ...prev]);
    }
  };

  // Handle Delete Confirmation
  const handleDeleteConfirm = async (vehicle: VehicleResponse) => {
    await vehicleService.delete(vehicle.maXe);
    setVehicles((prev) => prev.filter((v) => v.maXe !== vehicle.maXe));
  };

  // Metric summaries
  const metrics = useMemo(() => {
    const total = vehicles.length;
    const active = vehicles.filter((v) => v.trangThai !== false).length;

    const brandSet = new Set<string>();
    let totalKm = 0;
    vehicles.forEach((v) => {
      if (v.hangXe && v.hangXe.trim()) {
        brandSet.add(v.hangXe.trim());
      }
      if (v.soKmHienTai) {
        totalKm += v.soKmHienTai;
      }
    });

    const avgKm = total > 0 ? Math.round(totalKm / total) : 0;
    const brandCount = brandSet.size;

    return {
      total,
      active,
      brandCount,
      totalKm,
      avgKm,
    };
  }, [vehicles]);

  if (isLoading && vehicles.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            Quản Lý Phương Tiện
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
            {isAdmin
              ? 'Tra cứu thông tin xe và chủ xe.'
              : 'Xem và cập nhật thông tin các xe bạn đã đăng ký.'}
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
              setFormEditVehicle(null);
              setIsFormOpen(true);
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              add_circle
            </span>
            <span>Đăng ký xe mới</span>
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
          label={isAdmin ? 'Tổng Phương Tiện' : 'Xe Của Tôi'}
          value={metrics.total}
          icon="directions_car"
          colorTheme="default"
          trend={isAdmin ? 'Quản lý toàn hệ thống' : 'Đã đăng ký'}
          trendUp={true}
        />
        <KpiCard
          label="Đang Hoạt Động"
          value={metrics.active}
          icon="verified"
          colorTheme="green"
          trend={`Tỉ lệ ${metrics.total > 0 ? Math.round((metrics.active / metrics.total) * 100) : 0}%`}
          trendUp={true}
        />
        <KpiCard
          label="Hãng Xe"
          value={metrics.brandCount}
          icon="category"
          colorTheme="orange"
          trend="Hãng sản xuất"
          trendUp={true}
        />
        <KpiCard
          label={isAdmin ? 'ODO Trung Bình' : 'Tổng KM Tích Lũy'}
          value={isAdmin ? `${metrics.avgKm.toLocaleString('vi-VN')} km` : `${metrics.totalKm.toLocaleString('vi-VN')} km`}
          icon="speed"
          colorTheme="slate"
          trend={isAdmin ? 'Trung bình mỗi xe' : 'Tổng quãng đường'}
          trendUp={true}
        />
      </div>

      {/* Vehicle Table */}
      <VehicleTable
        vehicles={vehicles}
        isAdmin={isAdmin}
        onView={(vehicle) => {
          setSelectedVehicle(vehicle);
          setIsDetailOpen(true);
        }}
        onEdit={(vehicle) => {
          setFormEditVehicle(vehicle);
          setIsFormOpen(true);
        }}
        onDelete={(vehicle) => {
          setDeleteTargetVehicle(vehicle);
          setIsDeleteOpen(true);
        }}
      />

      {/* Modals */}
      <VehicleDetailModal
        vehicle={selectedVehicle}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedVehicle(null);
        }}
        onEdit={(vehicle) => {
          setFormEditVehicle(vehicle);
          setIsFormOpen(true);
        }}
      />

      <VehicleFormModal
        isOpen={isFormOpen}
        isAdmin={isAdmin}
        initialData={formEditVehicle}
        onClose={() => {
          setIsFormOpen(false);
          setFormEditVehicle(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <VehicleDeleteModal
        vehicle={deleteTargetVehicle}
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeleteTargetVehicle(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};
