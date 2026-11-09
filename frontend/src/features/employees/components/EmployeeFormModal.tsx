import React, { useState, useEffect, useMemo } from 'react';
import { EmployeeResponse, CreateEmployeeRequest, UpdateEmployeeRequest } from '@/types/employee.types';
import { UserResponse } from '@/types/user.types';
import { BranchResponse } from '@/types/branch.types';
import { RoleLabels, RoleType } from '@/types/role.types';
import { userService } from '@/features/users/services/user.service';
import { branchService } from '@/features/branches/services/branch.service';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/common/Button';

interface EmployeeFormModalProps {
  employee: EmployeeResponse | null; // null => Create mode, non-null => Edit mode
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEmployeeRequest | UpdateEmployeeRequest, isEdit: boolean) => Promise<void>;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  employee,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { user } = useAuth();
  const isSystemAdmin = (user?.roles || []).includes('ROLE_ADMIN');
  const isEdit = !!employee;

  // Form State
  const [maNguoiDung, setMaNguoiDung] = useState<number | ''>('');
  const [maChiNhanh, setMaChiNhanh] = useState<number | ''>('');
  const [chucVu, setChucVu] = useState<string>('');
  const [ngayVaoLam, setNgayVaoLam] = useState<string>('');

  // Auxiliary data
  const [usersList, setUsersList] = useState<UserResponse[]>([]);
  const [branchesList, setBranchesList] = useState<BranchResponse[]>([]);
  const [isLoadingAux, setIsLoadingAux] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Filter accounts strictly by role:
  // - MUST NOT have ROLE_CUSTOMER
  // - MUST have employee roles: ROLE_FRONT_DESK, ROLE_TECHNICIAN (and ROLE_MANAGER if Admin)
  const eligibleEmployeeUsers = useMemo(() => {
    return usersList.filter((u) => {
      // Strictly exclude CUSTOMER accounts
      if (u.roles?.includes('ROLE_CUSTOMER')) {
        return false;
      }

      // Strictly exclude ADMIN accounts from being linked as standard employee profile
      if (u.roles?.includes('ROLE_ADMIN')) {
        return false;
      }

      if (!isSystemAdmin) {
        // Manager can only assign FRONT_DESK or TECHNICIAN users
        return u.roles?.some((r) => r === 'ROLE_FRONT_DESK' || r === 'ROLE_TECHNICIAN');
      }

      // Admin can assign MANAGER, FRONT_DESK, or TECHNICIAN users
      return u.roles?.some(
        (r) => r === 'ROLE_MANAGER' || r === 'ROLE_FRONT_DESK' || r === 'ROLE_TECHNICIAN'
      );
    });
  }, [usersList, isSystemAdmin]);

  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    setFieldErrors({});

    if (employee) {
      // Edit mode
      setMaNguoiDung(employee.maNguoiDung || '');
      setMaChiNhanh(employee.maChiNhanh || '');
      setChucVu(employee.chucVu || '');
      setNgayVaoLam(employee.ngayVaoLam || '');
    } else {
      // Create mode
      setMaNguoiDung('');
      setMaChiNhanh('');
      setChucVu('');
      setNgayVaoLam(new Date().toISOString().split('T')[0]);
    }

    // Load available branches and users for selection
    const fetchAuxData = async () => {
      try {
        setIsLoadingAux(true);
        const [branches, users] = await Promise.all([
          branchService.getAll().catch(() => []),
          userService.getAll().catch(() => []),
        ]);
        setBranchesList(branches);
        setUsersList(users);

        if (!employee && branches.length > 0 && !isSystemAdmin) {
          setMaChiNhanh(branches[0].maChiNhanh);
        }
      } catch {
        // Silently ignore aux fetch error
      } finally {
        setIsLoadingAux(false);
      }
    };

    fetchAuxData();
  }, [isOpen, employee, isSystemAdmin]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!isEdit) {
      if (!maNguoiDung) {
        errors.maNguoiDung = 'Vui lòng chọn hoặc nhập mã người dùng liên kết';
      }
    }

    if (!maChiNhanh) {
      errors.maChiNhanh = 'Vui lòng chọn chi nhánh làm việc';
    }

    if (chucVu && chucVu.length > 100) {
      errors.chucVu = 'Chức vụ tối đa 100 ký tự';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      if (isEdit) {
        const updatePayload: UpdateEmployeeRequest = {
          chucVu: chucVu.trim() || undefined,
          ngayVaoLam: ngayVaoLam || undefined,
          maChiNhanh: Number(maChiNhanh) || undefined,
        };
        await onSubmit(updatePayload, true);
      } else {
        const createPayload: CreateEmployeeRequest = {
          maNguoiDung: Number(maNguoiDung),
          maChiNhanh: Number(maChiNhanh),
          chucVu: chucVu.trim() || undefined,
          ngayVaoLam: ngayVaoLam || undefined,
        };
        await onSubmit(createPayload, false);
      }
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setErrorMessage((err as { message: string }).message);
      } else {
        setErrorMessage('Đã xảy ra lỗi khi lưu thông tin nhân viên.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }}>
              {isEdit ? 'edit' : 'person_add'}
            </span>
            <span>{isEdit ? `Cập nhật nhân viên: ${employee?.hoTen || `#${employee?.maNhanVien}`}` : 'Thêm nhân viên mới'}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Đóng">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body">
            {errorMessage && (
              <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
                <span className="material-symbols-outlined">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Create mode fields */}
            {!isEdit && (
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" htmlFor="emp-user">
                  Tài khoản người dùng (Nhân sự) <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                {eligibleEmployeeUsers.length > 0 ? (
                  <select
                    id="emp-user"
                    className={`form-input ${fieldErrors.maNguoiDung ? 'border-error' : ''}`}
                    value={maNguoiDung}
                    onChange={(e) => setMaNguoiDung(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">-- Chọn tài khoản nhân sự --</option>
                    {eligibleEmployeeUsers.map((u) => {
                      const roleTags = (u.roles || [])
                        .map((r) => RoleLabels[r as RoleType] || r)
                        .join(', ');
                      return (
                        <option key={u.maNguoiDung} value={u.maNguoiDung}>
                          {u.hoTen} ({u.tenDangNhap}) — [{roleTags}] (ID: #{u.maNguoiDung})
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div
                    style={{
                      padding: '12px 16px',
                      backgroundColor: 'var(--color-surface-gray)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px dashed var(--color-outline)',
                      fontSize: '0.85rem',
                      color: 'var(--color-outline)',
                    }}
                  >
                    Chưa có tài khoản để liên kết. Hãy tạo tài khoản Lễ tân hoặc Kỹ thuật viên trước.
                  </div>
                )}
                {fieldErrors.maNguoiDung && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '2px' }}>
                    {fieldErrors.maNguoiDung}
                  </span>
                )}
              </div>
            )}

            {/* General Fields */}
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="emp-branch">
                  Chi nhánh làm việc <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <select
                  id="emp-branch"
                  className={`form-input ${fieldErrors.maChiNhanh ? 'border-error' : ''}`}
                  value={maChiNhanh}
                  onChange={(e) => setMaChiNhanh(e.target.value ? Number(e.target.value) : '')}
                  disabled={!isSystemAdmin}
                >
                  <option value="">-- Chọn chi nhánh --</option>
                  {branchesList.map((b) => (
                    <option key={b.maChiNhanh} value={b.maChiNhanh}>
                      {b.tenChiNhanh}
                    </option>
                  ))}
                </select>
                {!isSystemAdmin && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)', marginTop: '2px' }}>
                    Bạn chỉ có thể thêm hoặc sửa nhân viên trong chi nhánh mình phụ trách.
                  </span>
                )}
                {fieldErrors.maChiNhanh && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '2px' }}>
                    {fieldErrors.maChiNhanh}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="emp-role-title">
                  Chức vụ
                </label>
                <input
                  id="emp-role-title"
                  type="text"
                  className={`form-input ${fieldErrors.chucVu ? 'border-error' : ''}`}
                  placeholder="VD: Kỹ thuật viên trưởng, Lễ tân, Quản lý..."
                  value={chucVu}
                  onChange={(e) => setChucVu(e.target.value)}
                  maxLength={100}
                />
                {fieldErrors.chucVu && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '2px' }}>
                    {fieldErrors.chucVu}
                  </span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="emp-start-date">
                Ngày vào làm
              </label>
              <input
                id="emp-start-date"
                type="date"
                className="form-input"
                value={ngayVaoLam}
                onChange={(e) => setNgayVaoLam(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isSubmitting || isLoadingAux}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                save
              </span>
              <span>{isEdit ? 'Lưu thay đổi' : 'Tạo nhân viên'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
