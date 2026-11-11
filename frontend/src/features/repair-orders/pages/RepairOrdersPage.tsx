import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RepairOrderResponse,
  AssignmentResponse,
} from '@/types/repair-order.types';
import { BranchResponse } from '@/types/branch.types';
import { repairOrderService } from '../services/repairOrder.service';
import { assignmentService } from '../services/assignment.service';
import { branchService } from '@/features/branches/services/branch.service';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/common/Button';
import { RepairOrderTable } from '../components/RepairOrderTable';
import { PendingAssignmentsTable } from '../components/PendingAssignmentsTable';
import { RepairOrderDetailModal } from '../components/RepairOrderDetailModal';
import { AssignTechnicianModal } from '../components/AssignTechnicianModal';
import { CreateDirectRepairOrderModal } from '../components/CreateDirectRepairOrderModal';
import { GenerateInvoiceConfirmModal } from '@/features/invoices/components/GenerateInvoiceConfirmModal';
import { InvoiceDetailModal } from '@/features/invoices/components/InvoiceDetailModal';
import { InvoiceResponse } from '@/types/invoice.types';

export const RepairOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const userRoles = user?.roles || [];
  const isAdmin = userRoles.includes('ROLE_ADMIN');
  const isManagerOrAdmin = userRoles.includes('ROLE_ADMIN') || userRoles.includes('ROLE_MANAGER');
  const isFrontDesk = userRoles.includes('ROLE_FRONT_DESK');
  const isTechnician = userRoles.includes('ROLE_TECHNICIAN') && !isManagerOrAdmin && !isFrontDesk;
  const canAssign = isManagerOrAdmin || isFrontDesk;
  const canGenerateInvoice = isManagerOrAdmin || isFrontDesk;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'orders' | 'pending'>('orders');

  // Data state
  const [orders, setOrders] = useState<RepairOrderResponse[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<AssignmentResponse[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<RepairOrderResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState<RepairOrderResponse | null>(null);
  const [isAssignOpen, setIsAssignOpen] = useState<boolean>(false);
  const [isCreateDirectOpen, setIsCreateDirectOpen] = useState<boolean>(false);

  // Invoice modals
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<RepairOrderResponse | null>(null);
  const [isGenerateInvoiceOpen, setIsGenerateInvoiceOpen] = useState<boolean>(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<InvoiceResponse | null>(null);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState<boolean>(false);

  const handleOpenGenerateInvoice = (order: RepairOrderResponse) => {
    setSelectedOrderForInvoice(order);
    setIsGenerateInvoiceOpen(true);
  };

  const handleInvoiceGeneratedSuccess = (invoice: InvoiceResponse) => {
    setIsGenerateInvoiceOpen(false);
    setSelectedOrderForInvoice(null);
    setToast(`Xuất hóa đơn #${invoice.maHoaDon} thành công cho lệnh sửa chữa #${invoice.maPhieuSuaChua}!`);
    fetchData();
    setGeneratedInvoice(invoice);
    setIsInvoiceDetailOpen(true);
  };

  // Auto clear toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Nếu là kỹ thuật viên, gọi endpoint riêng của technician (/api/technician/repair-orders)
      if (isTechnician) {
        const techOrders = await repairOrderService.getTechnicianOrders();
        setOrders(techOrders);
        setPendingAssignments([]);
      } else {
        // ADMIN, MANAGER, FRONT_DESK
        const promises: [
          Promise<RepairOrderResponse[]>,
          Promise<AssignmentResponse[]>,
          Promise<BranchResponse[]>
        ] = [
          repairOrderService.getAll(),
          isManagerOrAdmin
            ? assignmentService.getPendingAssignments().catch(() => [])
            : Promise.resolve([]),
          branchService.getAll().catch(() => []),
        ];

        const [ordersRes, pendingRes, branchesRes] = await Promise.all(promises);
        setOrders(ordersRes);
        setPendingAssignments(pendingRes);
        setBranches(branchesRes);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu lệnh sửa chữa:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Không thể tải danh sách lệnh sửa chữa. Vui lòng thử lại sau.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isTechnician, isManagerOrAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((item) => {
      // Search
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const code = `#${item.maPhieuSuaChua}`;
        const plate = (item.bienSoXe || '').toLowerCase();
        const customer = (item.tenKhachHang || '').toLowerCase();
        const phone = (item.soDienThoaiKhachHang || '').toLowerCase();
        const model = `${item.hangXe || item.tenHangXe || ''} ${item.modelXe || item.tenModel || ''}`.toLowerCase();

        if (
          !code.includes(query) &&
          !plate.includes(query) &&
          !customer.includes(query) &&
          !phone.includes(query) &&
          !model.includes(query)
        ) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'ALL' && item.trangThai !== statusFilter) {
        return false;
      }

      // Branch
      if (branchFilter !== 'ALL' && item.maChiNhanh !== branchFilter) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const timeA = a.thoiGianBatDau ? new Date(a.thoiGianBatDau).getTime() : 0;
      const timeB = b.thoiGianBatDau ? new Date(b.thoiGianBatDau).getTime() : 0;
      return timeB - timeA || (b.maPhieuSuaChua - a.maPhieuSuaChua);
    });
  }, [orders, search, statusFilter, branchFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const total = orders.length;
    const inProgress = orders.filter((o) => o.trangThai === 'DANG_SUA').length;
    const waiting = orders.filter((o) => o.trangThai === 'CHO_XU_LY' || o.trangThai === 'DA_PHAN_CONG').length;
    const completed = orders.filter((o) => o.trangThai === 'HOAN_TAT').length;
    const pendingApprovalCount = pendingAssignments.length;

    return { total, inProgress, waiting, completed, pendingApprovalCount };
  }, [orders, pendingAssignments]);

  const handleOpenDetail = (order: RepairOrderResponse) => {
    setSelectedOrderDetail(order);
    setIsDetailOpen(true);
  };

  const handleOpenAssign = (order: RepairOrderResponse) => {
    setSelectedOrderForAssign(order);
    setIsAssignOpen(true);
  };

  const handleSelectOrderFromPending = async (orderId: number) => {
    const found = orders.find((o) => o.maPhieuSuaChua === orderId);
    if (found) {
      setSelectedOrderDetail(found);
      setIsDetailOpen(true);
    } else {
      try {
        const fetched = await repairOrderService.getById(orderId);
        setSelectedOrderDetail(fetched);
        setIsDetailOpen(true);
      } catch (e) {
        console.error('Không tìm thấy chi tiết lệnh:', e);
      }
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Alert */}
      {toast && (
        <div
          className="alert alert-info"
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 1100,
            boxShadow: 'var(--shadow-lg)',
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 20px',
            border: 'none',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            check_circle
          </span>
          <span style={{ fontWeight: 500 }}>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            {isTechnician ? 'Công Việc & Lệnh Sửa Chữa Của Tôi' : 'Quản Lý Lệnh Sửa Chữa'}
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-outline)', fontSize: '0.875rem' }}>
            {isTechnician
              ? 'Xem các lệnh sửa chữa đã được giao cho bạn'
              : 'Theo dõi tiến độ, phân công kỹ thuật viên và duyệt phân công'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="secondary" onClick={fetchData} disabled={loading} title="Tải lại dữ liệu">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>
              refresh
            </span>
            Làm mới
          </Button>

          {canAssign && (
            <Button
              variant="primary"
              onClick={() => setIsCreateDirectOpen(true)}
              title="Tạo lệnh sửa chữa mới hoặc phiếu phát sinh"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>
                add_circle
              </span>
              Tạo lệnh sửa chữa
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tổng lệnh sửa chữa</span>
            <div className="kpi-icon-box">
              <span className="material-symbols-outlined">assignment</span>
            </div>
          </div>
          <div className="kpi-value">{kpis.total}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '6px' }}>
            {isTechnician ? 'Công việc được giao' : 'Lệnh đang quản lý'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Đang sửa chữa</span>
            <div className="kpi-icon-box orange">
              <span className="material-symbols-outlined">construction</span>
            </div>
          </div>
          <div className="kpi-value">{kpis.inProgress}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '6px' }}>
            Lệnh đang sửa chữa
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Chờ xử lý / Phân công</span>
            <div className="kpi-icon-box slate">
              <span className="material-symbols-outlined">schedule</span>
            </div>
          </div>
          <div className="kpi-value">{kpis.waiting}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '6px' }}>
            Chờ phân công kỹ thuật viên
          </div>
        </div>

        {isManagerOrAdmin ? (
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">Phân công chờ duyệt</span>
              <div className="kpi-icon-box" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', color: '#ca8a04' }}>
                <span className="material-symbols-outlined">pending_actions</span>
              </div>
            </div>
            <div className="kpi-value" style={{ color: kpis.pendingApprovalCount > 0 ? '#ca8a04' : 'inherit' }}>
              {kpis.pendingApprovalCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '6px' }}>
              Phân công của lễ tân chờ duyệt
            </div>
          </div>
        ) : (
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-label">Hoàn tất</span>
              <div className="kpi-icon-box green">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
            </div>
            <div className="kpi-value">{kpis.completed}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '6px' }}>
              Đã hoàn tất sửa chữa
            </div>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            error
          </span>
          <span>{error}</span>
        </div>
      )}

      {/* Manager / Admin Navigation Tabs */}
      {isManagerOrAdmin && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '12px',
          }}
        >
          <button
            type="button"
            className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('orders')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              list_alt
            </span>
            Tất cả lệnh sửa chữa ({orders.length})
          </button>

          <button
            type="button"
            className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('pending')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              pending_actions
            </span>
            Phân công chờ duyệt
            {pendingAssignments.length > 0 && (
              <span
                className="status-badge warning"
                style={{ marginLeft: '6px', fontSize: '0.75rem', padding: '2px 8px' }}
              >
                {pendingAssignments.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === 'orders' ? (
        <>
          {/* Filters Card */}
          <div className="filter-card">
            <div className="filter-search-box">
              <span className="material-symbols-outlined">search</span>
              <input
                type="text"
                placeholder="Tìm mã lệnh, biển số xe, khách hàng, SĐT, dòng xe..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="filter-controls">
              {/* Branch Filter (Admin only) */}
              {isAdmin && branches.length > 1 && (
                <select
                  className="filter-select"
                  value={branchFilter}
                  onChange={(e) =>
                    setBranchFilter(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value, 10))
                  }
                >
                  <option value="ALL">Tất cả chi nhánh</option>
                  {branches.map((b) => (
                    <option key={b.maChiNhanh} value={b.maChiNhanh}>
                      {b.tenChiNhanh}
                    </option>
                  ))}
                </select>
              )}

              {/* Status Filter */}
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="CHO_XU_LY">Chờ xử lý</option>
                <option value="DA_PHAN_CONG">Đã phân công</option>
                <option value="DANG_SUA">Đang sửa chữa</option>
                <option value="TAM_DUNG">Tạm dừng</option>
                <option value="HOAN_TAT">Hoàn tất</option>
                <option value="HUY">Đã hủy</option>
              </select>

              {/* Reset filter */}
              {(search || branchFilter !== 'ALL' || statusFilter !== 'ALL') && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    setBranchFilter('ALL');
                    setStatusFilter('ALL');
                  }}
                  style={{ padding: '6px 12px', minHeight: '40px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', marginRight: '4px' }}>
                    filter_alt_off
                  </span>
                  Xóa lọc
                </Button>
              )}
            </div>
          </div>

          {/* Table */}
          <RepairOrderTable
            orders={filteredOrders}
            loading={loading}
            canAssign={canAssign}
            canGenerateInvoice={canGenerateInvoice}
            onViewDetail={handleOpenDetail}
            onAssign={handleOpenAssign}
            onGenerateInvoice={handleOpenGenerateInvoice}
          />
        </>
      ) : (
        /* Pending Assignments Tab for Managers */
        <PendingAssignmentsTable
          assignments={pendingAssignments}
          loading={loading}
          onRefresh={() => {
            setToast('Cập nhật trạng thái phân công thành công!');
            fetchData();
          }}
          onSelectOrder={handleSelectOrderFromPending}
        />
      )}

      {/* Detail Modal */}
      <RepairOrderDetailModal
        isOpen={isDetailOpen}
        repairOrder={selectedOrderDetail}
        onClose={() => setIsDetailOpen(false)}
        onOrderUpdated={() => {
          fetchData();
        }}
      />

      {/* Assign Modal */}
      <AssignTechnicianModal
        isOpen={isAssignOpen}
        repairOrder={selectedOrderForAssign}
        onClose={() => setIsAssignOpen(false)}
        onSuccess={() => {
          setToast('Đã tạo phân công kỹ thuật viên thành công!');
          fetchData();
        }}
      />

      {/* Create Direct Repair Order Modal */}
      <CreateDirectRepairOrderModal
        isOpen={isCreateDirectOpen}
        onClose={() => setIsCreateDirectOpen(false)}
        onSuccess={(newOrder) => {
          setToast(`Đã tạo lệnh sửa chữa #${newOrder.maPhieuSuaChua} thành công!`);
          fetchData();
        }}
      />

      {/* Generate Invoice Confirm Modal */}
      <GenerateInvoiceConfirmModal
        isOpen={isGenerateInvoiceOpen}
        repairOrder={selectedOrderForInvoice}
        allOrders={orders}
        onClose={() => {
          setIsGenerateInvoiceOpen(false);
          setSelectedOrderForInvoice(null);
        }}
        onSuccess={handleInvoiceGeneratedSuccess}
      />

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        isOpen={isInvoiceDetailOpen}
        invoice={generatedInvoice}
        onClose={() => {
          setIsInvoiceDetailOpen(false);
          setGeneratedInvoice(null);
        }}
      />
    </div>
  );
};
