import React, { useState } from 'react';
import { AppointmentResponse } from '@/types/appointment.types';
import { CheckInRequest, ReceptionResponse } from '@/types/reception.types';
import { receptionService } from '../services/reception.service';
import { Button } from '@/components/common/Button';

interface CheckInModalProps {
  isOpen: boolean;
  appointment: AppointmentResponse | null;
  onClose: () => void;
  onSuccess: (reception: ReceptionResponse) => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  isOpen,
  appointment,
  onClose,
  onSuccess,
}) => {
  const [soKm, setSoKm] = useState<string>('');
  const [tinhTrangNgoaiThat, setTinhTrangNgoaiThat] = useState<string>('');
  const [yeuCauKhachHang, setYeuCauKhachHang] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Điền sẵn thông tin khi mở modal
  React.useEffect(() => {
    if (appointment) {
      setSoKm('');
      setTinhTrangNgoaiThat('');
      setYeuCauKhachHang(appointment.ghiChu || '');
      setError(null);
    }
  }, [appointment]);

  if (!isOpen || !appointment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: CheckInRequest = {
        soKm: soKm ? parseInt(soKm, 10) : undefined,
        tinhTrangNgoaiThat: tinhTrangNgoaiThat.trim() || undefined,
        yeuCauKhachHang: yeuCauKhachHang.trim() || undefined,
      };

      const result = await receptionService.checkIn(appointment.maDatLich, payload);
      onSuccess(result);
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi tiếp nhận xe:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Tiếp nhận xe thất bại. Vui lòng kiểm tra lại thông tin.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '640px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title" style={{ margin: 0 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }}>
                fact_check
              </span>
              Tiếp Nhận Xe — Lịch Hẹn #{appointment.maDatLich}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--color-outline)' }}>
              Ghi thông tin và tình trạng xe khi vào xưởng
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} type="button" aria-label="Đóng">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
        >
          <div
            className="modal-body"
            style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: 0, overflowY: 'auto' }}
          >
            {error && (
              <div className="alert alert-danger">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  error
                </span>
                <span>{error}</span>
              </div>
            )}

            {/* Thông tin vắn tắt từ lịch hẹn */}
            <div
              style={{
                backgroundColor: 'var(--color-surface-container-low)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px 18px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '14px',
                border: '1px solid var(--color-border)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Khách hàng
                </span>
                <div style={{ fontWeight: 600, color: 'var(--color-on-surface)', marginTop: '2px', fontSize: '0.95rem' }}>
                  {appointment.tenKhachHang}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '2px' }}>
                  {appointment.soDienThoaiKhachHang || '—'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Phương tiện
                </span>
                <div style={{ fontWeight: 700, color: 'var(--color-primary)', marginTop: '2px', fontSize: '0.95rem' }}>
                  {appointment.bienSoXe}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '2px' }}>
                  {appointment.hangXe} {appointment.modelXe}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--color-border)', paddingTop: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Chi nhánh tiếp nhận
                </span>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)', marginTop: '2px' }}>
                  {appointment.tenChiNhanh}
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="checkin-soKm">
                Số Kilomet hiện tại (ODO) <span style={{ color: 'var(--color-outline)', fontWeight: 'normal' }}>(km)</span>
              </label>
              <div className="form-input-container">
                <input
                  id="checkin-soKm"
                  type="number"
                  min="0"
                  className="form-input has-right-icon"
                  placeholder="Ví dụ: 45000"
                  value={soKm}
                  onChange={(e) => setSoKm(e.target.value)}
                  disabled={loading}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--color-outline)',
                    pointerEvents: 'none',
                  }}
                >
                  km
                </span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="checkin-tinhTrang">
                Tình trạng ngoại thất / Phụ kiện xe khi tiếp nhận
              </label>
              <textarea
                id="checkin-tinhTrang"
                className="form-input"
                style={{ height: 'auto', minHeight: '80px', resize: 'vertical', lineHeight: 1.5 }}
                placeholder="Ví dụ: trầy cản sau, móp cửa trái, có camera hành trình..."
                value={tinhTrangNgoaiThat}
                onChange={(e) => setTinhTrangNgoaiThat(e.target.value)}
                disabled={loading}
                maxLength={1000}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="checkin-yeuCau">
                Yêu cầu / Ghi chú của khách hàng
              </label>
              <textarea
                id="checkin-yeuCau"
                className="form-input"
                style={{ height: 'auto', minHeight: '80px', resize: 'vertical', lineHeight: 1.5 }}
                placeholder="Khách hàng yêu cầu kiểm tra những hạng mục nào..."
                value={yeuCauKhachHang}
                onChange={(e) => setYeuCauKhachHang(e.target.value)}
                disabled={loading}
                maxLength={1000}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>
                check_circle
              </span>
              Xác Nhận Tiếp Nhận Xe
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
