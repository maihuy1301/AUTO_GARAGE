import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AppointmentResponse, CreateAppointmentRequest } from '@/types/appointment.types';
import { BranchResponse } from '@/types/branch.types';
import { CustomerResponse } from '@/types/customer.types';
import { VehicleResponse } from '@/types/vehicle.types';
import { appointmentService } from '../services/appointment.service';
import { branchService } from '@/features/branches/services/branch.service';
import { customerService } from '@/features/customers/services/customer.service';
import { vehicleService } from '@/features/vehicles/services/vehicle.service';

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAppointment: AppointmentResponse) => void;
}

export const AppointmentFormModal: React.FC<AppointmentFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('ROLE_ADMIN');

  // Master data
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [allVehicles, setAllVehicles] = useState<VehicleResponse[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | ''>('');
  const [selectedBranchId, setSelectedBranchId] = useState<number | ''>('');
  const [thoiGianHen, setThoiGianHen] = useState('');
  const [ghiChu, setGhiChu] = useState('');

  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setSelectedCustomerId('');
    setSelectedVehicleId('');
    setSelectedBranchId('');
    setThoiGianHen('');
    setGhiChu('');

    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [branchesRes, vehiclesRes] = await Promise.all([
          branchService.getAll(),
          vehicleService.getAll(),
        ]);
        setBranches(branchesRes.filter((b) => b.trangThai !== false));
        setAllVehicles(vehiclesRes);

        if (isAdmin) {
          const customersRes = await customerService.getAll();
          setCustomers(customersRes.filter((c) => c.trangThai !== false));
        }
      } catch (err: any) {
        console.error('Lỗi khi tải dữ liệu cho form đặt lịch:', err);
        setError('Không thể tải danh sách chi nhánh hoặc xe. Vui lòng thử lại.');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [isOpen, isAdmin]);

  // Calculate available vehicles for selection
  const availableVehicles = React.useMemo(() => {
    if (!isAdmin) {
      return allVehicles;
    }
    if (selectedCustomerId === '') {
      return [];
    }
    return allVehicles.filter((v) => v.maKhachHang === Number(selectedCustomerId));
  }, [isAdmin, allVehicles, selectedCustomerId]);

  // Auto min datetime-local format: "YYYY-MM-DDTHH:mm"
  const minDateTime = React.useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (isAdmin && !selectedCustomerId) {
      setError('Vui lòng chọn khách hàng.');
      return;
    }

    if (!selectedVehicleId) {
      setError('Vui lòng chọn phương tiện / xe để đặt lịch.');
      return;
    }

    if (!selectedBranchId) {
      setError('Vui lòng chọn chi nhánh tiếp nhận.');
      return;
    }

    if (!thoiGianHen) {
      setError('Vui lòng chọn ngày và giờ hẹn.');
      return;
    }

    const pickedDate = new Date(thoiGianHen);
    if (isNaN(pickedDate.getTime()) || pickedDate <= new Date()) {
      setError('Thời gian hẹn phải ở thời điểm tương lai.');
      return;
    }

    if (ghiChu.length > 500) {
      setError('Ghi chú không được vượt quá 500 ký tự.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: CreateAppointmentRequest = {
        maXe: Number(selectedVehicleId),
        maChiNhanh: Number(selectedBranchId),
        thoiGianHen: thoiGianHen.length === 16 ? `${thoiGianHen}:00` : thoiGianHen,
        ghiChu: ghiChu.trim() || undefined,
      };

      if (isAdmin && selectedCustomerId) {
        payload.maKhachHang = Number(selectedCustomerId);
      }

      const res = await appointmentService.createAppointment(payload);
      onSuccess(res);
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi tạo lịch hẹn:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Không thể đặt lịch hẹn. Vui lòng kiểm tra lại thông tin.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }}>
              calendar_add_on
            </span>
            <span>{isAdmin ? 'Tạo Lịch Hẹn Mới (Admin)' : 'Đặt Lịch Hẹn Dịch Vụ'}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Đóng">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
                <span className="material-symbols-outlined">error</span>
                <span>{error}</span>
              </div>
            )}

            {loadingData ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-on-surface-variant)' }}>
                <span
                  className="material-symbols-outlined animate-spin"
                  style={{ fontSize: '32px', color: 'var(--color-primary)', marginBottom: '8px' }}
                >
                  progress_activity
                </span>
                <p style={{ fontSize: '0.875rem' }}>Đang tải danh sách chi nhánh và phương tiện...</p>
              </div>
            ) : (
              <>
                {/* Admin Select Customer */}
                {isAdmin && (
                  <div className="form-group">
                    <label className="form-label">
                      Khách Hàng <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <select
                      className="form-input"
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value ? Number(e.target.value) : '');
                        setSelectedVehicleId('');
                      }}
                      required
                    >
                      <option value="">-- Chọn khách hàng --</option>
                      {customers.map((c) => (
                        <option key={c.maKhachHang} value={c.maKhachHang}>
                          {c.hoTen} ({c.soDienThoai || `#${c.maKhachHang}`})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Select Vehicle */}
                <div className="form-group">
                  <label className="form-label">
                    Phương Tiện / Xe <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <select
                    className="form-input"
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value ? Number(e.target.value) : '')}
                    required
                    disabled={isAdmin && selectedCustomerId === ''}
                  >
                    <option value="">
                      {isAdmin && selectedCustomerId === ''
                        ? '-- Vui lòng chọn khách hàng trước --'
                        : availableVehicles.length === 0
                        ? '-- Chưa có xe nào (vui lòng thêm xe trước) --'
                        : '-- Chọn xe cần hẹn --'}
                    </option>
                    {availableVehicles.map((v) => (
                      <option key={v.maXe} value={v.maXe}>
                        {v.bienSo} — {v.tenHangXe || ''} {v.tenModel || ''} {v.namSanXuat ? `(${v.namSanXuat})` : ''}
                      </option>
                    ))}
                  </select>
                  {availableVehicles.length === 0 && (!isAdmin || selectedCustomerId !== '') && (
                    <p style={{ fontSize: '0.775rem', color: 'var(--color-warning)', marginTop: '4px' }}>
                      Khách hàng chưa có xe. Hãy thêm xe tại mục "Phương tiện / Xe" trước khi đặt lịch.
                    </p>
                  )}
                </div>

                {/* 2 Columns: Chi nhánh & Thời gian hẹn */}
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      Chi Nhánh Tiếp Nhận <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <select
                      className="form-input"
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : '')}
                      required
                    >
                      <option value="">-- Chọn chi nhánh gara --</option>
                      {branches.map((b) => (
                        <option key={b.maChiNhanh} value={b.maChiNhanh}>
                          {b.tenChiNhanh}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Thời Gian Hẹn <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <input
                      type="datetime-local"
                      min={minDateTime}
                      className="form-input"
                      value={thoiGianHen}
                      onChange={(e) => setThoiGianHen(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Ghi chú */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">Yêu Cầu / Ghi Chú Dịch Vụ</label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)' }}>
                      {ghiChu.length}/500
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={500}
                    placeholder="Ví dụ: bảo dưỡng 20.000 km, kiểm tra phanh, thay dầu nhớt..."
                    value={ghiChu}
                    onChange={(e) => setGhiChu(e.target.value)}
                    className="form-input"
                    style={{ height: 'auto', padding: '10px 12px', resize: 'vertical' }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={submitting}
              onClick={onClose}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || loadingData || availableVehicles.length === 0}
            >
              {submitting && (
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>
                  progress_activity
                </span>
              )}
              <span>{submitting ? 'Đang xử lý...' : 'Xác nhận đặt lịch'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
