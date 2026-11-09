import React from 'react';
import { InventoryReportResponseData } from '../types/report.types';

interface InventoryAlertTableProps {
  inventory: InventoryReportResponseData[];
  loading: boolean;
  selectedBranchName?: string;
}

export const InventoryAlertTable: React.FC<InventoryAlertTableProps> = ({
  inventory,
  loading,
  selectedBranchName,
}) => {
  // Sort by low stock warning first
  const sorted = [...inventory].sort((a, b) => {
    const stockA = a.soLuongTon ?? a.stockQuantity ?? 0;
    const minA = a.soLuongToiThieu ?? a.minQuantity ?? 0;
    const isWarnA = a.sapHetHang ?? a.warningLowStock ?? (stockA <= minA);

    const stockB = b.soLuongTon ?? b.stockQuantity ?? 0;
    const minB = b.soLuongToiThieu ?? b.minQuantity ?? 0;
    const isWarnB = b.sapHetHang ?? b.warningLowStock ?? (stockB <= minB);

    if (isWarnA && !isWarnB) return -1;
    if (!isWarnA && isWarnB) return 1;
    return stockA - stockB;
  });

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '24px',
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            Tồn Kho Phụ Tùng & Cảnh Báo
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '2px' }}>
            Xem số lượng tồn và phụ tùng cần nhập thêm
          </p>
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '4px 10px',
            backgroundColor: 'var(--color-surface-container)',
            color: 'var(--color-primary)',
            borderRadius: '9999px',
          }}
        >
          {inventory.length} mặt hàng
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '120px' }}>Mã phụ tùng</th>
              <th>Tên phụ tùng</th>
              <th>Chi nhánh</th>
              <th style={{ textAlign: 'center' }}>Số lượng tồn</th>
              <th style={{ textAlign: 'center' }}>Tối thiểu (An toàn)</th>
              <th style={{ textAlign: 'center', width: '160px' }}>Tình trạng</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-outline)' }}>
                  Đang nạp báo cáo tồn kho...
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-outline)' }}>
                  Chưa có dữ liệu tồn kho phụ tùng
                </td>
              </tr>
            ) : (
              sorted.map((item, idx) => {
                const partId = item.maPhuTung ?? item.partId ?? idx + 1;
                const partCode = item.maPhuTungCode || item.partCode || `PT#${partId}`;
                const partName = item.tenPhuTung || item.partName || `Phụ tùng #${partId}`;
                const branch = item.tenChiNhanh || item.branchName || selectedBranchName || '—';
                const stock = item.soLuongTon ?? item.stockQuantity ?? 0;
                const min = item.soLuongToiThieu ?? item.minQuantity ?? 0;
                const isCritical = stock <= 0;
                const isWarning = item.sapHetHang ?? item.warningLowStock ?? (stock <= min);

                return (
                  <tr
                    key={partId}
                    style={{
                      backgroundColor: isCritical
                        ? 'rgba(220, 38, 38, 0.04)'
                        : isWarning
                        ? 'rgba(245, 158, 11, 0.04)'
                        : undefined,
                    }}
                  >
                    <td>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          backgroundColor: 'var(--color-surface-container)',
                          color: 'var(--color-primary)',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        {partCode}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>
                        {partName}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.825rem', color: 'var(--color-on-surface-variant)' }}>
                        {branch}
                      </span>
                    </td>
                    <td
                      style={{
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        color: isCritical
                          ? 'var(--color-danger)'
                          : isWarning
                          ? 'var(--color-warning)'
                          : 'var(--color-success)',
                      }}
                    >
                      {stock}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--color-outline)' }}>
                      {min}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isCritical ? (
                        <span
                          style={{
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            borderRadius: '9999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                            error
                          </span>
                          Hết hàng
                        </span>
                      ) : isWarning ? (
                        <span
                          style={{
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            borderRadius: '9999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                            warning
                          </span>
                          Sắp hết
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            padding: '3px 8px',
                            backgroundColor: '#ecfdf5',
                            color: '#065f46',
                            borderRadius: '9999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                            check_circle
                          </span>
                          Đủ hàng
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
