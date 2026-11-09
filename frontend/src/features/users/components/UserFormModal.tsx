import React, { useState, useEffect, useMemo } from 'react';
import { UserResponse, CreateUserRequest, UpdateUserRequest } from '@/types/user.types';
import { RoleResponse, RoleLabels, RoleType } from '@/types/role.types';
import { roleService } from '@/features/roles/services/role.service';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';

interface UserFormModalProps {
  user: UserResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserRequest | UpdateUserRequest, isEdit: boolean) => Promise<void>;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  user,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { user: currentUser } = useAuth();
  const isSystemAdmin = (currentUser?.roles || []).includes('ROLE_ADMIN');
  const isEdit = !!user;

  // Form State
  const [tenDangNhap, setTenDangNhap] = useState<string>('');
  const [matKhau, setMatKhau] = useState<string>('');
  const [hoTen, setHoTen] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [soDienThoai, setSoDienThoai] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // Master Data State for Roles from Backend API
  const [availableRoles, setAvailableRoles] = useState<RoleResponse[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Filter roles based on current logged-in user hierarchy
  // ADMIN: can assign any role
  // MANAGER: can only assign roles lower than Manager (ROLE_FRONT_DESK, ROLE_TECHNICIAN, ROLE_CUSTOMER)
  const permittedRoles = useMemo(() => {
    if (isSystemAdmin) {
      return availableRoles;
    }
    // Manager cannot see or create ROLE_ADMIN or ROLE_MANAGER
    return availableRoles.filter(
      (r) => r.tenVaiTro !== 'ROLE_ADMIN' && r.tenVaiTro !== 'ROLE_MANAGER'
    );
  }, [availableRoles, isSystemAdmin]);

  // Fetch Roles Master Data via GET /api/roles
  useEffect(() => {
    if (!isOpen) return;

    const fetchRoles = async () => {
      try {
        setIsLoadingRoles(true);
        const roles = await roleService.getAll();
        setAvailableRoles(roles);
      } catch (err) {
        console.error('Failed to load roles master data:', err);
      } finally {
        setIsLoadingRoles(false);
      }
    };

    fetchRoles();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    setFieldErrors({});

    if (user) {
      // Edit mode
      setTenDangNhap(user.tenDangNhap || '');
      setMatKhau('');
      setHoTen(user.hoTen || '');
      setEmail(user.email || '');
      setSoDienThoai(user.soDienThoai || '');
      setSelectedRoles(user.roles || []);
    } else {
      // Create mode
      setTenDangNhap('');
      setMatKhau('');
      setHoTen('');
      setEmail('');
      setSoDienThoai('');
      setSelectedRoles(['ROLE_CUSTOMER']);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!isEdit) {
      if (!tenDangNhap.trim()) {
        errors.tenDangNhap = 'Vui lòng nhập tên đăng nhập';
      } else if (tenDangNhap.length < 3 || tenDangNhap.length > 50) {
        errors.tenDangNhap = 'Tên đăng nhập từ 3 đến 50 ký tự';
      }

      if (!matKhau) {
        errors.matKhau = 'Vui lòng nhập mật khẩu';
      } else if (matKhau.length < 6 || matKhau.length > 100) {
        errors.matKhau = 'Mật khẩu phải có từ 6 đến 100 ký tự';
      }
    }

    if (!hoTen.trim()) {
      errors.hoTen = 'Vui lòng nhập họ và tên';
    } else if (hoTen.length > 100) {
      errors.hoTen = 'Họ tên tối đa 100 ký tự';
    }

    if (email && email.length > 100) {
      errors.email = 'Email tối đa 100 ký tự';
    }

    if (soDienThoai && soDienThoai.length > 20) {
      errors.soDienThoai = 'Số điện thoại tối đa 20 ký tự';
    }

    if (selectedRoles.length === 0) {
      errors.roles = 'Vui lòng chọn ít nhất một vai trò phân quyền';
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
        const updatePayload: UpdateUserRequest = {
          hoTen: hoTen.trim(),
          email: email.trim() || undefined,
          soDienThoai: soDienThoai.trim() || undefined,
          roles: selectedRoles,
        };
        await onSubmit(updatePayload, true);
      } else {
        const createPayload: CreateUserRequest = {
          tenDangNhap: tenDangNhap.trim().toLowerCase(),
          matKhau: matKhau,
          hoTen: hoTen.trim(),
          email: email.trim() || undefined,
          soDienThoai: soDienThoai.trim() || undefined,
          roles: selectedRoles,
        };
        await onSubmit(createPayload, false);
      }
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setErrorMessage((err as { message: string }).message);
      } else {
        setErrorMessage('Đã xảy ra lỗi khi lưu thông tin người dùng.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }}>
              {isEdit ? 'manage_accounts' : 'person_add'}
            </span>
            <span>{isEdit ? `Cập nhật tài khoản: ${user?.tenDangNhap}` : 'Tạo tài khoản mới'}</span>
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

            {/* Credentials Row */}
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="usr-username">
                  Tên đăng nhập <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  id="usr-username"
                  type="text"
                  className={`form-input ${fieldErrors.tenDangNhap ? 'border-error' : ''}`}
                  placeholder="VD: admin_hcm, ktv_nam..."
                  value={tenDangNhap}
                  onChange={(e) => setTenDangNhap(e.target.value)}
                  disabled={isEdit}
                  maxLength={50}
                />
                {fieldErrors.tenDangNhap && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '2px' }}>
                    {fieldErrors.tenDangNhap}
                  </span>
                )}
              </div>

              {!isEdit ? (
                <div className="form-group">
                  <label className="form-label" htmlFor="usr-password">
                    Mật khẩu khởi tạo <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input
                    id="usr-password"
                    type="password"
                    className={`form-input ${fieldErrors.matKhau ? 'border-error' : ''}`}
                    placeholder="Tối thiểu 6 ký tự"
                    value={matKhau}
                    onChange={(e) => setMatKhau(e.target.value)}
                    maxLength={100}
                  />
                  {fieldErrors.matKhau && (
                    <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '2px' }}>
                      {fieldErrors.matKhau}
                    </span>
                  )}
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Mật khẩu</label>
                  <input
                    type="text"
                    className="form-input"
                    value="••••••••••••"
                    disabled
                    style={{ backgroundColor: 'var(--color-surface-gray)', color: 'var(--color-outline)' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)', marginTop: '2px' }}>
                    Mật khẩu hiện tại không hiển thị tại đây.
                  </span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="usr-fullname">
                  Họ và tên <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  id="usr-fullname"
                  type="text"
                  className={`form-input ${fieldErrors.hoTen ? 'border-error' : ''}`}
                  placeholder="Nhập họ và tên đầy đủ"
                  value={hoTen}
                  onChange={(e) => setHoTen(e.target.value)}
                  maxLength={100}
                />
                {fieldErrors.hoTen && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '2px' }}>
                    {fieldErrors.hoTen}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="usr-email">
                  Email
                </label>
                <input
                  id="usr-email"
                  type="email"
                  className={`form-input ${fieldErrors.email ? 'border-error' : ''}`}
                  placeholder="example@autocare.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={100}
                />
                {fieldErrors.email && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '2px' }}>
                    {fieldErrors.email}
                  </span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="usr-phone">
                Số điện thoại
              </label>
              <input
                id="usr-phone"
                type="tel"
                className={`form-input ${fieldErrors.soDienThoai ? 'border-error' : ''}`}
                placeholder="VD: 0912345678"
                value={soDienThoai}
                onChange={(e) => setSoDienThoai(e.target.value)}
                maxLength={20}
              />
              {fieldErrors.soDienThoai && (
                <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '2px' }}>
                  {fieldErrors.soDienThoai}
                </span>
              )}
            </div>

            {/* Role Selection from GET /api/roles Master Data */}
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">
                Vai trò phân quyền <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              {fieldErrors.roles && (
                <div style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: '8px' }}>
                  {fieldErrors.roles}
                </div>
              )}

              {isLoadingRoles ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-outline)', fontSize: '0.875rem' }}>
                  Đang tải danh sách vai trò...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {permittedRoles.map((r) => {
                    const roleKey = r.tenVaiTro;
                    const isChecked = selectedRoles.includes(roleKey);
                    const roleLabel = RoleLabels[roleKey as RoleType] || r.moTa || roleKey;
                    return (
                      <label
                        key={r.maVaiTro || roleKey}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '12px 16px',
                          backgroundColor: isChecked ? 'var(--color-surface-container-low)' : 'var(--color-surface-gray)',
                          border: `1px solid ${isChecked ? 'var(--color-primary-container)' : 'var(--color-border)'}`,
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRole(roleKey)}
                          style={{ marginTop: '3px' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-on-surface)', fontSize: '0.875rem' }}>
                            {roleLabel} ({roleKey})
                          </div>
                          {r.moTa && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '2px' }}>
                              {r.moTa}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                save
              </span>
              <span>{isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
