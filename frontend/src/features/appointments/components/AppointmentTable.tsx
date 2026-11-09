import React from 'react';
import { AppointmentResponse, AppointmentStatusLabels, AppointmentStatusTone } from '@/types/appointment.types';
import { EmptyState } from '@/components/common/EmptyState';
import { ActionDropdown } from '@/components/common/ActionDropdown';

interface AppointmentTableProps {
  appointments: AppointmentResponse[];
  loading: boolean;
  onViewDetail: (appointment: AppointmentResponse) => void;
  onCancel: (appointment: AppointmentResponse) => void;
  onConfirm?: (appointment: AppointmentResponse) => void;
  onReceive?: (appointment: AppointmentResponse) => void;
  canCancel: boolean;
  canManageStatus?: boolean;
}

export const AppointmentTable: React.FC<AppointmentTableProps> = ({
  appointments,
  loading,
  onViewDetail,
  onCancel,
  onConfirm,
  onReceive,
  canCancel,
  canManageStatus = false,
}) => {
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return { date: '—', time: '—' };
    try {
      const d = new Date(dateStr);
      const date = d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const time = d.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return { date, time };
    } catch {
      return { date: dateStr, time: '' };
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <span
          className="material-symbols-outlined animate-spin"
          style={{ fontSize: '36px', color: 'var(--color-primary-container)', marginBottom: '12px' }}
        >
          progress_activity
        </span>
        <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem', fontWeight: 500 }}>
          Đang tải danh sách lịch hẹn...
        </p>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <EmptyState
        title="Không tìm thấy lịch hẹn nào"
        description="Không có lịch hẹn phù hợp. Thử đổi từ khóa hoặc bộ lọc."
      />
    );
  }

  return (
    <div className="data-table-card">
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60px', textAlign: 'center' }}>Mã</th>
              <th>Khách Hàng</th>
              <th>Phương Tiện</th>
              <th>Chi Nhánh</th>
              <th>Thời Gian Hẹn</th>
              <th style={{ textAlign: 'center' }}>Trạng Thái</th>
              <th>Ghi Chú</th>
              <th style={{ textAlign: 'right', minWidth: '150px', paddingRight: '16px' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((item) => {
              const { date, time } = formatDateTime(item.thoiGianHen);
              const tone = AppointmentStatusTone[item.trangThai] || 'gray';
              const statusLabel = AppointmentStatusLabels[item.trangThai] || item.trangThai;

              const isCancellable =
                canCancel && (item.trangThai === 'CHO_XAC_NHAN' || item.trangThai === 'DA_XAC_NHAN');
              const isConfirmable =
                canManageStatus && item.trangThai === 'CHO_XAC_NHAN' && Boolean(onConfirm);
              const isReceivable =
                canManageStatus &&
                item.trangThai === 'DA_XAC_NHAN' &&
                Boolean(onReceive);

              const statusClass =
                tone === 'warning'
                  ? 'warning'
                  : tone === 'success'
                  ? 'success'
                  : tone === 'danger'
                  ? 'danger'
                  : tone === 'primary' || tone === 'info'
                  ? 'primary'
                  : '';

              return (
                <tr key={item.maDatLich}>
                  {/* Mã lịch */}
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        backgroundColor: 'var(--color-surface-container)',
                        color: 'var(--color-primary)',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        display: 'inline-block',
                      }}
                    >
                      #{item.maDatLich}
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
                          {item.tenKhachHang || `Khách hàng #${item.maKhachHang}`}
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

                  {/* Phương tiện */}
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
                        {item.bienSoXe || 'Chưa rõ biển số'}
                      </span>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '2px' }}>
                        {item.hangXe || ''} {item.modelXe || ''}
                      </div>
                    </div>
                  </td>

                  {/* Chi nhánh */}
                  <td>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                      {item.tenChiNhanh || `Chi nhánh #${item.maChiNhanh}`}
                    </span>
                  </td>

                  {/* Thời gian hẹn */}
                  <td>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-primary-container)' }}>
                        {time}
                      </div>
                      <div style={{ fontSize: '0.775rem', color: 'var(--color-on-surface-variant)' }}>
                        {date}
                      </div>
                    </div>
                  </td>

                  {/* Trạng thái */}
                  <td style={{ textAlign: 'center' }}>
                    <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
                  </td>

                  {/* Ghi chú */}
                  <td style={{ maxWidth: '220px' }}>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--color-on-surface-variant)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={item.ghiChu || 'Không có ghi chú'}
                    >
                      {item.ghiChu || '—'}
                    </div>
                  </td>

                  {/* Thao tác */}
                  <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                    <ActionDropdown
                      items={[
                        {
                          label: 'Xem chi tiết lịch hẹn',
                          icon: 'visibility',
                          onClick: () => onViewDetail(item),
                        },
                        isConfirmable && onConfirm
                          ? {
                              label: 'Xác nhận lịch hẹn',
                              icon: 'check_circle',
                              variant: 'success',
                              onClick: () => onConfirm(item),
                            }
                          : false,
                        isReceivable && onReceive
                          ? {
                              label: 'Tiếp nhận xe vào xưởng',
                              icon: 'car_repair',
                              variant: 'primary',
                              onClick: () => onReceive(item),
                            }
                          : false,
                        isCancellable
                          ? {
                              label: 'Hủy lịch hẹn',
                              icon: 'cancel',
                              variant: 'danger',
                              onClick: () => onCancel(item),
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
    </div>
  );
};
