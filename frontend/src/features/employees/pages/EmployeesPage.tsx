import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { employeeService } from '@/features/employees/services/employee.service';
import {
  EmployeeResponse,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
} from '@/types/employee.types';
import { EmployeeTable } from '@/features/employees/components/EmployeeTable';
import { EmployeeDetailModal } from '@/features/employees/components/EmployeeDetailModal';
import { EmployeeFormModal } from '@/features/employees/components/EmployeeFormModal';
import { EmployeeStatusModal } from '@/features/employees/components/EmployeeStatusModal';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { DashboardSkeleton } from '@/features/dashboard/components/DashboardSkeleton';
import { Button } from '@/components/common/Button';

export const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Modals state
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [formEditEmployee, setFormEditEmployee] = useState<EmployeeResponse | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState<boolean>(false);
  const [statusTargetEmployee, setStatusTargetEmployee] = useState<EmployeeResponse | null>(null);

  // Load employee list from backend API
  const loadEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await employeeService.getAll();
      setEmployees(data);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('Không tải được danh sách nhân viên. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Handle Form Submit (Create / Update)
  const handleFormSubmit = async (
    payload: CreateEmployeeRequest | UpdateEmployeeRequest,
    isEdit: boolean
  ) => {
    if (isEdit && formEditEmployee) {
      const updated = await employeeService.update(
        formEditEmployee.maNhanVien,
        payload as UpdateEmployeeRequest
      );
      setEmployees((prev) =>
        prev.map((e) => (e.maNhanVien === updated.maNhanVien ? updated : e))
      );
    } else {
      const created = await employeeService.create(payload as CreateEmployeeRequest);
      setEmployees((prev) => [created, ...prev]);
    }
  };

  // Handle Status Update
  const handleStatusConfirm = async (id: number, nextStatus: boolean) => {
    const updated = await employeeService.updateStatus(id, nextStatus);
    setEmployees((prev) =>
      prev.map((e) => (e.maNhanVien === updated.maNhanVien ? updated : e))
    );
  };

  // Metric summaries
  const metrics = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.trangThai).length;
    const technicians = employees.filter(
      (e) => e.roles?.includes('ROLE_TECHNICIAN') || e.chucVu?.toLowerCase().includes('kỹ thuật')
    ).length;
    const receptionists = employees.filter(
      (e) => e.roles?.includes('ROLE_FRONT_DESK') || e.chucVu?.toLowerCase().includes('lễ tân')
    ).length;

    return { total, active, technicians, receptionists };
  }, [employees]);

  if (isLoading && employees.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            Quản Lý Nhân Viên
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
            Quản lý hồ sơ nhân viên, chi nhánh làm việc và chức vụ.
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
            onClick={loadEmployees}
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
              setFormEditEmployee(null);
              setIsFormOpen(true);
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              person_add
            </span>
            <span>Thêm nhân viên</span>
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
            onClick={loadEmployees}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 4 Summary KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          label="Tổng Nhân Sự"
          value={metrics.total}
          icon="badge"
          colorTheme="default"
          trend="Hồ sơ nhân sự"
          trendUp={true}
        />
        <KpiCard
          label="Đang Làm Việc"
          value={metrics.active}
          icon="how_to_reg"
          colorTheme="green"
          trend={`Tỉ lệ ${metrics.total > 0 ? Math.round((metrics.active / metrics.total) * 100) : 0}%`}
          trendUp={true}
        />
        <KpiCard
          label="Kỹ Thuật Viên"
          value={metrics.technicians}
          icon="engineering"
          colorTheme="orange"
          trend="Đội ngũ kỹ thuật"
          trendUp={true}
        />
        <KpiCard
          label="Lễ Tân / CSKH"
          value={metrics.receptionists}
          icon="support_agent"
          colorTheme="slate"
          trend="Tiếp đón khách hàng"
          trendUp={true}
        />
      </div>

      {/* Main Table */}
      <EmployeeTable
        employees={employees}
        onView={(emp) => {
          setSelectedEmployee(emp);
          setIsDetailOpen(true);
        }}
        onEdit={(emp) => {
          setFormEditEmployee(emp);
          setIsFormOpen(true);
        }}
        onToggleStatus={(emp) => {
          setStatusTargetEmployee(emp);
          setIsStatusOpen(true);
        }}
      />

      {/* Modals */}
      <EmployeeDetailModal
        employee={selectedEmployee}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedEmployee(null);
        }}
        onEdit={(emp) => {
          setFormEditEmployee(emp);
          setIsFormOpen(true);
        }}
      />

      <EmployeeFormModal
        employee={formEditEmployee}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setFormEditEmployee(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <EmployeeStatusModal
        employee={statusTargetEmployee}
        isOpen={isStatusOpen}
        onClose={() => {
          setIsStatusOpen(false);
          setStatusTargetEmployee(null);
        }}
        onConfirm={handleStatusConfirm}
      />
    </div>
  );
};
