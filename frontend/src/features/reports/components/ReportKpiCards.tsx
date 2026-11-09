import React from 'react';
import {
  DashboardResponseData,
  RevenueReportResponseData,
  AppointmentReportResponseData,
  RepairOrderReportResponseData,
  InventoryReportResponseData,
} from '../types/report.types';

interface ReportKpiCardsProps {
  dashboardData: DashboardResponseData | null;
  revenueData: RevenueReportResponseData | null;
  appointmentData: AppointmentReportResponseData | null;
  repairOrderData: RepairOrderReportResponseData | null;
  inventoryData: InventoryReportResponseData[];
  loading: boolean;
}

export const ReportKpiCards: React.FC<ReportKpiCardsProps> = ({
  dashboardData,
  revenueData,
  appointmentData,
  repairOrderData,
  inventoryData,
  loading,
}) => {
  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const lowStockCount = inventoryData.filter((i) => {
    const stock = i.soLuongTon ?? i.stockQuantity ?? 0;
    const min = i.soLuongToiThieu ?? i.minQuantity ?? 0;
    return (i.sapHetHang ?? i.warningLowStock ?? false) || (stock <= min);
  }).length;
  const totalRevenue = revenueData?.totalRevenue ?? dashboardData?.totalRevenue ?? 0;
  const paidCash = revenueData?.paidByCash ?? 0;
  const paidTransfer = revenueData?.paidByTransfer ?? 0;
  const totalPaid = revenueData?.totalPaid ?? (paidCash + paidTransfer);
  const cashPercent = totalPaid > 0 ? Math.round((paidCash / totalPaid) * 100) : 0;
  const transferPercent = totalPaid > 0 ? Math.max(0, 100 - cashPercent) : 0;

  const totalRO = repairOrderData?.total ?? dashboardData?.totalRepairOrders ?? 0;
  const roCompleted = repairOrderData?.hoanTat ?? dashboardData?.repairOrdersCompleted ?? 0;
  const roInProgress = repairOrderData?.dangSua ?? dashboardData?.repairOrdersInProgress ?? 0;
  const totalAppts = appointmentData?.total ?? dashboardData?.totalAppointments ?? 0;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}
    >
      {/* 1. Tổng Doanh Thu */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '180px',
        }}
      >
        <div style={{ position: 'absolute', top: '10px', right: '12px', opacity: 0.08 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '64px', color: 'var(--color-primary)' }}>
            payments
          </span>
        </div>
        <div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-outline)',
            }}
          >
            Tổng Doanh Thu
          </span>
          <div
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: 'var(--color-primary)',
              marginTop: '4px',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {loading ? '...' : formatCurrency(totalRevenue)}
          </div>
        </div>

        {/* Breakdown Phương thức thanh toán: Tiền mặt vs Chuyển khoản */}
        <div style={{ marginTop: '10px', marginBottom: '10px' }}>
          {/* Segmented bar tỷ trọng */}
          <div
            style={{
              height: '6px',
              borderRadius: '3px',
              backgroundColor: '#e2e8f0',
              display: 'flex',
              overflow: 'hidden',
              marginBottom: '8px',
            }}
            title={`Tiền mặt: ${cashPercent}% | Chuyển khoản: ${transferPercent}%`}
          >
            <div
              style={{
                width: `${cashPercent}%`,
                backgroundColor: '#10b981',
                transition: 'width 0.3s ease',
              }}
            />
            <div
              style={{
                width: `${transferPercent}%`,
                backgroundColor: '#2563eb',
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          {/* 2 Badge chi tiết */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
              title={`Tiền mặt: ${formatCurrency(paidCash)} (${cashPercent}%)`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#059669', flexShrink: 0 }}>
                payments
              </span>
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: '0.675rem', color: '#059669', fontWeight: 600, textTransform: 'uppercase' }}>
                  Tiền mặt {totalPaid > 0 ? `(${cashPercent}%)` : ''}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#065f46',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {loading ? '...' : formatCurrency(paidCash)}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
              }}
              title={`Chuyển khoản: ${formatCurrency(paidTransfer)} (${transferPercent}%)`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#2563eb', flexShrink: 0 }}>
                account_balance
              </span>
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: '0.675rem', color: '#2563eb', fontWeight: 600, textTransform: 'uppercase' }}>
                  Chuyển khoản {totalPaid > 0 ? `(${transferPercent}%)` : ''}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#1e40af',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {loading ? '...' : formatCurrency(paidTransfer)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--color-outline)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
            ✓ Đã thu: {formatCurrency(totalPaid)}
          </span>
          {revenueData?.totalUnpaid && revenueData.totalUnpaid > 0 ? (
            <span style={{ color: 'var(--color-warning)' }}>
              • Còn nợ: {formatCurrency(revenueData.totalUnpaid)}
            </span>
          ) : null}
        </div>
      </div>

      {/* 2. Lệnh Sửa Chữa */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '135px',
        }}
      >
        <div style={{ position: 'absolute', top: '10px', right: '12px', opacity: 0.08 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '64px', color: 'var(--color-primary)' }}>
            build_circle
          </span>
        </div>
        <div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-outline)',
            }}
          >
            Lệnh sửa chữa
          </span>
          <div
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: 'var(--color-on-surface)',
              marginTop: '4px',
            }}
          >
            {loading ? '...' : totalRO}
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
            ✓ Xong: {roCompleted}
          </span>
          <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            ⚙ Đang sửa: {roInProgress}
          </span>
          {repairOrderData?.choXuLy ? (
            <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>
              ⏱ Chờ: {repairOrderData.choXuLy}
            </span>
          ) : null}
        </div>
      </div>

      {/* 3. Lịch Hẹn Khách Hàng */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '135px',
        }}
      >
        <div style={{ position: 'absolute', top: '10px', right: '12px', opacity: 0.08 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '64px', color: 'var(--color-primary)' }}>
            calendar_month
          </span>
        </div>
        <div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-outline)',
            }}
          >
            Lịch Hẹn Dịch Vụ
          </span>
          <div
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: 'var(--color-on-surface)',
              marginTop: '4px',
            }}
          >
            {loading ? '...' : totalAppts}
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
            Đã tiếp nhận: {appointmentData?.daTiepNhan ?? 0}
          </span>
          <span style={{ color: 'var(--color-outline)' }}>
            • Hủy: {appointmentData?.daHuy ?? 0}
          </span>
        </div>
      </div>

      {/* 4. Cảnh Báo Kho Phụ Tùng */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '135px',
        }}
      >
        <div style={{ position: 'absolute', top: '10px', right: '12px', opacity: 0.08 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '64px', color: lowStockCount > 0 ? 'var(--color-danger)' : 'var(--color-primary)' }}>
            inventory_2
          </span>
        </div>
        <div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-outline)',
            }}
          >
            Cảnh Báo Tồn Kho
          </span>
          <div
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: lowStockCount > 0 ? 'var(--color-danger)' : 'var(--color-success)',
              marginTop: '4px',
            }}
          >
            {loading ? '...' : lowStockCount}
            <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-outline)', marginLeft: '6px' }}>
              mặt hàng
            </span>
          </div>
        </div>
        <div style={{ fontSize: '0.75rem' }}>
          {lowStockCount > 0 ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--color-danger)',
                fontWeight: 600,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                warning
              </span>
              Cần kiểm tra và nhập bổ sung
            </span>
          ) : (
            <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
              Không có cảnh báo tồn kho
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
