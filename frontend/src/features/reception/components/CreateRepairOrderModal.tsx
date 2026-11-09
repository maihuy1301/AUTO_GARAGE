import React, { useState } from 'react';
import { ReceptionResponse } from '@/types/reception.types';
import { RepairOrderResponse } from '@/types/repair-order.types';
import { receptionService } from '../services/reception.service';
import { Button } from '@/components/common/Button';

interface CreateRepairOrderModalProps {
  isOpen: boolean;
  reception: ReceptionResponse | null;
  onClose: () => void;
  onSuccess: (repairOrder: RepairOrderResponse) => void;
}

export const CreateRepairOrderModal: React.FC<CreateRepairOrderModalProps> = ({
  isOpen,
  reception,
  onClose,
  onSuccess,
}) => {
  const [ghiChu, setGhiChu] = useState<string>('');
  const [thoiGianBatDau, setThoiGianBatDau] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (reception) {
      setGhiChu(reception.yeuCauKhachHang || '');
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setThoiGianBatDau(now.toISOString().slice(0, 16));
      setError(null);
    }
  }, [reception]);

  if (!isOpen || !reception) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await receptionService.createRepairOrder({
        maTiepNhan: reception.maTiepNhan,
        ghiChu: ghiChu.trim() || undefined,
        thoiGianBatDau: thoiGianBatDau ? new Date(thoiGianBatDau).toISOString() : undefined,
      });
      onSuccess(result);
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi tạo phiếu sửa chữa:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Không thể tạo phiếu sửa chữa. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '600px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title" style={{ margin: 0 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }}>
                build_circle
              </span>
              Tạo Lệnh Sửa Chữa
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--color-outline)' }}>
              Tạo lệnh sửa chữa từ phiếu tiếp nhận #{reception.maTiepNhan}
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
            style={{ display: 'flex', flexDirection: 'column', gap: '18px', flex: 1, minHeight: 0, overflowY: 'auto' }}
          >
            {error && (
              <div className="alert alert-danger">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  error
                </span>
                <span>{error}</span>
              </div>
            )}

            {/* Thông tin phiếu tiếp nhận */}
            <div
              style={{
                backgroundColor: 'var(--color-surface-container-low)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                border: '1px solid var(--color-border)',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Khách hàng
                </span>
                <div style={{ fontWeight: 600, color: 'var(--color-on-surface)', marginTop: '2px' }}>{reception.tenKhachHang}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '2px' }}>{reception.soDienThoaiKhachHang}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Phương tiện
                </span>
                <div style={{ fontWeight: 700, color: 'var(--color-primary)', marginTop: '2px' }}>{reception.bienSoXe}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '2px' }}>
                  {reception.hangXe} {reception.modelXe}
                </div>
              </div>
            </div>

            {/* Thời gian bắt đầu */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="ro-thoiGianBatDau">
                Thời gian bắt đầu dự kiến
              </label>
              <input
                id="ro-thoiGianBatDau"
                type="datetime-local"
                className="form-input"
                value={thoiGianBatDau}
                onChange={(e) => setThoiGianBatDau(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Ghi chú */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="ro-ghiChu">
                Ghi chú / Chỉ đạo sửa chữa
              </label>
              <textarea
                id="ro-ghiChu"
                className="form-input"
                style={{ height: 'auto', minHeight: '90px', resize: 'vertical', lineHeight: 1.5 }}
                placeholder="Nhập ghi chú hoặc yêu cầu sửa chữa cụ thể cho tổ kỹ thuật..."
                value={ghiChu}
                onChange={(e) => setGhiChu(e.target.value)}
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
                construction
              </span>
              Tạo Phiếu Sửa Chữa
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
