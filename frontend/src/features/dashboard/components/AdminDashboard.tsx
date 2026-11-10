import React, { useEffect, useState, useCallback } from 'react';
import { reportService } from '@/features/reports/services/report.service';
import { DashboardResponseData, BranchReportResponseData, InventoryReportResponseData } from '@/features/reports/types/report.types';
import { KpiCard } from './KpiCard';
import { DashboardSkeleton } from './DashboardSkeleton';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

export const AdminDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardResponseData | null>(null);
  const [branches, setBranches] = useState<BranchReportResponseData[]>([]);
  const [inventory, setInventory] = useState<InventoryReportResponseData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [dash, branchList, invList] = await Promise.all([
        reportService.getDashboard(),
        reportService.getBranches().catch(() => []),
        reportService.getInventory().catch(() => []),
      ]);

      setDashboardData(dash);
      setBranches(branchList);
      setInventory(invList);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('Không tải được số liệu tổng quan. Vui lòng thử lại.');
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
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Không thể tải dữ liệu</h3>
        <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px' }}>
          {error}
        </p>
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
            Tổng quan hệ thống
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
            Theo dõi doanh thu, lịch hẹn và tình hình sửa chữa tại các chi nhánh.
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

      {/* 4 Main KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          label="Tổng Doanh Thu"
          value={formatCurrency(dashboardData?.totalRevenue || 0)}
          icon="account_balance_wallet"
          colorTheme="green"
          trend="Doanh thu thực tế"
          trendUp={true}
        />
        <KpiCard
          label="Tổng Lịch Hẹn"
          value={dashboardData?.totalAppointments || 0}
          icon="event_available"
          colorTheme="default"
          trend="Toàn hệ thống"
          trendUp={true}
        />
        <KpiCard
          label="Đơn Sửa Chữa"
          value={dashboardData?.totalRepairOrders || 0}
          icon="build_circle"
          colorTheme="orange"
          trend={`Đang sửa: ${dashboardData?.repairOrdersInProgress || 0} | Xong: ${dashboardData?.repairOrdersCompleted || 0}`}
          trendUp={true}
        />
        <KpiCard
          label="Khách Hàng & Xe"
          value={`${dashboardData?.totalCustomers || 0} KH / ${dashboardData?.totalVehicles || 0} Xe`}
          icon="groups"
          colorTheme="slate"
          trend="Đã đăng ký"
          trendUp={true}
        />
      </div>

      {/* Detail Panels Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Branch Comparison Table */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
              Hoạt động theo chi nhánh
            </h3>
            <span className="status-badge primary">{branches.length} Chi nhánh</span>
          </div>

          {branches.length === 0 ? (
            <EmptyState
              title="Chưa có dữ liệu chi nhánh"
              description="Chưa có số liệu hoạt động của các chi nhánh."
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-surface-gray)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--color-on-surface-variant)' }}>Chi nhánh</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>Lịch hẹn</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>Phiếu sửa chữa</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-on-surface-variant)' }}>Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b) => (
                    <tr key={b.maChiNhanh} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                        <div>{b.tenChiNhanh}</div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>{b.soLichHen}</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>{b.soPhieuSuaChua}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--color-success)' }}>
                        {formatCurrency(b.doanhThu)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Inventory Warning & Stock Summary */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
              Tình trạng tồn kho phụ tùng
            </h3>
            <span className="status-badge success">Kho hoạt động</span>
          </div>

          {inventory.length === 0 ? (
            <EmptyState
              title="Chưa có dữ liệu tồn kho"
              description="Chưa có số liệu tồn kho để hiển thị."
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-surface-gray)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--color-on-surface-variant)' }}>Phụ tùng</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>Chi nhánh</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>Tồn kho</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.slice(0, 5).map((inv, idx) => {
                    const partName = inv.tenPhuTung || inv.partName || `Phụ tùng #${inv.maPhuTung || inv.partId || idx + 1}`;
                    const partCode = inv.maPhuTungCode || inv.partCode || '—';
                    const branchName = inv.tenChiNhanh || inv.branchName || 'Toàn hệ thống';
                    const stock = inv.soLuongTon ?? inv.stockQuantity ?? 0;
                    const isLow = inv.sapHetHang ?? inv.warningLowStock ?? false;

                    return (
                      <tr key={inv.maPhuTung || inv.partId || `${partCode}-${idx}`} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                          <div>{partName}</div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)' }}>{partCode}</span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '0.8rem' }}>{branchName}</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700 }}>{stock}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {isLow ? (
                            <span className="status-badge danger">Sắp hết</span>
                          ) : (
                            <span className="status-badge success">Đủ hàng</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
