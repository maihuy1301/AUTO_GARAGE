import React from 'react';
import { ReceptionResponse, ReceptionStatusTone, ReceptionStatusLabels } from '@/types/reception.types';
import { Button } from '@/components/common/Button';
import { ActionDropdown } from '@/components/common/ActionDropdown';

interface ReceptionTableProps {
  receptions: ReceptionResponse[];
  loading: boolean;
  repairOrderSlipIds?: Set<number>;
  onViewDetail: (reception: ReceptionResponse) => void;
  onCreateRepairOrder?: (reception: ReceptionResponse) => void;
}

export const ReceptionTable: React.FC<ReceptionTableProps> = ({
  receptions,
  loading,
  repairOrderSlipIds = new Set(),
  onViewDetail,
  onCreateRepairOrder,
}) => {
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const pageSize = 10;

  const totalPages = Math.ceil(receptions.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const displayedItems = receptions.slice(startIndex, startIndex + pageSize);

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="data-table-card" style={{ padding: '48px', textAlign: 'center' }}>
        <div
          className="spinner"
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid var(--color-outline-variant)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px auto',
          }}
        />
        <p style={{ color: 'var(--color-outline)', margin: 0, fontSize: '0.9rem' }}>
          Đang tải danh sách phiếu tiếp nhận...
        </p>
      </div>
    );
  }

  if (receptions.length === 0) {
    return (
      <div className="data-table-card" style={{ padding: '48px', textAlign: 'center' }}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '48px', color: 'var(--color-outline)', marginBottom: '12px' }}
        >
          fact_check
        </span>
        <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-on-surface)' }}>
          Không có phiếu tiếp nhận nào
        </h4>
        <p style={{ margin: 0, color: 'var(--color-outline)', fontSize: '0.875rem' }}>
          Không có phiếu tiếp nhận phù hợp. Thử đổi từ khóa hoặc bộ lọc.
        </p>
      </div>
    );
  }

  return (
    <div className="data-table-card">
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '90px', textAlign: 'center' }}>MÃ TN</th>
              <th>KHÁCH HÀNG</th>
              <th>PHƯƠNG TIỆN & ODO</th>
              <th>CHI NHÁNH & NV TIẾP NHẬN</th>
              <th>THỜI GIAN NHẬN</th>
              <th style={{ width: '150px', textAlign: 'center' }}>TRẠNG THÁI</th>
              <th style={{ width: '130px', textAlign: 'right', paddingRight: '16px' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {displayedItems.map((item) => {
              const tone = ReceptionStatusTone[item.trangThai] || 'primary';
              const statusLabel = ReceptionStatusLabels[item.trangThai] || item.trangThai;
              const hasOrder = repairOrderSlipIds.has(item.maTiepNhan);

              return (
                <tr key={item.maTiepNhan}>
                  {/* Mã tiếp nhận */}
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        backgroundColor: 'var(--color-surface-container)',
                        color: 'var(--color-primary)',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        display: 'inline-block',
                      }}
                    >
                      #{item.maTiepNhan}
                    </span>
                  </td>

                  {/* Khách hàng */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="data-table-avatar">
                        {item.tenKhachHang ? item.tenKhachHang.charAt(0).toUpperCase() : 'KH'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>
                          {item.tenKhachHang}
                        </div>
                        <div
                          style={{
                            fontSize: '0.775rem',
                            color: 'var(--color-outline)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '2px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                            call
                          </span>
                          <span>{item.soDienThoaiKhachHang || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Phương tiện & ODO */}
                  <td>
                    <div>
                      <span
                        style={{
                          display: 'inline-block',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid #fde68a',
                        }}
                      >
                        {item.bienSoXe}
                      </span>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '2px' }}>
                        {item.hangXe || ''} {item.modelXe || ''}
                      </div>
                      {item.soKm != null && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-outline)', marginTop: '2px' }}>
                          ODO: {item.soKm.toLocaleString('vi-VN')} km
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Chi nhánh & NV Tiếp nhận */}
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--color-on-surface)' }}>
                      {item.tenChiNhanh}
                    </div>
                    <div
                      style={{
                        fontSize: '0.775rem',
                        color: 'var(--color-outline)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '2px',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                        badge
                      </span>
                      <span>{item.tenNhanVienTiepNhan || 'Nhân viên tiếp nhận'}</span>
                    </div>
                  </td>

                  {/* Thời gian tiếp nhận */}
                  <td>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface)' }}>
                      {formatDateTime(item.thoiGianTiepNhan)}
                    </div>
                    {item.maDatLich && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '2px' }}>
                        Từ lịch hẹn #{item.maDatLich}
                      </div>
                    )}
                  </td>

                  {/* Trạng thái - Hiển thị badge chuẩn AutoCare Design System */}
                  <td style={{ textAlign: 'center' }}>
                    <span className={`status-badge ${tone}`}>
                      {statusLabel}
                    </span>
                  </td>

                  {/* Thao tác */}
                  <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                    <ActionDropdown
                      items={[
                        {
                          label: 'Xem biên bản tiếp nhận',
                          icon: 'visibility',
                          onClick: () => onViewDetail(item),
                        },
                        !hasOrder && onCreateRepairOrder
                          ? {
                              label: 'Tạo lệnh sửa chữa',
                              icon: 'construction',
                              variant: 'primary',
                              onClick: () => onCreateRepairOrder(item),
                            }
                          : false,
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div
          className="pagination-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--color-outline)' }}>
            Hiển thị {startIndex + 1} - {Math.min(startIndex + pageSize, receptions.length)} / {receptions.length} phiếu
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <Button
              variant="secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{ padding: '6px 12px', minHeight: 'auto' }}
            >
              Trang trước
            </Button>
            <Button
              variant="secondary"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{ padding: '6px 12px', minHeight: 'auto' }}
            >
              Trang sau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
