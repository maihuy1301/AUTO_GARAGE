import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ReceptionResponse } from '@/types/reception.types';
import { AppointmentResponse } from '@/types/appointment.types';
import { RepairOrderResponse } from '@/types/repair-order.types';
import { BranchResponse } from '@/types/branch.types';
import { receptionService } from '../services/reception.service';
import { branchService } from '@/features/branches/services/branch.service';
import { ReceptionTable } from '../components/ReceptionTable';
import { ReceptionDetailModal } from '../components/ReceptionDetailModal';
import { CheckInModal } from '../components/CheckInModal';
import { CreateRepairOrderModal } from '../components/CreateRepairOrderModal';
import { SelectAppointmentCheckInModal } from '../components/SelectAppointmentCheckInModal';
import { Button } from '@/components/common/Button';

export const ReceptionPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('ROLE_ADMIN');

  const [receptions, setReceptions] = useState<ReceptionResponse[]>([]);
  const [repairOrders, setRepairOrders] = useState<RepairOrderResponse[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Modals state
  const [selectedDetail, setSelectedDetail] = useState<ReceptionResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  const [selectedToCheckIn, setSelectedToCheckIn] = useState<AppointmentResponse | null>(null);
  const [isCheckInOpen, setIsCheckInOpen] = useState<boolean>(false);

  const [selectedForRepairOrder, setSelectedForRepairOrder] = useState<ReceptionResponse | null>(null);
  const [isCreateRepairOrderOpen, setIsCreateRepairOrderOpen] = useState<boolean>(false);

  const [isSelectAppointmentOpen, setIsSelectAppointmentOpen] = useState<boolean>(false);

  // Tự ẩn toast thông báo sau 4 giây
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [receptionList, repairOrderList, branchList] = await Promise.all([
        receptionService.getReceptionSlips(),
        receptionService.getRepairOrders().catch(() => [] as RepairOrderResponse[]),
        branchService.getAll().catch(() => [] as BranchResponse[]),
      ]);

      setReceptions(receptionList);
      setRepairOrders(repairOrderList);
      setBranches(branchList);
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu tiếp nhận xe:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Không thể tải danh sách phiếu tiếp nhận. Vui lòng thử lại sau.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set các maTiepNhan đã có Phiếu sửa chữa
  const repairOrderSlipIds = useMemo(() => {
    return new Set(repairOrders.map((ro) => ro.maTiepNhan));
  }, [repairOrders]);

  // Lọc dữ liệu
  const filteredReceptions = useMemo(() => {
    return receptions.filter((item) => {
      // Keyword
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const customerName = (item.tenKhachHang || '').toLowerCase();
        const phone = (item.soDienThoaiKhachHang || '').toLowerCase();
        const plate = (item.bienSoXe || '').toLowerCase();
        const model = (item.modelXe || '').toLowerCase();
        const brand = (item.hangXe || '').toLowerCase();
        const code = `#${item.maTiepNhan}`;

        if (
          !customerName.includes(query) &&
          !phone.includes(query) &&
          !plate.includes(query) &&
          !model.includes(query) &&
          !brand.includes(query) &&
          !code.includes(query)
        ) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'DANG_SUA') {
          if (item.trangThai !== 'DANG_SUA' && item.trangThai !== 'DANG_SUA_CHUA') {
            return false;
          }
        } else if (item.trangThai !== statusFilter) {
          return false;
        }
      }

      // Branch
      if (branchFilter !== 'ALL' && item.maChiNhanh !== branchFilter) {
        return false;
      }

      // Date
      if (dateFilter && item.thoiGianTiepNhan) {
        const itemDate = item.thoiGianTiepNhan.substring(0, 10);
        if (itemDate !== dateFilter) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const timeA = a.thoiGianTiepNhan ? new Date(a.thoiGianTiepNhan).getTime() : 0;
      const timeB = b.thoiGianTiepNhan ? new Date(b.thoiGianTiepNhan).getTime() : 0;
      return timeB - timeA || (b.maTiepNhan - a.maTiepNhan);
    });
  }, [receptions, search, statusFilter, branchFilter, dateFilter]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = receptions.length;
    const todayStr = new Date().toISOString().substring(0, 10);
    const todayCount = receptions.filter(
      (r) => r.thoiGianTiepNhan && r.thoiGianTiepNhan.substring(0, 10) === todayStr
    ).length;
    const withRepairOrder = receptions.filter((r) => repairOrderSlipIds.has(r.maTiepNhan)).length;
    const completed = receptions.filter((r) => r.trangThai === 'DA_BAN_GIAO' || r.trangThai === 'HOAN_TAT').length;

    return { total, todayCount, withRepairOrder, completed };
  }, [receptions, repairOrderSlipIds]);

  // Handlers
  const handleOpenDetail = (rec: ReceptionResponse) => {
    setSelectedDetail(rec);
    setIsDetailOpen(true);
  };

  const handleOpenCreateRepairOrder = (rec: ReceptionResponse) => {
    setSelectedForRepairOrder(rec);
    setIsCreateRepairOrderOpen(true);
  };

  const handleSelectAppointmentForCheckIn = (app: AppointmentResponse) => {
    setSelectedToCheckIn(app);
    setIsCheckInOpen(true);
  };

  const handleCheckInSuccess = (newRec: ReceptionResponse) => {
    setSuccessToast(`Tiếp nhận xe ${newRec.bienSoXe} (Phiếu #${newRec.maTiepNhan}) thành công!`);
    fetchData();
  };

  const handleCreateRepairOrderSuccess = (ro: RepairOrderResponse) => {
    setSuccessToast(`Tạo phiếu sửa chữa #${ro.maPhieuSuaChua} thành công!`);
    fetchData();
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {successToast && (
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
          <span style={{ fontWeight: 500 }}>{successToast}</span>
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
            Quản Lý Tiếp Nhận Xe
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-outline)', fontSize: '0.875rem' }}>
            Tiếp nhận xe, ghi số km và tình trạng xe trước khi sửa chữa
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            variant="secondary"
            onClick={fetchData}
            disabled={loading}
            title="Tải lại danh sách"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>
              refresh
            </span>
            Làm mới
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsSelectAppointmentOpen(true)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>
              fact_check
            </span>
            Tiếp Nhận Từ Lịch Hẹn
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tổng phiếu tiếp nhận</span>
            <div className="kpi-icon-box">
              <span className="material-symbols-outlined">receipt_long</span>
            </div>
          </div>
          <div className="kpi-value">{kpis.total}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '6px' }}>
            Tất cả phiếu đã lập
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Tiếp nhận hôm nay</span>
            <div className="kpi-icon-box orange">
              <span className="material-symbols-outlined">today</span>
            </div>
          </div>
          <div className="kpi-value">{kpis.todayCount}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '6px' }}>
            Xe vào xưởng trong ngày
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Đã tạo lệnh sửa chữa</span>
            <div className="kpi-icon-box slate">
              <span className="material-symbols-outlined">build_circle</span>
            </div>
          </div>
          <div className="kpi-value">{kpis.withRepairOrder}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '6px' }}>
            Đã có lệnh sửa chữa
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Đã bàn giao</span>
            <div className="kpi-icon-box green">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
          </div>
          <div className="kpi-value">{kpis.completed}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '6px' }}>
            Xe đã bàn giao khách hàng
          </div>
        </div>
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

      {/* Filter Section với Design System CSS classes */}
      <div className="filter-card">
        {/* Search Box */}
        <div className="filter-search-box">
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder="Tìm theo mã TN, khách hàng, SĐT, biển số..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Controls */}
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
            <option value="DA_TIEP_NHAN">Đã tiếp nhận</option>
            <option value="TIEP_NHAN">Tiếp nhận</option>
            <option value="CHO_XU_LY">Chờ xử lý</option>
            <option value="DANG_XU_LY">Đang xử lý</option>
            <option value="CHO_SUA_CHUA">Chờ sửa chữa</option>
            <option value="DANG_SUA">Đang sửa chữa</option>
            <option value="HOAN_TAT">Hoàn tất</option>
            <option value="DA_BAN_GIAO">Đã bàn giao</option>
            <option value="HUY">Đã hủy</option>
          </select>

          {/* Date Filter */}
          <input
            type="date"
            className="filter-select"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />

          {/* Reset filters */}
          {(search || branchFilter !== 'ALL' || statusFilter !== 'ALL' || dateFilter) && (
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setBranchFilter('ALL');
                setStatusFilter('ALL');
                setDateFilter('');
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

      {/* Reception Table */}
      <ReceptionTable
        receptions={filteredReceptions}
        loading={loading}
        repairOrderSlipIds={repairOrderSlipIds}
        onViewDetail={handleOpenDetail}
        onCreateRepairOrder={handleOpenCreateRepairOrder}
      />

      {/* Modals */}
      <ReceptionDetailModal
        isOpen={isDetailOpen}
        reception={selectedDetail}
        hasRepairOrder={selectedDetail ? repairOrderSlipIds.has(selectedDetail.maTiepNhan) : false}
        onClose={() => setIsDetailOpen(false)}
        onHandedOver={() => {
          setSelectedDetail(value => value ? { ...value, trangThai: 'DA_BAN_GIAO' } : value);
          setSuccessToast('Đã ghi nhận bàn giao và thông báo cho khách hàng.');
          void fetchData();
        }}
        onCreateRepairOrder={handleOpenCreateRepairOrder}
      />

      <CheckInModal
        isOpen={isCheckInOpen}
        appointment={selectedToCheckIn}
        onClose={() => setIsCheckInOpen(false)}
        onSuccess={handleCheckInSuccess}
      />

      <CreateRepairOrderModal
        isOpen={isCreateRepairOrderOpen}
        reception={selectedForRepairOrder}
        onClose={() => setIsCreateRepairOrderOpen(false)}
        onSuccess={handleCreateRepairOrderSuccess}
      />

      <SelectAppointmentCheckInModal
        isOpen={isSelectAppointmentOpen}
        onClose={() => setIsSelectAppointmentOpen(false)}
        onSelectAppointment={handleSelectAppointmentForCheckIn}
      />
    </div>
  );
};
