import React, { useState } from 'react';
import { BranchResponse } from '@/types/branch.types';
import { Button } from '@/components/common/Button';

interface BranchDeleteModalProps {
  branch: BranchResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: number) => Promise<void>;
}

export const BranchDeleteModal: React.FC<BranchDeleteModalProps> = ({
  branch,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !branch) return null;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(branch.maChiNhanh);
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('Không thể xóa chi nhánh. Vui lòng kiểm tra ràng buộc dữ liệu.');
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
            <span className="material-symbols-outlined" style={{ color: 'var(--danger)' }}>
              warning
            </span>
            <span>Xác nhận xóa chi nhánh</span>
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
            Bạn có chắc chắn muốn xóa chi nhánh{' '}
            <strong>{branch.tenChiNhanh}</strong> (Mã: #{branch.maChiNhanh})?
          </p>

          <div
            style={{
              fontSize: '0.825rem',
              color: 'var(--danger)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              marginTop: '12px',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              report
            </span>
            <span>
              Chỉ xóa được chi nhánh chưa có nhân viên, lịch hẹn, phiếu sửa chữa hoặc dữ liệu kho. Nếu đã có dữ liệu, hãy chọn Ngưng hoạt động.
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            isLoading={isSubmitting}
          >
            <span>Xác nhận xóa</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
