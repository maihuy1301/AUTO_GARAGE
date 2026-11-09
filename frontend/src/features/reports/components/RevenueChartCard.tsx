import React, { useState } from 'react';
import { RevenueReportResponseData, BranchReportResponseData } from '../types/report.types';

interface RevenueChartCardProps {
  revenueData: RevenueReportResponseData | null;
  branchData: BranchReportResponseData[];
  isAdmin: boolean;
  loading: boolean;
}

export const RevenueChartCard: React.FC<RevenueChartCardProps> = ({
  revenueData,
  branchData,
  isAdmin,
  loading,
}) => {
  const [viewMode, setViewMode] = useState<'period' | 'branch'>('period');

  const formatCurrencyShort = (amount: number) => {
    if (amount >= 1_000_000_000) {
      return (amount / 1_000_000_000).toFixed(1) + 'B';
    }
    if (amount >= 1_000_000) {
      return (amount / 1_000_000).toFixed(1) + 'M';
    }
    if (amount >= 1_000) {
      return (amount / 1_000).toFixed(0) + 'K';
    }
    return amount.toString();
  };

  const formatCurrencyFull = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Determine items to display in the chart
  const items =
    viewMode === 'branch' && isAdmin && branchData.length > 0
      ? branchData.map((b) => ({
          label: b.tenChiNhanh,
          value: b.doanhThu || 0,
          subLabel: `${b.soPhieuHoanTat || 0} lệnh hoàn tất`,
        }))
      : (revenueData?.periods || []).map((p) => ({
          label: p.period,
          value: p.revenue || 0,
          subLabel: `${p.invoiceCount || 0} hóa đơn`,
        }));

  const maxValue = Math.max(...items.map((i) => i.value), 10_000_000);

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        padding: '24px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        marginBottom: '24px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            Biểu Đồ Doanh Thu
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '2px' }}>
            {viewMode === 'branch'
              ? 'So sánh tỷ trọng doanh thu giữa các chi nhánh'
              : 'Doanh thu theo thời gian đã chọn'}
          </p>
        </div>

        {/* View mode toggle (only for Admin when branchData available) */}
        {isAdmin && branchData.length > 0 && (
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: 'var(--color-surface-gray)',
              padding: '3px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('period')}
              style={{
                padding: '5px 12px',
                fontSize: '0.775rem',
                fontWeight: viewMode === 'period' ? 600 : 500,
                borderRadius: 'var(--radius-sm)',
                color: viewMode === 'period' ? 'var(--color-primary)' : 'var(--color-outline)',
                backgroundColor: viewMode === 'period' ? '#ffffff' : 'transparent',
                boxShadow: viewMode === 'period' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Theo thời gian
            </button>
            <button
              type="button"
              onClick={() => setViewMode('branch')}
              style={{
                padding: '5px 12px',
                fontSize: '0.775rem',
                fontWeight: viewMode === 'branch' ? 600 : 500,
                borderRadius: 'var(--radius-sm)',
                color: viewMode === 'branch' ? 'var(--color-primary)' : 'var(--color-outline)',
                backgroundColor: viewMode === 'branch' ? '#ffffff' : 'transparent',
                boxShadow: viewMode === 'branch' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Theo chi nhánh
            </button>
          </div>
        )}
      </div>

      {/* Bar Chart Area */}
      {loading ? (
        <div
          style={{
            height: '260px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-outline)',
            fontSize: '0.875rem',
          }}
        >
          Đang nạp dữ liệu biểu đồ...
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            height: '240px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-outline)',
            fontSize: '0.85rem',
            backgroundColor: 'var(--color-surface-gray)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--color-border)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '36px', marginBottom: '8px', opacity: 0.5 }}>
            bar_chart
          </span>
          Chưa có dữ liệu doanh thu trong khoảng thời gian đã chọn
        </div>
      ) : (
        <div style={{ position: 'relative', minHeight: '260px', paddingTop: '20px' }}>
          {/* Chart Grid Lines */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '0',
              right: '0',
              bottom: '50px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          >
            {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
              <div
                key={ratio}
                style={{
                  borderBottom: '1px dashed #e2e8f0',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    right: '0',
                    top: '-10px',
                    fontSize: '0.65rem',
                    color: '#94a3b8',
                    backgroundColor: '#ffffff',
                    padding: '0 4px',
                  }}
                >
                  {formatCurrencyShort(maxValue * ratio)}
                </span>
              </div>
            ))}
          </div>

          {/* Bars Container */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-around',
              gap: '12px',
              height: '220px',
              borderBottom: '2px solid var(--color-border)',
              paddingBottom: '0',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {items.map((item, idx) => {
              const heightPercent = Math.max(Math.round((item.value / maxValue) * 100), 4);
              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                    maxWidth: '80px',
                  }}
                  title={`${item.label}: ${formatCurrencyFull(item.value)} (${item.subLabel})`}
                >
                  {/* Tooltip on top of bar */}
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                      marginBottom: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.value > 0 ? formatCurrencyShort(item.value) : '0'}
                  </span>

                  {/* The Bar */}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '44px',
                      height: `${heightPercent}%`,
                      backgroundColor: 'var(--color-primary)',
                      backgroundImage: 'linear-gradient(to top, var(--color-primary), #1e3a8a)',
                      borderRadius: '6px 6px 0 0',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0, 35, 111, 0.2)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-secondary-container)';
                      e.currentTarget.style.backgroundImage = 'none';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                      e.currentTarget.style.backgroundImage = 'linear-gradient(to top, var(--color-primary), #1e3a8a)';
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Labels Below Bars */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              gap: '12px',
              marginTop: '8px',
            }}
          >
            {items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  maxWidth: '80px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--color-on-surface)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={item.label}
              >
                {item.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
