import React, { useEffect, useState } from 'react';
import { AppointmentResponse } from '@/types/appointment.types';
import { appointmentService } from '@/features/appointments/services/appointment.service';
import { Button } from '@/components/common/Button';

interface SelectAppointmentCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAppointment: (app: AppointmentResponse) => void;
}

export const SelectAppointmentCheckInModal: React.FC<SelectAppointmentCheckInModalProps> = ({
  isOpen,
  onClose,
  onSelectAppointment,
}) => {
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableAppointments();
    }
  }, [isOpen]);

  const fetchAvailableAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await appointmentService.getAppointments();
      // Nghiệp vụ tiếp nhận: Chỉ tiếp nhận các lịch hẹn ĐÃ XÁC NHẬN (DA_XAC_NHAN)
      const available = data.filter((a) => a.trangThai === 'DA_XAC_NHAN');
      setAppointments(available);
    } catch (err: any) {
      console.error('Lỗi khi tải lịch hẹn:', err);
      setError('Không thể tải danh sách lịch hẹn chờ tiếp nhận.');
    } finally {
      setLoading(false);
    }
  };

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

  if (!isOpen) return null;

  const filtered = appointments.filter((a) => {
    const q = search.toLowerCase();
    return (
      (a.tenKhachHang && a.tenKhachHang.toLowerCase().includes(q)) ||
      (a.soDienThoaiKhachHang && a.soDienThoaiKhachHang.includes(q)) ||
      (a.bienSoXe && a.bienSoXe.toLowerCase().includes(q)) ||
      `#${a.maDatLich}`.includes(q)
    );
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '680px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title" style={{ margin: 0 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }}>
                event_available
              </span>
              Chọn Lịch Hẹn Cần Tiếp Nhận
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--color-outline)' }}>
              Chọn lịch hẹn đã xác nhận để tiếp nhận xe
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} type="button" aria-label="Đóng">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div className="alert alert-danger">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                error
              </span>
              <span>{error}</span>
            </div>
          )}

          {/* Search Input Box */}
          <div className="form-input-container">
            <span className="material-symbols-outlined form-input-icon">search</span>
            <input
              type="text"
              className="form-input has-left-icon"
              placeholder="Tìm theo mã lịch, tên khách hàng, số điện thoại hoặc biển số..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* List */}
          <div
            style={{
              maxHeight: '380px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              paddingRight: '4px',
            }}
          >
            {loading ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-outline)' }}>
                <div
                  className="spinner"
                  style={{
                    width: '30px',
                    height: '30px',
                    border: '3px solid var(--color-outline-variant)',
                    borderTopColor: 'var(--color-primary)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    margin: '0 auto 12px auto',
                  }}
                />
                Đang tải danh sách lịch hẹn...
              </div>
            ) : filtered.length === 0 ? (
              <div
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  color: 'var(--color-outline)',
                  backgroundColor: 'var(--color-surface-gray)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--color-border)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '36px', marginBottom: '6px' }}>
                  event_busy
                </span>
                <div style={{ fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>
                  Không có lịch hẹn đã xác nhận nào đang chờ tiếp nhận
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '4px' }}>
                  Hãy xác nhận lịch tại mục Lịch hẹn trước khi tiếp nhận xe.
                </div>
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.maDatLich}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: '#ffffff',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        backgroundColor: 'var(--color-surface-container)',
                        color: 'var(--color-primary)',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        flexShrink: 0,
                      }}
                    >
                      #{item.maDatLich}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--color-on-surface)', fontSize: '0.95rem' }}>
                        {item.tenKhachHang} — <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{item.bienSoXe}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '2px' }}>
                        {item.hangXe} {item.modelXe} {item.soDienThoaiKhachHang ? `• SĐT: ${item.soDienThoaiKhachHang}` : ''}
                      </div>
                      <div style={{ fontSize: '0.775rem', color: 'var(--color-outline)', marginTop: '3px' }}>
                        Hẹn lúc: <strong style={{ color: 'var(--color-on-surface)' }}>{formatDateTime(item.thoiGianHen)}</strong> • {item.tenChiNhanh}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => {
                      onClose();
                      onSelectAppointment(item);
                    }}
                    style={{ padding: '8px 16px', minHeight: '38px', flexShrink: 0 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '4px' }}>
                      fact_check
                    </span>
                    Tiếp nhận
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose} style={{ padding: '8px 20px' }}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};
