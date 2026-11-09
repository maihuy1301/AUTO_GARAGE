import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerDashboardService } from '../services/customer-dashboard.service';
import { VehicleItem } from '@/types/vehicle.types';
import { AppointmentItem } from '@/types/appointment.types';
import { KpiCard } from './KpiCard';
import { DashboardSkeleton } from './DashboardSkeleton';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'CHO_XAC_NHAN':
      return <span className="status-badge warning">Chờ xác nhận</span>;
    case 'DA_XAC_NHAN':
      return <span className="status-badge primary">Đã xác nhận</span>;
    case 'DA_TIEP_NHAN':
      return <span className="status-badge success">Đã tiếp nhận</span>;
    case 'DA_HUY':
      return <span className="status-badge danger">Đã hủy</span>;
    default:
      return <span className="status-badge">{status}</span>;
  }
};

export const CustomerDashboard: React.FC = () => {
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [vehList, apptList] = await Promise.all([
        customerDashboardService.getMyVehicles().catch(() => []),
        customerDashboardService.getMyAppointments().catch(() => []),
      ]);

      setVehicles(vehList);
      setAppointments(apptList);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('Không thể tải dữ liệu khách hàng.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading && vehicles.length === 0 && appointments.length === 0) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="card animate-fade-in" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ color: 'var(--color-danger)', marginBottom: '12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>error_outline</span>
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Không thể tải thông tin của bạn</h3>
        <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '20px' }}>{error}</p>
        <Button variant="primary" onClick={loadData}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
          <span>Thử lại</span>
        </Button>
      </div>
    );
  }

  const activeAppts = appointments.filter((a) => a.trangThai !== 'DA_HUY');

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            Xe và lịch hẹn của tôi
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
            Xem xe đã đăng ký, đặt lịch bảo dưỡng và theo dõi sửa chữa.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <KpiCard
          label="Xe Của Tôi"
          value={vehicles.length}
          icon="directions_car"
          colorTheme="default"
          trend="Đã đăng ký"
          trendUp={true}
        />
        <KpiCard
          label="Lịch Hẹn Hiện Tại"
          value={activeAppts.length}
          icon="calendar_month"
          colorTheme="orange"
          trend="Đang hiệu lực"
          trendUp={true}
        />
        <KpiCard
          label="Lịch Sử Dịch Vụ"
          value={appointments.length}
          icon="history"
          colorTheme="green"
          trend="Tổng số lần đến"
          trendUp={true}
        />
        <KpiCard
          label="Ưu Đãi Hội Viên"
          value="VIP 1"
          icon="loyalty"
          colorTheme="slate"
          trend="Hạng thành viên"
          trendUp={true}
        />
      </div>

      {/* Detail Panels Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* My Vehicles Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
              Phương tiện của tôi
            </h3>
            <span className="status-badge primary">{vehicles.length} Xe</span>
          </div>

          {vehicles.length === 0 ? (
            <EmptyState
              title="Chưa có xe đăng ký"
              description="Bạn chưa thêm xe nào."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {vehicles.map((v) => (
                <div
                  key={v.maXe}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    backgroundColor: 'var(--color-surface-gray)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-surface-container)',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span className="material-symbols-outlined">directions_car</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--color-on-surface)', fontSize: '0.95rem' }}>
                        {v.hangXe} {v.model} ({v.namSanXuat || '—'})
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '2px' }}>
                        Biển số: <strong style={{ color: 'var(--color-primary-container)' }}>{v.bienSo}</strong> | Màu: {v.mauXe || '—'}
                      </div>
                    </div>
                  </div>
                  <span className="status-badge success">Đang hoạt động</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Appointments Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
              Lịch hẹn đã đặt
            </h3>
            <span className="status-badge primary">{appointments.length} Lịch hẹn</span>
          </div>

          {appointments.length === 0 ? (
            <EmptyState
              title="Chưa có lịch hẹn"
              description="Bạn chưa đặt lịch hẹn dịch vụ nào gần đây."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {appointments.slice(0, 5).map((a) => (
                <div
                  key={a.maDatLich}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    backgroundColor: 'var(--color-surface-gray)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.875rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>
                      {a.tenChiNhanh || `Chi nhánh #${a.maChiNhanh}`} — Xe {a.bienSoXe || `#${a.maXe}`}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-outline)', marginTop: '2px' }}>
                      Thời gian: {formatDate(a.thoiGianHen)} {a.ghiChu ? `(${a.ghiChu})` : ''}
                    </div>
                  </div>
                  <div>{getStatusBadge(a.trangThai)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Navigation */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '16px' }}>
          Dịch vụ khách hàng
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/app/appointments')}
          >
            <span className="material-symbols-outlined">add_circle</span>
            <span>Đặt lịch bảo dưỡng mới</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/app/vehicles')}
          >
            <span className="material-symbols-outlined">directions_car</span>
            <span>Quản lý danh sách xe</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/app/invoices')}
          >
            <span className="material-symbols-outlined">receipt_long</span>
            <span>Tra cứu hóa đơn</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/app/chat')}
          >
            <span className="material-symbols-outlined">chat</span>
            <span>Nhắn tin tư vấn trực tuyến</span>
          </button>
        </div>
      </div>
    </div>
  );
};
