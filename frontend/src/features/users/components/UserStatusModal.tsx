import React, { useState } from 'react';
import { UserResponse } from '@/types/user.types';
import { Button } from '@/components/common/Button';

interface UserStatusModalProps {
  user: UserResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: number, nextStatus: boolean) => Promise<void>;
}

export const UserStatusModal: React.FC<UserStatusModalProps> = ({
  user,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const nextStatus = !user.trangThai;
  const actionText = nextStatus ? 'kích hoạt lại' : 'khóa tài khoản';
  const isSystemAdmin = user.roles?.includes('ROLE_ADMIN');

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(user.maNguoiDung, nextStatus);
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('Không thể cập nhật trạng thái tài khoản. Vui lòng thử lại.');
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
              style={{ color: nextStatus ? 'var(--color-success)' : 'var(--color-danger)' }}
            >
              {nextStatus ? 'check_circle' : 'warning'}
            </span>
            <span>Xác nhận trạng thái tài khoản</span>
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

          <p style={{ color: 'var(--color-on-surface)', fontSize: '0.925rem', lineHeight: '1.5' }}>
            Bạn có chắc chắn muốn <strong>{actionText}</strong> người dùng{' '}
            <strong>{user.hoTen}</strong> (Tên đăng nhập: <code>{user.tenDangNhap}</code>)?
          </p>

          {isSystemAdmin && !nextStatus && (
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--color-danger)',
                backgroundColor: 'var(--color-danger-bg)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                marginTop: '12px',
              }}
            >
              Đây là tài khoản quản trị viên. Không thể khóa nếu đây là quản trị viên duy nhất còn hoạt động.
            </p>
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
            <span>{nextStatus ? 'Kích hoạt' : 'Xác nhận khóa'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
