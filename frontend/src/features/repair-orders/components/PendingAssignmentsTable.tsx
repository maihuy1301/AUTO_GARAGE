import React, { useState } from 'react';
import { AssignmentResponse, AssignmentStatusTone, AssignmentStatusLabels } from '@/types/repair-order.types';
import { assignmentService } from '../services/assignment.service';
import { Button } from '@/components/common/Button';
import { RejectAssignmentModal } from './RejectAssignmentModal';

interface PendingAssignmentsTableProps {
  assignments: AssignmentResponse[];
  loading: boolean;
  onRefresh: () => void;
  onSelectOrder?: (orderId: number) => void;
}

export const PendingAssignmentsTable: React.FC<PendingAssignmentsTableProps> = ({
  assignments,
  loading,
  onRefresh,
  onSelectOrder,
}) => {
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRejectAssignment, setSelectedRejectAssignment] = useState<AssignmentResponse | null>(null);

  const handleApprove = async (repairOrderId: number, assignmentId: number) => {
    try {
      setActionLoading(true);
      setError(null);
      await assignmentService.approveAssignment(repairOrderId, assignmentId);
      onRefresh();
    } catch (err: any) {
      console.error('Lỗi khi phê duyệt phân công:', err);
      const msg = err.response?.data?.message || err.message || 'Không thể phê duyệt phân công';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="data-table-card" style={{ padding: '48px', textAlign: 'center' }}>
        <div
          className="spinner"
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid var(--color-outline-variant)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px auto',
          }}
        />
        <p style={{ color: 'var(--color-outline)', margin: 0, fontSize: '0.9rem' }}>
          Đang tải danh sách phân công chờ duyệt...
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            error
          </span>
          <span>{error}</span>
        </div>
      )}

      {assignments.length === 0 ? (
        <div
          className="data-table-card"
          style={{
            padding: '48px',
            textAlign: 'center',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-success)', marginBottom: '12px' }}>
            verified
          </span>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-on-surface)' }}>
            Không có phân công nào đang chờ duyệt
          </h4>
          <p style={{ margin: 0, color: 'var(--color-outline)', fontSize: '0.875rem' }}>
            Không có phân công của lễ tân đang chờ quản lý duyệt.
          </p>
        </div>
      ) : (
        <div className="data-table-card">
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '90px', textAlign: 'center' }}>MÃ LỆNH SC</th>
                  <th>KỸ THUẬT VIÊN</th>
                  <th>NGƯỜI TẠO (LỄ TÂN)</th>
                  <th>THỜI GIAN GỬI</th>
                  <th>CHI NHÁNH</th>
                  <th>GHI CHÚ / VAI TRÒ</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>TRẠNG THÁI</th>
                  <th style={{ width: '160px', textAlign: 'right' }}>THAO TÁC DUYỆT</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((asgn) => {
                  const statusTone = AssignmentStatusTone[asgn.trangThai] || 'warning';
                  const statusLabel = AssignmentStatusLabels[asgn.trangThai] || asgn.trangThai;

                  return (
                    <tr key={asgn.maPhanCong}>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onSelectOrder && onSelectOrder(asgn.maPhieuSuaChua)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: 'var(--color-primary)',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            cursor: onSelectOrder ? 'pointer' : 'default',
                            textDecoration: onSelectOrder ? 'underline' : 'none',
                          }}
                        >
                          #{asgn.maPhieuSuaChua}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="data-table-avatar orange">
                            {asgn.tenNhanVien ? asgn.tenNhanVien.charAt(0).toUpperCase() : 'K'}
                          </div>
                          <div>
                            <strong style={{ color: 'var(--color-on-surface)' }}>
                              {asgn.tenNhanVien || `KTV #${asgn.maNhanVien}`}
                            </strong>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                          {asgn.tenNguoiPhanCong || 'Lễ tân'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface)' }}>
                          {formatDateTime(asgn.thoiGianTao)}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>{asgn.tenChiNhanh || '—'}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', maxWidth: '200px' }} title={asgn.ghiChu}>
                          {asgn.ghiChu || <span style={{ color: 'var(--color-outline)' }}>—</span>}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-badge ${statusTone}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-actions">
                          <Button
                            variant="primary"
                            onClick={() => handleApprove(asgn.maPhieuSuaChua, asgn.maPhanCong)}
                            disabled={actionLoading}
                            style={{
                              padding: '5px 10px',
                              fontSize: '0.775rem',
                              backgroundColor: 'var(--color-success)',
                              minHeight: 'auto',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '15px', marginRight: '3px' }}>
                              check
                            </span>
                            Duyệt
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => setSelectedRejectAssignment(asgn)}
                            disabled={actionLoading}
                            style={{ padding: '5px 10px', fontSize: '0.775rem', minHeight: 'auto' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '15px', marginRight: '3px' }}>
                              close
                            </span>
                            Từ chối
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Assignment Modal */}
      <RejectAssignmentModal
        isOpen={Boolean(selectedRejectAssignment)}
        assignment={selectedRejectAssignment}
        onClose={() => setSelectedRejectAssignment(null)}
        onSuccess={onRefresh}
      />
    </div>
  );
};
