import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AppointmentResponse, AppointmentStatus, APPOINTMENT_STATUSES } from '@/types/appointment.types';
import { BranchResponse } from '@/types/branch.types';
import { appointmentService } from '../services/appointment.service';
import { branchService } from '@/features/branches/services/branch.service';
import { AppointmentTable } from '../components/AppointmentTable';
import { AppointmentDetailModal } from '../components/AppointmentDetailModal';
import { AppointmentFormModal } from '../components/AppointmentFormModal';
import { AppointmentCancelModal } from '../components/AppointmentCancelModal';
import { CheckInModal } from '@/features/reception/components/CheckInModal';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { Button } from '@/components/common/Button';
import { wsClient } from '@/lib/websocket/websocket-client';
import { isToday } from '../utils/date-utils';

interface AppointmentRealtimeEvent {
  eventType?: string;
  entityType?: string;
  entityId?: number | string;
  payload?: AppointmentResponse;
}

export const AppointmentsPage: React.FC = () => {
  const { user, token } = useAuth();
  const isAdmin = user?.roles?.includes('ROLE_ADMIN');
  const isManager = user?.roles?.includes('ROLE_MANAGER');
  const isFrontDesk = user?.roles?.includes('ROLE_FRONT_DESK');
  const isCustomer = user?.roles?.includes('ROLE_CUSTOMER');
  const canCreateAppointment = isAdmin || isCustomer;
  const canManageStatus = isAdmin || isManager || isFrontDesk;
  const canCancel = true; // Admin, Manager, FrontDesk, Customer are allowed to cancel by backend

  // Data states
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'ALL'>('ALL');
  const [branchFilter, setBranchFilter] = useState<number | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [onlyBookedToday, setOnlyBookedToday] = useState(false);

  // Modal states
  const [selectedDetail, setSelectedDetail] = useState<AppointmentResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  const [selectedToCancel, setSelectedToCancel] = useState<AppointmentResponse | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState<boolean>(false);

  const [selectedToCheckIn, setSelectedToCheckIn] = useState<AppointmentResponse | null>(null);
  const [isCheckInOpen, setIsCheckInOpen] = useState<boolean>(false);

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  // Fetch all appointments
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await appointmentService.getAppointments();
      setAppointments(data);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách lịch hẹn:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Không thể tải danh sách lịch hẹn từ máy chủ.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch branches for filter
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const branchList = await branchService.getAll();
        setBranches(branchList);
      } catch (err) {
        console.error('Lỗi khi tải chi nhánh:', err);
      }
    };
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    if (!token || !user) return;

    const destinations = new Set<string>();
    if (isCustomer) {
      destinations.add('/user/queue/notifications');
    }
    if (isAdmin) {
      branches.forEach((branch) => destinations.add(`/topic/branches/${branch.maChiNhanh}`));
    } else if ((isManager || isFrontDesk) && user.maChiNhanh) {
      destinations.add(`/topic/branches/${user.maChiNhanh}`);
    }
    if (destinations.size === 0) return;

    wsClient.connect(token);
    const handleAppointmentEvent = (payload: unknown) => {
      const event = payload as AppointmentRealtimeEvent;
      if (event.entityType !== 'DAT_LICH') return;

      if (event.payload?.maDatLich) {
        setAppointments((current) => {
          const exists = current.some((item) => item.maDatLich === event.payload!.maDatLich);
          return exists
            ? current.map((item) => item.maDatLich === event.payload!.maDatLich ? event.payload! : item)
            : [event.payload!, ...current];
        });
        setSelectedDetail((current) =>
          current?.maDatLich === event.payload!.maDatLich ? event.payload! : current
        );
        setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
        return;
      }

      fetchAppointments();
    };

    const unsubscribers = Array.from(destinations).map((destination) =>
      wsClient.subscribe(destination, handleAppointmentEvent)
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [branches, fetchAppointments, isAdmin, isCustomer, isFrontDesk, isManager, token, user]);

  // Toast timer
  useEffect(() => {
    if (!successToast) return;
    const timer = setTimeout(() => setSuccessToast(null), 4000);
    return () => clearTimeout(timer);
  }, [successToast]);

  // Count appointments booked today
  const bookedTodayCount = useMemo(() => {
    return appointments.filter((a) => isToday(a.ngayDat)).length;
  }, [appointments]);

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      // Filter: Chỉ lịch đặt hôm nay
      if (onlyBookedToday && !isToday(app.ngayDat)) {
        return false;
      }

      // Search
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const customerName = (app.tenKhachHang || '').toLowerCase();
        const phone = (app.soDienThoaiKhachHang || '').toLowerCase();
        const plate = (app.bienSoXe || '').toLowerCase();
        const model = (app.modelXe || '').toLowerCase();
        const brand = (app.hangXe || '').toLowerCase();
        const code = `#${app.maDatLich}`;

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
      if (statusFilter !== 'ALL' && app.trangThai !== statusFilter) {
        return false;
      }

      // Branch
      if (branchFilter !== 'ALL' && app.maChiNhanh !== branchFilter) {
        return false;
      }

      // Date
      if (dateFilter && app.thoiGianHen) {
        const appDate = app.thoiGianHen.substring(0, 10);
        if (appDate !== dateFilter) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const timeA = a.ngayDat ? new Date(a.ngayDat).getTime() : (a.thoiGianHen ? new Date(a.thoiGianHen).getTime() : 0);
      const timeB = b.ngayDat ? new Date(b.ngayDat).getTime() : (b.thoiGianHen ? new Date(b.thoiGianHen).getTime() : 0);
      return timeB - timeA || (b.maDatLich - a.maDatLich);
    });
  }, [appointments, search, statusFilter, branchFilter, dateFilter, onlyBookedToday]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = appointments.length;
    const pending = appointments.filter((a) => a.trangThai === 'CHO_XAC_NHAN').length;
    const confirmed = appointments.filter((a) => a.trangThai === 'DA_XAC_NHAN').length;
    const completed = appointments.filter(
      (a) => a.trangThai === 'DA_TIEP_NHAN' || a.trangThai === 'HOAN_TAT'
    ).length;
    return { total, pending, confirmed, completed };
  }, [appointments]);

  // Handlers
  const handleOpenDetail = (app: AppointmentResponse) => {
    setSelectedDetail(app);
    setIsDetailOpen(true);
  };

  const handleOpenCancel = (app: AppointmentResponse) => {
    setSelectedToCancel(app);
    setIsCancelOpen(true);
  };

  const handleCreateSuccess = (newApp: AppointmentResponse) => {
    setSuccessToast(`Đặt lịch hẹn #${newApp.maDatLich} thành công!`);
    fetchAppointments();
  };

  const handleCancelSuccess = (updatedApp: AppointmentResponse) => {
    setSuccessToast(`Đã hủy lịch hẹn #${updatedApp.maDatLich} thành công.`);
    fetchAppointments();
  };

  const handleConfirmAppointment = async (app: AppointmentResponse) => {
    try {
      setLoading(true);
      setError(null);
      const updated = await appointmentService.confirmAppointment(app.maDatLich);
      setSuccessToast(`Đã xác nhận lịch hẹn #${updated.maDatLich} thành công!`);
      await fetchAppointments();
    } catch (err: any) {
      console.error('Lỗi khi xác nhận lịch hẹn:', err);
      const msg = err.response?.data?.message || err.message || 'Không thể xác nhận lịch hẹn.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveAppointment = (app: AppointmentResponse) => {
    setSelectedToCheckIn(app);
    setIsCheckInOpen(true);
  };

  const handleCheckInSuccess = (reception: any) => {
    setSuccessToast(`Đã lập phiếu tiếp nhận #${reception.maTiepNhan} cho lịch hẹn #${reception.maDatLich || ''} thành công!`);
    fetchAppointments();
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
          <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#ffffff' }}>
            check_circle
          </span>
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{successToast}</span>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            style={{ color: '#ffffff', marginLeft: '12px', display: 'flex' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              close
            </span>
          </button>
        </div>
      )}

      {/* Top Header & Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            {isCustomer ? 'Lịch Hẹn Của Tôi' : 'Quản Lý Lịch Hẹn'}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
            {isCustomer
              ? 'Xem lịch hẹn và tình trạng tiếp nhận xe của bạn.'
              : 'Xem yêu cầu đặt lịch, xác nhận lịch hẹn và tiếp nhận xe.'}
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
            onClick={fetchAppointments}
            disabled={loading}
          >
            <span
              className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}
              style={{ fontSize: '18px' }}
            >
              refresh
            </span>
            <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>

          {canCreateAppointment && (
            <Button
              variant="primary"
              onClick={() => setIsFormOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                calendar_add_on
              </span>
              <span>{isCustomer ? 'Đặt lịch dịch vụ' : 'Tạo lịch hẹn mới'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger">
          <span className="material-symbols-outlined">error</span>
          <span style={{ flex: 1 }}>{error}</span>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
            onClick={fetchAppointments}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 4 Summary KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          label="Tổng Số Lịch Hẹn"
          value={kpis.total}
          icon="calendar_month"
          colorTheme="default"
          trend="Lịch hẹn đã tạo"
          trendUp={true}
        />
        <KpiCard
          label="Chờ Xác Nhận"
          value={kpis.pending}
          icon="pending_actions"
          colorTheme="orange"
          trend="Cần xử lý sớm"
          trendUp={kpis.pending > 0}
        />
        <KpiCard
          label="Đã Xác Nhận"
          value={kpis.confirmed}
          icon="verified"
          colorTheme="slate"
          trend="Chuẩn bị tiếp nhận"
          trendUp={true}
        />
        <KpiCard
          label="Đã Tiếp Nhận / Xong"
          value={kpis.completed}
          icon="task_alt"
          colorTheme="green"
          trend="Tại xưởng / Hoàn tất"
          trendUp={true}
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="filter-card">
        <div className="filter-search-box">
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder="Tìm theo mã lịch (#1), tên khách hàng, số điện thoại, biển số xe..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          {/* Quick Filter: Đặt hôm nay */}
          <button
            type="button"
            className={`btn ${onlyBookedToday ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '6px 14px',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              border: onlyBookedToday ? 'none' : '1px solid var(--color-outline-variant)',
              backgroundColor: onlyBookedToday ? 'var(--color-primary)' : 'var(--color-surface-container-low)',
              color: onlyBookedToday ? '#ffffff' : 'var(--color-on-surface)',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onClick={() => setOnlyBookedToday((prev) => !prev)}
            title={onlyBookedToday ? 'Bỏ lọc để xem tất cả lịch' : 'Chỉ xem lịch hẹn được đặt trong hôm nay'}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '18px',
                color: onlyBookedToday ? '#ffffff' : 'var(--color-primary)',
              }}
            >
              bolt
            </span>
            <span>Đặt hôm nay</span>
            <span
              style={{
                backgroundColor: onlyBookedToday ? 'rgba(255, 255, 255, 0.25)' : 'var(--color-primary-container)',
                color: onlyBookedToday ? '#ffffff' : 'var(--color-on-primary-container)',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '1px 7px',
                borderRadius: '999px',
                marginLeft: '2px',
              }}
            >
              {bookedTodayCount}
            </span>
          </button>

          {/* Status Filter */}
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            {APPOINTMENT_STATUSES.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>

          {/* Branch Filter (Admin only) */}
          {isAdmin && branches.length > 1 && (
            <select
              className="filter-select"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            >
              <option value="ALL">Tất cả chi nhánh</option>
              {branches.map((b) => (
                <option key={b.maChiNhanh} value={b.maChiNhanh}>
                  {b.tenChiNhanh}
                </option>
              ))}
            </select>
          )}

          {/* Date Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="date"
              className="filter-select"
              style={{ minWidth: '150px' }}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            {dateFilter && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '6px 8px' }}
                onClick={() => setDateFilter('')}
                title="Xóa lọc ngày"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  clear
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Appointment Table */}
      <AppointmentTable
        appointments={filteredAppointments}
        loading={loading}
        onViewDetail={handleOpenDetail}
        onCancel={handleOpenCancel}
        onConfirm={handleConfirmAppointment}
        onReceive={handleReceiveAppointment}
        canCancel={canCancel}
        canManageStatus={canManageStatus}
      />

      {/* Modals */}
      <AppointmentDetailModal
        appointment={selectedDetail}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedDetail(null);
        }}
        onOpenCancelModal={handleOpenCancel}
        onConfirm={handleConfirmAppointment}
        onReceive={handleReceiveAppointment}
        canCancel={canCancel}
        canManageStatus={canManageStatus}
      />

      <AppointmentFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <AppointmentCancelModal
        appointment={selectedToCancel}
        isOpen={isCancelOpen}
        onClose={() => {
          setIsCancelOpen(false);
          setSelectedToCancel(null);
        }}
        onSuccess={handleCancelSuccess}
      />

      <CheckInModal
        isOpen={isCheckInOpen}
        appointment={selectedToCheckIn}
        onClose={() => {
          setIsCheckInOpen(false);
          setSelectedToCheckIn(null);
        }}
        onSuccess={handleCheckInSuccess}
      />
    </div>
  );
};
