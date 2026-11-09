import React, { useState, useEffect } from 'react';
import { RepairOrderResponse } from '@/types/repair-order.types';
import { EmployeeResponse } from '@/types/employee.types';
import { employeeService } from '@/features/employees/services/employee.service';
import { assignmentService } from '../services/assignment.service';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/common/Button';

interface AssignTechnicianModalProps {
  isOpen: boolean;
  repairOrder: RepairOrderResponse | null;
  onClose: () => void;
  onSuccess: (orderId: number) => void;
}

export const AssignTechnicianModal: React.FC<AssignTechnicianModalProps> = ({
  isOpen,
  repairOrder,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [technicians, setTechnicians] = useState<EmployeeResponse[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<number | ''>('');
  const [ghiChu, setGhiChu] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingTechs, setFetchingTechs] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isReceptionist = user?.roles?.includes('ROLE_FRONT_DESK') && !user?.roles?.includes('ROLE_MANAGER') && !user?.roles?.includes('ROLE_ADMIN');

  useEffect(() => {
    if (isOpen && repairOrder) {
      setSelectedTechId('');
      setGhiChu('');
      setError(null);
      fetchTechnicians();
    }
  }, [isOpen, repairOrder]);

  const fetchTechnicians = async () => {
    try {
      setFetchingTechs(true);
      const employees = await employeeService.getAll();
      const techList = employees.filter((emp) => {
        if (!emp.trangThai) return false;
        if (repairOrder?.maChiNhanh && emp.maChiNhanh && emp.maChiNhanh !== repairOrder.maChiNhanh) {
          return false;
        }
        // Chỉ hiển thị nhân viên có role TECHNICIAN (hoặc chức vụ kỹ thuật viên/thợ máy)
        const isTechRole = emp.roles?.includes('ROLE_TECHNICIAN');
        const isTechTitle = emp.chucVu?.toLowerCase().includes('kỹ thuật') ||
                            emp.chucVu?.toLowerCase().includes('thợ') ||
                            emp.chucVu?.toLowerCase().includes('technician');
        const isOtherRole = emp.roles?.some((r) => r === 'ROLE_MANAGER' || r === 'ROLE_FRONT_DESK' || r === 'ROLE_ADMIN');
        return Boolean(isTechRole || (isTechTitle && !isOtherRole));
      });
      setTechnicians(techList);
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách kỹ thuật viên:', err);
      setError('Không thể tải danh sách kỹ thuật viên');
    } finally {
      setFetchingTechs(false);
    }
  };

  if (!isOpen || !repairOrder) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTechId) {
      setError('Vui lòng chọn kỹ thuật viên');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await assignmentService.createAssignment(repairOrder.maPhieuSuaChua, {
        technicianId: Number(selectedTechId),
        ghiChu: ghiChu.trim() || undefined,
      });
      onSuccess(repairOrder.maPhieuSuaChua);
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi phân công:', err);
      const msg = err.response?.data?.message || err.message || 'Không thể tạo phân công. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '540px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--color-primary)' }}>
              person_add
            </span>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                Phân Công Kỹ Thuật Viên
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-outline)', fontWeight: 400 }}>
                Phiếu sửa chữa #{repairOrder.maPhieuSuaChua} • {repairOrder.bienSoXe} ({repairOrder.tenChiNhanh})
              </div>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Workflow Notice Banner */}
            {isReceptionist ? (
              <div className="alert alert-warning" style={{ margin: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  info
                </span>
                <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                  <strong>Lễ tân phân công:</strong> Phân công sẽ ở trạng thái{' '}
                  <span className="status-badge warning" style={{ padding: '2px 6px', fontSize: '0.75rem' }}>
                    Chờ duyệt
                  </span>
                  . Sau khi <strong>Quản lý chi nhánh phê duyệt</strong>, Kỹ thuật viên mới thấy công việc.
                </div>
              </div>
            ) : (
              <div className="alert alert-info" style={{ margin: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  verified
                </span>
                <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                  <strong>Quản lý phân công:</strong> Phân công sẽ được{' '}
                  <span className="status-badge success" style={{ padding: '2px 6px', fontSize: '0.75rem' }}>
                    Duyệt ngay
                  </span>{' '}
                  và hiển thị ngay cho Kỹ thuật viên.
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="alert alert-danger" style={{ margin: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  error
                </span>
                <span>{error}</span>
              </div>
            )}

            {/* Select Technician */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                Chọn Kỹ thuật viên <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <select
                className="filter-select"
                style={{ width: '100%', height: '42px', backgroundColor: '#ffffff' }}
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value ? Number(e.target.value) : '')}
                disabled={fetchingTechs || loading}
                required
              >
                <option value="">-- Chọn kỹ thuật viên --</option>
                {technicians.map((tech) => (
                  <option key={tech.maNhanVien} value={tech.maNhanVien}>
                    {tech.hoTen || tech.tenDangNhap || `KTV #${tech.maNhanVien}`} {tech.chucVu ? `(${tech.chucVu})` : ''} - {tech.tenChiNhanh || ''}
                  </option>
                ))}
              </select>
              {fetchingTechs && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-outline)', marginTop: '4px' }}>
                  Đang tải danh sách kỹ thuật viên...
                </div>
              )}
            </div>

            {/* Note / Vai tro */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                Ghi chú / Vai trò công việc
              </label>
              <textarea
                className="filter-select"
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '10px 12px',
                  fontFamily: 'inherit',
                  backgroundColor: '#ffffff',
                  resize: 'vertical',
                }}
                placeholder="Ví dụ: Phụ trách bảo dưỡng hệ thống phanh, kiểm tra động cơ..."
                value={ghiChu}
                onChange={(e) => setGhiChu(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={onClose} disabled={loading} style={{ padding: '8px 16px', minHeight: 'auto' }}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={loading || !selectedTechId} style={{ padding: '8px 16px', minHeight: 'auto' }}>
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px', marginRight: '6px' }}>
                    progress_activity
                  </span>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>
                    send
                  </span>
                  {isReceptionist ? 'Gửi duyệt phân công' : 'Xác nhận phân công'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
