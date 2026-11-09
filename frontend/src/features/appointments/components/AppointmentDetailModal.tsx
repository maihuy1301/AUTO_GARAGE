import React, { useEffect, useState } from 'react';
import { AppointmentResponse, AppointmentStatusLabels, AppointmentStatusTone } from '@/types/appointment.types';
import { appointmentService } from '../services/appointment.service';

interface AppointmentDetailModalProps {
  appointment: AppointmentResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenCancelModal?: (appointment: AppointmentResponse) => void;
  onConfirm?: (appointment: AppointmentResponse) => void;
  onReceive?: (appointment: AppointmentResponse) => void;
  canCancel?: boolean;
  canManageStatus?: boolean;
}

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  appointment,
  isOpen,
  onClose,
  onOpenCancelModal,
  onConfirm,
  onReceive,
  canCancel = false,
  canManageStatus = false,
}) => {
  const [detailData, setDetailData] = useState<AppointmentResponse | null>(appointment);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!isOpen || !appointment) {
      setDetailData(null);
      return;
    }
    setDetailData(appointment);
    // Nếu chưa có thông tin dịch vụ được nạp sẵn, chủ động gọi API lấy chi tiết
    if (appointment.dichVu === undefined) {
      setLoadingDetail(true);
      appointmentService
        .getAppointmentById(appointment.maDatLich)
        .then((res) => {
          if (res) setDetailData(res);
        })
        .catch((err) => {
          console.error('Lỗi khi tải chi tiết lịch hẹn:', err);
        })
        .finally(() => {
          setLoadingDetail(false);
        });
    }
  }, [isOpen, appointment]);

  if (!isOpen || !appointment) return null;

  const currentAppointment = detailData || appointment;

  const formatCurrency = (amount?: number | null) => {
    if (amount == null) return '0 ₫';
    return `${Number(amount).toLocaleString('vi-VN')} ₫`;
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const tone = AppointmentStatusTone[currentAppointment.trangThai] || 'gray';
  const statusLabel = AppointmentStatusLabels[currentAppointment.trangThai] || currentAppointment.trangThai;
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

  const isCancellable =
    canCancel && (currentAppointment.trangThai === 'CHO_XAC_NHAN' || currentAppointment.trangThai === 'DA_XAC_NHAN');

  const isConfirmable =
    canManageStatus && currentAppointment.trangThai === 'CHO_XAC_NHAN' && Boolean(onConfirm);

  const isReceivable =
    canManageStatus &&
    currentAppointment.trangThai === 'DA_XAC_NHAN' &&
    Boolean(onReceive);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container large" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }}>
              calendar_month
            </span>
            <span>Chi Tiết Lịch Hẹn #{currentAppointment.maDatLich}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Đóng">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Top Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              backgroundColor: 'var(--color-surface-container-low)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '20px',
              border: '1px solid var(--color-outline-variant)',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
                event
              </span>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    backgroundColor: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-outline-variant)',
                  }}
                >
                  #{currentAppointment.maDatLich}
                </span>
                <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
                Ngày tạo yêu cầu: {formatDateTime(currentAppointment.ngayDat)}
              </p>
            </div>
          </div>

          {/* Section: Thông tin lịch & địa điểm */}
          <h4
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-outline)',
              marginBottom: '10px',
            }}
          >
            Thời Gian & Chi Nhánh
          </h4>

          <div className="detail-grid">
            <div className="detail-item">
              <div className="detail-label">Thời Gian Hẹn</div>
              <div
                className="detail-value"
                style={{ color: 'var(--color-primary-container)', fontSize: '1rem', fontWeight: 700 }}
              >
                {formatDateTime(currentAppointment.thoiGianHen)}
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Chi Nhánh Tiếp Nhận</div>
              <div className="detail-value">
                {currentAppointment.tenChiNhanh || `Chi nhánh #${currentAppointment.maChiNhanh}`}
              </div>
            </div>
          </div>

          {/* Section: Khách hàng & Phương tiện */}
          <h4
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-outline)',
              marginBottom: '10px',
            }}
          >
            Khách Hàng & Phương Tiện
          </h4>

          <div className="detail-grid">
            <div className="detail-item">
              <div className="detail-label">Khách Hàng</div>
              <div className="detail-value">{currentAppointment.tenKhachHang || '—'}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Số Điện Thoại</div>
              <div className="detail-value">{currentAppointment.soDienThoaiKhachHang || '—'}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Biển Số Xe</div>
              <div className="detail-value">
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #fde68a',
                  }}
                >
                  {currentAppointment.bienSoXe || '—'}
                </span>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Hãng & Dòng Xe</div>
              <div className="detail-value">
                {currentAppointment.hangXe || '—'} {currentAppointment.modelXe || ''}
              </div>
            </div>
          </div>

          {/* Section: Dịch Vụ & Phụ Tùng Đã Đặt */}
          <div style={{ marginTop: '22px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h4
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--color-outline)',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-primary)' }}>
                  home_repair_service
                </span>
                Dịch Vụ & Phụ Tùng Khách Đã Đặt
              </h4>
              {currentAppointment.dichVu && currentAppointment.dichVu.length > 0 && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    color: 'var(--color-primary)',
                  }}
                >
                  {currentAppointment.dichVu.length} dịch vụ
                </span>
              )}
            </div>

            {loadingDetail ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  backgroundColor: 'var(--color-surface-container-low)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-on-surface-variant)',
                  fontSize: '0.875rem',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px', verticalAlign: 'middle', marginRight: '6px' }}>
                  sync
                </span>
                Đang tải giá dịch vụ và phụ tùng...
              </div>
            ) : currentAppointment.dichVu && currentAppointment.dichVu.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {currentAppointment.dichVu.map((svc, index) => (
                  <div
                    key={svc.maDichVu || index}
                    style={{
                      border: '1px solid var(--color-outline-variant)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#ffffff',
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--color-primary)',
                              color: '#ffffff',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {index + 1}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-on-surface)' }}>
                            {svc.tenDichVu}
                          </span>
                        </div>
                        {svc.moTa && (
                          <p style={{ margin: '4px 0 0 30px', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                            {svc.moTa}
                          </p>
                        )}
                        {svc.thoiGianDuKien && (
                          <div
                            style={{
                              margin: '4px 0 0 30px',
                              fontSize: '0.75rem',
                              color: 'var(--color-outline)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                              schedule
                            </span>
                            Thời gian dự kiến: ~{svc.thoiGianDuKien} giờ
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>Tiền công</div>
                        <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.95rem' }}>
                          {formatCurrency(svc.donGia)}
                        </div>
                      </div>
                    </div>

                    {/* Phụ tùng định mức kèm theo dịch vụ (nếu có) */}
                    {svc.parts && svc.parts.length > 0 && (
                      <div
                        style={{
                          marginTop: '12px',
                          marginLeft: '30px',
                          padding: '10px 14px',
                          backgroundColor: 'var(--color-surface-container-low)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px dashed var(--color-outline-variant)',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'var(--color-outline)',
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--color-primary)' }}>
                            build_circle
                          </span>
                          Phụ tùng định mức kèm theo ({svc.parts.length}):
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface-variant)' }}>
                              <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: 600 }}>Tên phụ tùng</th>
                              <th style={{ textAlign: 'center', padding: '4px 8px', fontWeight: 600 }}>SL</th>
                              <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>Đơn giá</th>
                              <th style={{ textAlign: 'right', padding: '4px 0', fontWeight: 600 }}>Thành tiền</th>
                            </tr>
                          </thead>
                          <tbody>
                            {svc.parts.map((part) => (
                              <tr key={part.maPhuTung} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                <td style={{ padding: '6px 0', color: 'var(--color-on-surface)' }}>
                                  {part.tenPhuTung}
                                </td>
                                <td style={{ textAlign: 'center', padding: '6px 8px', color: 'var(--color-on-surface-variant)' }}>
                                  {part.soLuong} {part.donViTinh || ''}
                                </td>
                                <td style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--color-on-surface-variant)' }}>
                                  {formatCurrency(part.donGia)}
                                </td>
                                <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                                  {formatCurrency(part.thanhTien)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div
                          style={{
                            marginTop: '8px',
                            textAlign: 'right',
                            fontSize: '0.75rem',
                            color: 'var(--color-on-surface-variant)',
                          }}
                        >
                          Tiền phụ tùng: <strong style={{ color: 'var(--color-on-surface)' }}>{formatCurrency(svc.tienPhuTungDuKien)}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Card tổng thành tiền ước tính */}
                <div
                  style={{
                    marginTop: '6px',
                    padding: '16px',
                    backgroundColor: 'var(--color-surface-container-low)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-outline-variant)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--color-on-surface-variant)' }}>Tiền công dịch vụ dự kiến:</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>
                      {formatCurrency(currentAppointment.tongTienDichVuDuKien)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--color-on-surface-variant)' }}>Tiền phụ tùng định mức dự kiến:</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>
                      {formatCurrency(currentAppointment.tongTienPhuTungDuKien)}
                    </span>
                  </div>
                  <div
                    style={{
                      borderTop: '1px dashed var(--color-outline-variant)',
                      paddingTop: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-on-surface)' }}>
                        TỔNG CHI PHÍ DỰ KIẾN:
                      </span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-outline)', marginTop: '2px' }}>
                        Giá dự kiến chưa bao gồm chi phí phát sinh sau khi kiểm tra xe.
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '1.35rem',
                        fontWeight: 800,
                        color: 'var(--color-primary)',
                      }}
                    >
                      {formatCurrency(currentAppointment.tongChiPhiDuKien)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: 'var(--color-surface-container-low)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--color-outline-variant)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span className="material-symbols-outlined" style={{ color: 'var(--color-outline)', fontSize: '24px' }}>
                  info
                </span>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                  Khách chưa chọn dịch vụ. Hãy xem ghi chú bên dưới để tư vấn khi tiếp nhận xe.
                </div>
              </div>
            )}
          </div>

          {/* Section: Ghi chú */}
          <h4
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-outline)',
              marginBottom: '10px',
            }}
          >
            Yêu Cầu & Ghi Chú Dịch Vụ
          </h4>

          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--color-surface-gray)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: '0.875rem',
              color: 'var(--color-on-surface)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {currentAppointment.ghiChu || 'Không có ghi chú thêm từ khách hàng.'}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* Xác nhận */}
            {isConfirmable && onConfirm && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                onClick={() => {
                  onClose();
                  onConfirm(currentAppointment);
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  check_circle
                </span>
                <span>Xác nhận lịch</span>
              </button>
            )}

            {/* Tiếp nhận */}
            {isReceivable && onReceive && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  onReceive(currentAppointment);
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  car_repair
                </span>
                <span>Tiếp nhận xe</span>
              </button>
            )}

            {/* Hủy */}
            {isCancellable && onOpenCancelModal && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  onClose();
                  onOpenCancelModal(currentAppointment);
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  cancel
                </span>
                <span>Hủy lịch</span>
              </button>
            )}
          </div>

          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
