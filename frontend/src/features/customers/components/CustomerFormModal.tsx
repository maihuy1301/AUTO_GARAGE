import React, { useState, useEffect, useMemo } from 'react';
import { CustomerResponse, CreateCustomerRequest, UpdateCustomerRequest } from '@/types/customer.types';
import { UserResponse } from '@/types/user.types';
import { userService } from '@/features/users/services/user.service';
import { Button } from '@/components/common/Button';

interface CustomerFormModalProps {
  customer: CustomerResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCustomerRequest | UpdateCustomerRequest, isEdit: boolean) => Promise<void>;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  customer,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const isEdit = !!customer;

  // Form State
  const [maNguoiDung, setMaNguoiDung] = useState<number | ''>('');
  const [hoTen, setHoTen] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [soDienThoai, setSoDienThoai] = useState<string>('');
  const [diaChi, setDiaChi] = useState<string>('');
  const [ngaySinh, setNgaySinh] = useState<string>('');

  // Auxiliary
  const [usersList, setUsersList] = useState<UserResponse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Filter users to ONLY those who have ROLE_CUSTOMER and NOT any employee/admin roles
  const eligibleCustomerUsers = useMemo(() => {
    return usersList.filter((u) => {
      const isCustomer = u.roles?.includes('ROLE_CUSTOMER');
      const hasEmployeeOrAdminRole = u.roles?.some((r) =>
        ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_FRONT_DESK', 'ROLE_TECHNICIAN'].includes(r)
      );
      return isCustomer && !hasEmployeeOrAdminRole;
    });
  }, [usersList]);

  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    setFieldErrors({});

    if (customer) {
      // Edit mode
      setMaNguoiDung(customer.maNguoiDung || '');
      setHoTen(customer.hoTen || '');
      setEmail(customer.email || '');
      setSoDienThoai(customer.soDienThoai || '');
      setDiaChi(customer.diaChi || '');
      setNgaySinh(customer.ngaySinh || '');
    } else {
      // Create mode
      setMaNguoiDung('');
      setHoTen('');
      setEmail('');
      setSoDienThoai('');
      setDiaChi('');
      setNgaySinh('');
    }

    // Load available users for selection in Create mode
    if (!customer) {
      userService.getAll()
        .then((users) => setUsersList(users))
        .catch(() => setUsersList([]));
    }
  }, [isOpen, customer]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!isEdit) {
      if (!maNguoiDung) {
        errors.maNguoiDung = 'Vui lòng chọn tài khoản người dùng';
      }
    } else {
      if (hoTen && hoTen.length > 100) {
        errors.hoTen = 'Họ tên tối đa 100 ký tự';
      }
      if (email && email.length > 100) {
        errors.email = 'Email tối đa 100 ký tự';
      }
      if (soDienThoai && soDienThoai.length > 20) {
        errors.soDienThoai = 'Số điện thoại tối đa 20 ký tự';
      }
    }

    if (diaChi && diaChi.length > 255) {
      errors.diaChi = 'Địa chỉ tối đa 255 ký tự';
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
        const updatePayload: UpdateCustomerRequest = {
          hoTen: hoTen.trim() || undefined,
          email: email.trim() || undefined,
          soDienThoai: soDienThoai.trim() || undefined,
          diaChi: diaChi.trim() || undefined,
          ngaySinh: ngaySinh || undefined,
        };
        await onSubmit(updatePayload, true);
      } else {
        const createPayload: CreateCustomerRequest = {
          maNguoiDung: Number(maNguoiDung),
          diaChi: diaChi.trim() || undefined,
          ngaySinh: ngaySinh || undefined,
        };
        await onSubmit(createPayload, false);
      }
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setErrorMessage((err as { message: string }).message);
      } else {
        setErrorMessage('Đã xảy ra lỗi khi lưu thông tin khách hàng.');
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
            <span>{isEdit ? `Cập nhật khách hàng: ${customer?.hoTen || `#${customer?.maKhachHang}`}` : 'Thêm khách hàng mới'}</span>
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

            {/* Create mode: maNguoiDung */}
            {!isEdit ? (
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" htmlFor="cust-user">
                  Tài khoản người dùng (Khách hàng) <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                {eligibleCustomerUsers.length > 0 ? (
                  <select
                    id="cust-user"
                    className={`form-input ${fieldErrors.maNguoiDung ? 'border-error' : ''}`}
                    value={maNguoiDung}
                    onChange={(e) => setMaNguoiDung(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">-- Chọn tài khoản khách hàng --</option>
                    {eligibleCustomerUsers.map((u) => (
                      <option key={u.maNguoiDung} value={u.maNguoiDung}>
                        {u.hoTen} ({u.tenDangNhap}) — [Khách hàng] (ID: #{u.maNguoiDung})
                      </option>
                    ))}
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
                    Chưa có tài khoản để liên kết. Hãy tạo tài khoản Khách hàng trước.
                  </div>
                )}
                {fieldErrors.maNguoiDung && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '2px' }}>
                    {fieldErrors.maNguoiDung}
                  </span>
                )}
              </div>
            ) : (
              /* Edit mode: Editable user fields (hoTen, email, soDienThoai) */
              <>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="cust-name">
                      Họ và tên
                    </label>
                    <input
                      id="cust-name"
                      type="text"
                      className={`form-input ${fieldErrors.hoTen ? 'border-error' : ''}`}
                      placeholder="Nhập họ và tên khách hàng"
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
                    <label className="form-label" htmlFor="cust-email">
                      Email liên hệ
                    </label>
                    <input
                      id="cust-email"
                      type="email"
                      className={`form-input ${fieldErrors.email ? 'border-error' : ''}`}
                      placeholder="example@gmail.com"
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
                  <label className="form-label" htmlFor="cust-phone">
                    Số điện thoại
                  </label>
                  <input
                    id="cust-phone"
                    type="tel"
                    className={`form-input ${fieldErrors.soDienThoai ? 'border-error' : ''}`}
                    placeholder="VD: 0901234567"
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
              </>
            )}

            {/* General fields: diaChi & ngaySinh */}
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="cust-address">
                  Địa chỉ
                </label>
                <input
                  id="cust-address"
                  type="text"
                  className={`form-input ${fieldErrors.diaChi ? 'border-error' : ''}`}
                  placeholder="Nhập địa chỉ liên hệ"
                  value={diaChi}
                  onChange={(e) => setDiaChi(e.target.value)}
                  maxLength={255}
                />
                {fieldErrors.diaChi && (
                  <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '2px' }}>
                    {fieldErrors.diaChi}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="cust-dob">
                  Ngày sinh
                </label>
                <input
                  id="cust-dob"
                  type="date"
                  className="form-input"
                  value={ngaySinh}
                  onChange={(e) => setNgaySinh(e.target.value)}
                />
              </div>
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
              <span>{isEdit ? 'Lưu thay đổi' : 'Tạo khách hàng'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
