import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportService } from '@/features/reports/services/report.service';
import {
  DashboardResponseData,
  AppointmentReportResponseData,
} from '@/features/reports/types/report.types';
import { KpiCard } from './KpiCard';
import { DashboardSkeleton } from './DashboardSkeleton';
import { Button } from '@/components/common/Button';

export const ReceptionistDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardResponseData | null>(null);
  const [apptsReport, setApptsReport] = useState<AppointmentReportResponseData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [dash, appts] = await Promise.all([
        reportService.getDashboard(),
        reportService.getAppointments().catch(() => null),
      ]);

      setDashboardData(dash);
      setApptsReport(appts);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('Không thể tải dữ liệu bàn tiếp nhận.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading && !dashboardData) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="card animate-fade-in" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ color: 'var(--color-danger)', marginBottom: '12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>error_outline</span>
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Lỗi tải dữ liệu tiếp nhận</h3>
        <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '20px' }}>{error}</p>
        <Button variant="primary" onClick={loadData}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
          <span>Thử lại</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            Tiếp nhận và bàn giao xe
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
            Xác nhận lịch hẹn, tiếp nhận xe và theo dõi xe chờ bàn giao.
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

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          label="Lịch Chờ Duyệt"
          value={apptsReport?.choXacNhan || 0}
          icon="schedule"
          colorTheme="orange"
          trend="Cần xác nhận"
          trendUp={true}
        />
        <KpiCard
          label="Lịch Đã Xác Nhận"
          value={apptsReport?.daXacNhan || 0}
          icon="event_available"
          colorTheme="default"
          trend="Chờ khách đến"
          trendUp={true}
        />
        <KpiCard
          label="Xe Đã Tiếp Nhận"
          value={apptsReport?.daTiepNhan || 0}
          icon="car_repair"
          colorTheme="green"
          trend="Đang trong xưởng"
          trendUp={true}
        />
        <KpiCard
          label="Xe Hoàn Tất Sửa"
          value={dashboardData?.repairOrdersCompleted || 0}
          icon="done_all"
          colorTheme="slate"
          trend="Sẵn sàng bàn giao"
          trendUp={true}
        />
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '16px' }}>
          Thao tác nhanh
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/app/reception')}
          >
            <span className="material-symbols-outlined">car_repair</span>
            <span>Tiếp nhận xe</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/app/appointments')}
          >
            <span className="material-symbols-outlined">add_circle</span>
            <span>Tạo lịch hẹn mới</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/app/customers')}
          >
            <span className="material-symbols-outlined">person_search</span>
            <span>Tra cứu khách hàng</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/app/invoices')}
          >
            <span className="material-symbols-outlined">receipt_long</span>
            <span>Thu ngân & thanh toán</span>
          </button>
        </div>
      </div>
    </div>
  );
};
