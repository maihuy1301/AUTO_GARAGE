import React, { useEffect, useState, useCallback } from 'react';
import { reportService } from '@/features/reports/services/report.service';
import {
  DashboardResponseData,
  AppointmentReportResponseData,
  RepairOrderReportResponseData,
  InventoryReportResponseData,
} from '@/features/reports/types/report.types';
import { KpiCard } from './KpiCard';
import { DashboardSkeleton } from './DashboardSkeleton';
import { Button } from '@/components/common/Button';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

export const ManagerDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardResponseData | null>(null);
  const [apptsReport, setApptsReport] = useState<AppointmentReportResponseData | null>(null);
  const [repairReport, setRepairReport] = useState<RepairOrderReportResponseData | null>(null);
  const [inventory, setInventory] = useState<InventoryReportResponseData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [dash, appts, repairs, invList] = await Promise.all([
        reportService.getDashboard(),
        reportService.getAppointments().catch(() => null),
        reportService.getRepairOrders().catch(() => null),
        reportService.getInventory().catch(() => []),
      ]);

      setDashboardData(dash);
      setApptsReport(appts);
      setRepairReport(repairs);
      setInventory(invList);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('Không thể tải dữ liệu chi nhánh. Vui lòng thử lại.');
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
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Không thể tải dữ liệu chi nhánh</h3>
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
      {/* Top Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            Tổng quan chi nhánh
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
            Theo dõi lịch hẹn, tiến độ sửa chữa và doanh thu của chi nhánh.
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
          label="Doanh Thu Chi Nhánh"
          value={formatCurrency(dashboardData?.totalRevenue || 0)}
          icon="account_balance_wallet"
          colorTheme="green"
          trend="Tiền đã thu"
          trendUp={true}
        />
        <KpiCard
          label="Lịch Hẹn Chi Nhánh"
          value={dashboardData?.totalAppointments || 0}
          icon="event_available"
          colorTheme="default"
          trend={`Chờ duyệt: ${apptsReport?.choXacNhan || 0}`}
          trendUp={true}
        />
        <KpiCard
          label="Lệnh Đang Xử Lý"
          value={dashboardData?.repairOrdersInProgress || 0}
          icon="build_circle"
          colorTheme="orange"
          trend={`Tổng lệnh: ${dashboardData?.totalRepairOrders || 0}`}
          trendUp={true}
        />
        <KpiCard
          label="Cảnh Báo Tồn Kho"
          value={inventory.filter((i) => i.warningLowStock).length}
          icon="inventory_2"
          colorTheme="slate"
          trend={`${inventory.length} mã phụ tùng`}
          trendUp={false}
        />
      </div>

      {/* Progress & Operational Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Appointment Status Distribution */}
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '16px' }}>
            Trạng thái lịch hẹn chi nhánh
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--color-surface-gray)', borderRadius: '6px' }}>
              <span>Chờ xác nhận</span>
              <span className="status-badge warning">{apptsReport?.choXacNhan || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--color-surface-gray)', borderRadius: '6px' }}>
              <span>Đã xác nhận</span>
              <span className="status-badge primary">{apptsReport?.daXacNhan || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--color-surface-gray)', borderRadius: '6px' }}>
              <span>Đã tiếp nhận</span>
              <span className="status-badge success">{apptsReport?.daTiepNhan || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--color-surface-gray)', borderRadius: '6px' }}>
              <span>Đã hủy</span>
              <span className="status-badge danger">{apptsReport?.daHuy || 0}</span>
            </div>
          </div>
        </div>

        {/* Repair Order Status Distribution */}
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '16px' }}>
            Trạng thái lệnh sửa chữa
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--color-surface-gray)', borderRadius: '6px' }}>
              <span>Đang sửa chữa</span>
              <span className="status-badge primary">{repairReport?.dangSua || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--color-surface-gray)', borderRadius: '6px' }}>
              <span>Đã phân công KTV</span>
              <span className="status-badge warning">{repairReport?.daPhanCong || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--color-surface-gray)', borderRadius: '6px' }}>
              <span>Chờ khách duyệt</span>
              <span className="status-badge warning">{repairReport?.choKhachDuyet || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--color-surface-gray)', borderRadius: '6px' }}>
              <span>Hoàn tất / Bàn giao</span>
              <span className="status-badge success">{repairReport?.hoanTat || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
