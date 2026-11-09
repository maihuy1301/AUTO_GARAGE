import React, { useState } from 'react';
import { BranchResponse } from '@/types/branch.types';
import { Button } from '@/components/common/Button';

interface BranchStatusModalProps {
  branch: BranchResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: number, nextStatus: boolean) => Promise<void>;
}

export const BranchStatusModal: React.FC<BranchStatusModalProps> = ({
  branch,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !branch) return null;

  const nextStatus = !branch.trangThai;
  const actionText = nextStatus ? 'kích hoạt hoạt động lại' : 'ngưng hoạt động (vô hiệu hóa)';

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(branch.maChiNhanh, nextStatus);
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('Không thể cập nhật trạng thái chi nhánh. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container small" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span
              className="material-symbols-outlined"
              style={{ color: nextStatus ? 'var(--success)' : 'var(--warning)' }}
            >
              {nextStatus ? 'check_circle' : 'pause_circle'}
            </span>
            <span>Xác nhận trạng thái chi nhánh</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Đóng">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
              <span className="material-symbols-outlined">error</span>
              <span>{error}</span>
            </div>
          )}

          <p style={{ color: 'var(--text-primary)', fontSize: '0.925rem', lineHeight: '1.5' }}>
            Bạn có chắc chắn muốn <strong>{actionText}</strong> cho chi nhánh{' '}
            <strong>{branch.tenChiNhanh}</strong> (Mã: #{branch.maChiNhanh})?
          </p>

          {!nextStatus && (
            <div
              style={{
                fontSize: '0.825rem',
                color: 'var(--text-secondary)',
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                marginTop: '12px',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--warning)' }}>
                info
              </span>
              <span>
                Chi nhánh ngưng hoạt động sẽ không nhận lịch hẹn hoặc tiếp nhận xe mới. Dữ liệu trước đó vẫn được giữ lại.
              </span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </button>
          <Button
            variant={nextStatus ? 'primary' : 'danger'}
            onClick={handleConfirm}
            isLoading={isSubmitting}
          >
            <span>{nextStatus ? 'Kích hoạt' : 'Ngưng hoạt động'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
