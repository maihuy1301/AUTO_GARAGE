import React, { useState } from 'react';
import { VehicleResponse } from '@/types/vehicle.types';
import { normalizeApiError } from '@/lib/api/error-handler';

interface VehicleDeleteModalProps {
  vehicle: VehicleResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (vehicle: VehicleResponse) => Promise<void>;
}

export const VehicleDeleteModal: React.FC<VehicleDeleteModalProps> = ({
  vehicle,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !vehicle) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setErrorMessage(null);
      await onConfirm(vehicle);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(normalizeApiError(err).message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '460px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title" style={{ color: 'var(--color-danger-red)' }}>
            <span className="material-symbols-outlined">warning</span>
            <span>Xác Nhận Xóa Phương Tiện</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Đóng" disabled={isDeleting}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {errorMessage && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--color-error-container)',
                color: 'var(--color-on-error-container)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.875rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                error
              </span>
              <span>{errorMessage}</span>
            </div>
          )}

          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--color-surface-container-low)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '1.3rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
                letterSpacing: '0.05em',
              }}
            >
              {vehicle.bienSo}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
              {vehicle.hangXe} {vehicle.model} {vehicle.namSanXuat ? `(Đời ${vehicle.namSanXuat})` : ''}
            </div>
            {vehicle.tenChuXe && (
              <div style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '2px' }}>
                Chủ sở hữu: <strong>{vehicle.tenChuXe}</strong>
              </div>
            )}
          </div>

          <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
            Bạn có chắc chắn muốn xóa phương tiện này khỏi hệ thống? Hành động này{' '}
            <strong style={{ color: 'var(--color-danger-red)' }}>không thể hoàn tác</strong>.
          </p>

          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--color-outline)',
              marginTop: '10px',
              lineHeight: 1.4,
            }}
          >
            Không thể xóa xe đã có lịch hẹn, phiếu tiếp nhận hoặc lệnh sửa chữa.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isDeleting}>
            Hủy bỏ
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ backgroundColor: 'var(--color-danger-red)', borderColor: 'var(--color-danger-red)' }}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <span className="spinner small" />
                <span>Đang xóa...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  delete_forever
                </span>
                <span>Xác nhận xóa</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
