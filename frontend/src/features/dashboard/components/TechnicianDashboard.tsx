import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportService } from '@/features/reports/services/report.service';
import { TechnicianReportResponseData, DashboardResponseData } from '@/features/reports/types/report.types';
import { KpiCard } from './KpiCard';
import { DashboardSkeleton } from './DashboardSkeleton';
import { Button } from '@/components/common/Button';

export const TechnicianDashboard: React.FC = () => {
  const [techList, setTechList] = useState<TechnicianReportResponseData[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardResponseData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [techs, dash] = await Promise.all([
        reportService.getTechnicians().catch(() => []),
        reportService.getDashboard().catch(() => null),
      ]);

      setTechList(techs);
      setDashboardData(dash);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('Không thể tải dữ liệu kỹ thuật viên.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading && !dashboardData && techList.length === 0) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="card animate-fade-in" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ color: 'var(--color-danger)', marginBottom: '12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>error_outline</span>
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Không thể tải dữ liệu xưởng</h3>
        <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '20px' }}>{error}</p>
        <Button variant="primary" onClick={loadData}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
          <span>Thử lại</span>
        </Button>
      </div>
    );
  }

  // Calculate my or team workload
  const totalAssigned = techList.reduce((acc, t) => acc + (t.totalAssigned || 0), 0);
  const totalInProgress = techList.reduce((acc, t) => acc + (t.inProgress || 0), 0) || (dashboardData?.repairOrdersInProgress || 0);
  const totalCompleted = techList.reduce((acc, t) => acc + (t.completed || 0), 0) || (dashboardData?.repairOrdersCompleted || 0);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            Công việc sửa chữa
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
            Xem công việc được giao, cập nhật tiến độ và ghi nhận phụ tùng đã sử dụng.
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
          label="Lệnh Được Giao"
          value={totalAssigned}
          icon="assignment"
          colorTheme="default"
          trend="Công việc được giao"
          trendUp={true}
        />
        <KpiCard
          label="Đang Thực Hiện"
          value={totalInProgress}
          icon="construction"
          colorTheme="orange"
          trend="Đang tiến hành"
          trendUp={true}
        />
        <KpiCard
          label="Đã Hoàn Tất"
          value={totalCompleted}
          icon="check_circle"
          colorTheme="green"
          trend="Đã hoàn tất sửa chữa"
          trendUp={true}
        />
        <KpiCard
          label="Trạng Thái Xưởng"
          value="Sẵn sàng"
          icon="precision_manufacturing"
          colorTheme="slate"
          trend="Ca làm việc"
          trendUp={true}
        />
      </div>

      {/* Quick Action Navigation */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '16px' }}>
          Hành động nhanh
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/app/repair-orders')}
          >
            <span className="material-symbols-outlined">construction</span>
            <span>Cập nhật tiến độ sửa chữa</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/app/repair-orders')}
          >
            <span className="material-symbols-outlined">list_alt</span>
            <span>Xem danh sách lệnh sửa chữa</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/app/chat')}
          >
            <span className="material-symbols-outlined">chat</span>
            <span>Trao đổi nội bộ xưởng</span>
          </button>
        </div>
      </div>
    </div>
  );
};
