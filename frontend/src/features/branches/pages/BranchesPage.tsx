import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { branchService } from '@/features/branches/services/branch.service';
import {
  BranchResponse,
  CreateBranchRequest,
  UpdateBranchRequest,
} from '@/types/branch.types';
import { BranchTable } from '@/features/branches/components/BranchTable';
import { BranchDetailModal } from '@/features/branches/components/BranchDetailModal';
import { BranchFormModal } from '@/features/branches/components/BranchFormModal';
import { BranchStatusModal } from '@/features/branches/components/BranchStatusModal';
import { BranchDeleteModal } from '@/features/branches/components/BranchDeleteModal';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { DashboardSkeleton } from '@/features/dashboard/components/DashboardSkeleton';
import { Button } from '@/components/common/Button';

export const BranchesPage: React.FC = () => {
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Modals state
  const [selectedBranch, setSelectedBranch] = useState<BranchResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [formEditBranch, setFormEditBranch] = useState<BranchResponse | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState<boolean>(false);
  const [statusTargetBranch, setStatusTargetBranch] = useState<BranchResponse | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [deleteTargetBranch, setDeleteTargetBranch] = useState<BranchResponse | null>(null);

  // Load branches
  const loadBranches = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await branchService.getAll(true);
      setBranches(data);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('Không tải được danh sách chi nhánh. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  // Handle Form Submit (Create / Update)
  const handleFormSubmit = async (
    payload: CreateBranchRequest | UpdateBranchRequest,
    isEdit: boolean
  ) => {
    if (isEdit && formEditBranch) {
      const updated = await branchService.update(
        formEditBranch.maChiNhanh,
        payload as UpdateBranchRequest
      );
      setBranches((prev) =>
        prev.map((b) => (b.maChiNhanh === updated.maChiNhanh ? updated : b))
      );
      showSuccess(`Cập nhật chi nhánh "${updated.tenChiNhanh}" thành công!`);
    } else {
      const created = await branchService.create(payload as CreateBranchRequest);
      setBranches((prev) => [created, ...prev]);
      showSuccess(`Tạo mới chi nhánh "${created.tenChiNhanh}" thành công!`);
    }
  };

  // Handle Status Toggle
  const handleStatusConfirm = async (id: number, nextStatus: boolean) => {
    const updated = await branchService.updateStatus(id, nextStatus);
    setBranches((prev) =>
      prev.map((b) => (b.maChiNhanh === updated.maChiNhanh ? updated : b))
    );
    showSuccess(
      `Đã chuyển trạng thái chi nhánh "${updated.tenChiNhanh}" sang ${
        nextStatus ? 'Hoạt động' : 'Ngưng hoạt động'
      }!`
    );
  };

  // Handle Delete
  const handleDeleteConfirm = async (id: number) => {
    await branchService.delete(id);
    setBranches((prev) => prev.filter((b) => b.maChiNhanh !== id));
    showSuccess('Xóa chi nhánh thành công!');
  };

  // Metric summaries
  const metrics = useMemo(() => {
    const total = branches.length;
    const active = branches.filter((b) => b.trangThai).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [branches]);

  if (isLoading && branches.length === 0) {
    return (
      <div className="page-container">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header Section */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Quản lý Chi nhánh
          </h1>
          <p className="page-subtitle" style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Thông tin liên hệ và trạng thái hoạt động của các chi nhánh {lastUpdated && `• Cập nhật lúc ${lastUpdated}`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadBranches}
            disabled={isLoading}
            title="Làm mới danh sách"
          >
            <span className={`material-symbols-outlined ${isLoading ? 'spin' : ''}`}>
              refresh
            </span>
            <span>Làm mới</span>
          </button>

          <Button
            variant="primary"
            onClick={() => {
              setFormEditBranch(null);
              setIsFormOpen(true);
            }}
          >
            <span className="material-symbols-outlined">add_business</span>
            <span>+ Thêm chi nhánh</span>
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          <span className="material-symbols-outlined">check_circle</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <KpiCard
          label="Tổng số chi nhánh"
          value={metrics.total}
          icon="store_mall_directory"
          trend={`${metrics.total} cơ sở`}
          colorTheme="default"
        />
        <KpiCard
          label="Đang hoạt động"
          value={metrics.active}
          icon="check_circle"
          trend="Sẵn sàng"
          trendUp={true}
          colorTheme="green"
        />
        <KpiCard
          label="Tạm ngưng hoạt động"
          value={metrics.inactive}
          icon="pause_circle"
          trend="Bảo trì"
          trendUp={false}
          colorTheme="orange"
        />
      </div>

      {/* Main Table */}
      <BranchTable
        branches={branches}
        onView={(b) => {
          setSelectedBranch(b);
          setIsDetailOpen(true);
        }}
        onEdit={(b) => {
          setFormEditBranch(b);
          setIsFormOpen(true);
        }}
        onToggleStatus={(b) => {
          setStatusTargetBranch(b);
          setIsStatusOpen(true);
        }}
        onDelete={(b) => {
          setDeleteTargetBranch(b);
          setIsDeleteOpen(true);
        }}
      />

      {/* Modals */}
      <BranchDetailModal
        branch={selectedBranch}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedBranch(null);
        }}
        onEdit={(b) => {
          setFormEditBranch(b);
          setIsFormOpen(true);
        }}
      />

      <BranchFormModal
        branch={formEditBranch}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setFormEditBranch(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <BranchStatusModal
        branch={statusTargetBranch}
        isOpen={isStatusOpen}
        onClose={() => {
          setIsStatusOpen(false);
          setStatusTargetBranch(null);
        }}
        onConfirm={handleStatusConfirm}
      />

      <BranchDeleteModal
        branch={deleteTargetBranch}
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeleteTargetBranch(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};
