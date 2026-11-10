import React, { useState, useEffect, useCallback } from 'react';
import {
  RepairOrderResponse,
  RepairItemResponse,
  RepairPartResponse,
  AssignmentResponse,
  RepairOrderStatusLabels,
  RepairOrderStatusTone,
  AssignmentStatusLabels,
  AssignmentStatusTone,
  RepairOrderStatus,
} from '@/types/repair-order.types';
import { repairOrderService } from '../services/repairOrder.service';
import { assignmentService } from '../services/assignment.service';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/common/Button';
import { AssignTechnicianModal } from './AssignTechnicianModal';
import { RejectAssignmentModal } from './RejectAssignmentModal';
import { RepairChatPanel } from '@/features/repair-chat/components/RepairChatPanel';

interface RepairOrderDetailModalProps {
  isOpen: boolean;
  repairOrder: RepairOrderResponse | null;
  onClose: () => void;
  onOrderUpdated: () => void;
}

export const RepairOrderDetailModal: React.FC<RepairOrderDetailModalProps> = ({
  isOpen,
  repairOrder,
  onClose,
  onOrderUpdated,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'assignments' | 'items' | 'parts' | 'chat'>('assignments');
  const [items, setItems] = useState<RepairItemResponse[]>([]);
  const [parts, setParts] = useState<RepairPartResponse[]>([]);
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sub modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [selectedRejectAssignment, setSelectedRejectAssignment] = useState<AssignmentResponse | null>(null);

  // Permissions
  const userRoles = user?.roles || [];
  const isManagerOrAdmin = userRoles.includes('ROLE_ADMIN') || userRoles.includes('ROLE_MANAGER');
  const isFrontDesk = userRoles.includes('ROLE_FRONT_DESK');
  const isTechnician = userRoles.includes('ROLE_TECHNICIAN') && !isManagerOrAdmin;
  const canAssign = isManagerOrAdmin || isFrontDesk;
  const canApprove = isManagerOrAdmin;

  const loadDetails = useCallback(async () => {
    if (!repairOrder) return;
    try {
      setLoadingDetails(true);
      setError(null);

      const promises: [
        Promise<RepairItemResponse[]>,
        Promise<RepairPartResponse[]>,
        Promise<AssignmentResponse[]>
      ] = [
        repairOrderService.getItems(repairOrder.maPhieuSuaChua).catch(() => []),
        repairOrderService.getParts(repairOrder.maPhieuSuaChua).catch(() => []),
        isTechnician
          ? Promise.resolve([])
          : assignmentService.getAssignments(repairOrder.maPhieuSuaChua).catch(() => []),
      ];

      const [itemsRes, partsRes, assignmentsRes] = await Promise.all(promises);
      setItems(itemsRes);
      setParts(partsRes);
      setAssignments(assignmentsRes);
    } catch (err: any) {
      console.error('Lỗi khi tải chi tiết phiếu sửa chữa:', err);
      setError('Không thể tải toàn bộ chi tiết lệnh sửa chữa');
    } finally {
      setLoadingDetails(false);
    }
  }, [repairOrder, isTechnician]);

  useEffect(() => {
    if (isOpen && repairOrder) {
      setSuccessMsg(null);
      setError(null);
      loadDetails();
    }
  }, [isOpen, repairOrder, loadDetails]);

  if (!isOpen || !repairOrder) return null;

  const handleApproveAssignment = async (assignmentId: number) => {
    try {
      setActionLoading(true);
      setError(null);
      await assignmentService.approveAssignment(repairOrder.maPhieuSuaChua, assignmentId);
      setSuccessMsg('Đã phê duyệt phân công kỹ thuật viên thành công!');
      loadDetails();
      onOrderUpdated();
    } catch (err: any) {
      console.error('Lỗi khi duyệt phân công:', err);
      const msg = err.response?.data?.message || err.message || 'Không thể phê duyệt phân công';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy phân công này không?')) return;
    try {
      setActionLoading(true);
      setError(null);
      await assignmentService.deleteAssignment(repairOrder.maPhieuSuaChua, assignmentId);
      setSuccessMsg('Đã hủy phân công kỹ thuật viên');
      loadDetails();
      onOrderUpdated();
    } catch (err: any) {
      console.error('Lỗi khi xóa phân công:', err);
      const msg = err.response?.data?.message || err.message || 'Không thể hủy phân công';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (newStatus: RepairOrderStatus) => {
    try {
      setActionLoading(true);
      setError(null);
      await repairOrderService.updateStatus(repairOrder.maPhieuSuaChua, {
        trangThai: newStatus,
        ghiChu: `Cập nhật trạng thái sang ${RepairOrderStatusLabels[newStatus]}`,
      });
      setSuccessMsg(`Đã cập nhật trạng thái phiếu sang "${RepairOrderStatusLabels[newStatus]}"`);
      onOrderUpdated();
    } catch (err: any) {
      console.error('Lỗi khi cập nhật trạng thái phiếu:', err);
      const msg = err.response?.data?.message || err.message || 'Không thể cập nhật trạng thái';
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

  const totalServices = items.reduce((sum, item) => sum + (Number(item.thanhTien) || 0), 0);
  const totalParts = parts.reduce((sum, part) => sum + (Number(part.thanhTien) || 0), 0);
  const totalCost = totalServices + totalParts;
  const statusTone = RepairOrderStatusTone[repairOrder.trangThai] || 'primary';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container large"
        style={{ maxWidth: '960px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--color-primary)' }}>
              assignment
            </span>
            <span>Lệnh Sửa Chữa #{repairOrder.maPhieuSuaChua}</span>
            <span className={`status-badge ${statusTone}`} style={{ marginLeft: '8px' }}>
              {RepairOrderStatusLabels[repairOrder.trangThai] || repairOrder.trangThai}
            </span>
            {repairOrder.daXuatHoaDon && (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#047857',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginLeft: '6px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  receipt_long
                </span>
                Đã xuất hóa đơn
              </span>
            )}
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Detail Grid */}
          <div className="detail-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="detail-item">
              <div className="detail-label">KHÁCH HÀNG</div>
              <div className="detail-value">{repairOrder.tenKhachHang}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '2px' }}>
                {repairOrder.soDienThoaiKhachHang}
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label">BIỂN SỐ XE</div>
              <div style={{ marginTop: '2px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #fde68a',
                  }}
                >
                  {repairOrder.bienSoXe}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
                {repairOrder.hangXe || repairOrder.tenHangXe || ''} {repairOrder.modelXe || repairOrder.tenModel || ''}
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-label">CHI NHÁNH</div>
              <div className="detail-value">{repairOrder.tenChiNhanh}</div>
              {repairOrder.maTiepNhan && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)', marginTop: '2px' }}>
                  Tiếp nhận #{repairOrder.maTiepNhan}
                </div>
              )}
            </div>

            <div className="detail-item">
              <div className="detail-label">THỜI GIAN BẮT ĐẦU</div>
              <div className="detail-value">{formatDateTime(repairOrder.thoiGianBatDau)}</div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="alert alert-danger">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                error
              </span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert alert-info">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                check_circle
              </span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Tab Navigation */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--color-border)',
              gap: '8px',
            }}
          >
            <button
              type="button"
              className={`btn-ghost ${activeTab === 'assignments' ? 'active' : ''}`}
              onClick={() => setActiveTab('assignments')}
              style={{
                padding: '10px 16px',
                borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: activeTab === 'assignments' ? 'var(--color-primary)' : 'var(--color-outline)',
                borderBottom: activeTab === 'assignments' ? '2px solid var(--color-primary)' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                engineering
              </span>
              Phân công kỹ thuật ({assignments.length})
            </button>

            <button
              type="button"
              className={`btn-ghost ${activeTab === 'items' ? 'active' : ''}`}
              onClick={() => setActiveTab('items')}
              style={{
                padding: '10px 16px',
                borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: activeTab === 'items' ? 'var(--color-primary)' : 'var(--color-outline)',
                borderBottom: activeTab === 'items' ? '2px solid var(--color-primary)' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                build
              </span>
              Dịch vụ ({items.length})
            </button>

            <button
              type="button"
              className={`btn-ghost ${activeTab === 'parts' ? 'active' : ''}`}
              onClick={() => setActiveTab('parts')}
              style={{
                padding: '10px 16px',
                borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: activeTab === 'parts' ? 'var(--color-primary)' : 'var(--color-outline)',
                borderBottom: activeTab === 'parts' ? '2px solid var(--color-primary)' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                inventory_2
              </span>
              Phụ tùng ({parts.length})
            </button>
            <button type="button" className={`btn-ghost ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')} style={{ padding: '10px 16px', fontWeight: 600 }}>
              Trao đổi sửa chữa
            </button>
          </div>

          {/* Tab Content */}
          <div>
            {loadingDetails ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--color-outline)' }}>
                <div
                  className="spinner"
                  style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid var(--color-outline-variant)',
                    borderTopColor: 'var(--color-primary)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    margin: '0 auto 12px auto',
                  }}
                />
                <div>Đang tải dữ liệu chi tiết...</div>
              </div>
            ) : (
              <>
                {activeTab === 'chat' && <RepairChatPanel key={`${user?.maNguoiDung}-${repairOrder.maPhieuSuaChua}`} orderId={repairOrder.maPhieuSuaChua} />}
                {/* TAB: ASSIGNMENTS */}
                {activeTab === 'assignments' && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                      }}
                    >
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                          Danh Sách Kỹ Thuật Viên Được Phân Công
                        </h4>
                      </div>

                      {canAssign && !repairOrder.maPhieuCha && (
                        <Button
                          variant="primary"
                          onClick={() => setIsAssignModalOpen(true)}
                          style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', marginRight: '4px' }}>
                            person_add
                          </span>
                          Phân công kỹ thuật
                        </Button>
                      )}
                    </div>

                    {assignments.length === 0 ? (
                      <div
                        className="data-table-card"
                        style={{
                          padding: '36px',
                          textAlign: 'center',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--color-outline)', marginBottom: '8px' }}>
                          engineering
                        </span>
                        <p style={{ margin: 0, color: 'var(--color-outline)', fontSize: '0.875rem' }}>
                          Chưa có kỹ thuật viên nào được phân công cho phiếu này.
                        </p>
                      </div>
                    ) : (
                      <div className="data-table-card">
                        <div className="data-table-container">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>KỸ THUẬT VIÊN</th>
                                <th>NGƯỜI TẠO</th>
                                <th>THỜI GIAN TẠO</th>
                                <th style={{ textAlign: 'center' }}>TRẠNG THÁI DUYỆT</th>
                                <th>NGƯỜI DUYỆT</th>
                                <th>GHI CHÚ</th>
                                {isManagerOrAdmin && <th style={{ textAlign: 'right' }}>THAO TÁC</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {assignments.map((asgn) => {
                                const isPending = asgn.trangThai === 'CHO_DUYET';
                                const asgnTone = AssignmentStatusTone[asgn.trangThai] || 'warning';

                                return (
                                  <tr key={asgn.maPhanCong}>
                                    <td>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="data-table-avatar orange">
                                          {asgn.tenNhanVien ? asgn.tenNhanVien.charAt(0).toUpperCase() : 'K'}
                                        </div>
                                        <strong>{asgn.tenNhanVien || `KTV #${asgn.maNhanVien}`}</strong>
                                      </div>
                                    </td>
                                    <td>
                                      <div style={{ fontSize: '0.85rem' }}>
                                        {asgn.tenNguoiPhanCong || 'Hệ thống'}
                                      </div>
                                    </td>
                                    <td>
                                      <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface)' }}>
                                        {formatDateTime(asgn.thoiGianTao)}
                                      </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <span className={`status-badge ${asgnTone}`}>
                                        {AssignmentStatusLabels[asgn.trangThai] || asgn.trangThai}
                                      </span>
                                    </td>
                                    <td>
                                      <div style={{ fontSize: '0.85rem' }}>
                                        {asgn.tenNguoiDuyet ? (
                                          <div>
                                            <div>{asgn.tenNguoiDuyet}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-outline)' }}>
                                              {formatDateTime(asgn.thoiGianDuyet)}
                                            </div>
                                          </div>
                                        ) : (
                                          <span style={{ color: 'var(--color-outline)' }}>—</span>
                                        )}
                                      </div>
                                    </td>
                                    <td>
                                      <div style={{ fontSize: '0.85rem', maxWidth: '160px' }} title={asgn.ghiChu}>
                                        {asgn.ghiChu || <span style={{ color: 'var(--color-outline)' }}>—</span>}
                                      </div>
                                    </td>
                                    {isManagerOrAdmin && (
                                      <td style={{ textAlign: 'right' }}>
                                        <div className="table-actions">
                                          {isPending && canApprove && (
                                            <>
                                              <Button
                                                variant="primary"
                                                onClick={() => handleApproveAssignment(asgn.maPhanCong)}
                                                disabled={actionLoading}
                                                style={{
                                                  padding: '4px 8px',
                                                  fontSize: '0.75rem',
                                                  backgroundColor: 'var(--color-success)',
                                                  minHeight: 'auto',
                                                }}
                                              >
                                                <span className="material-symbols-outlined" style={{ fontSize: '14px', marginRight: '2px' }}>
                                                  check
                                                </span>
                                                Duyệt
                                              </Button>
                                              <Button
                                                variant="danger"
                                                onClick={() => setSelectedRejectAssignment(asgn)}
                                                disabled={actionLoading}
                                                style={{ padding: '4px 8px', fontSize: '0.75rem', minHeight: 'auto' }}
                                              >
                                                <span className="material-symbols-outlined" style={{ fontSize: '14px', marginRight: '2px' }}>
                                                  close
                                                </span>
                                                Từ chối
                                              </Button>
                                            </>
                                          )}
                                          {asgn.trangThai !== 'DA_HUY' && !isPending && (
                                            <button
                                              type="button"
                                              className="table-action-btn danger"
                                              onClick={() => handleDeleteAssignment(asgn.maPhanCong)}
                                              disabled={actionLoading}
                                              title="Hủy phân công"
                                            >
                                              <span className="material-symbols-outlined">delete</span>
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: ITEMS */}
                {activeTab === 'items' && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                      }}
                    >
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                        Hạng Mục Dịch Vụ Sửa Chữa
                      </h4>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-outline)' }}>
                        Tổng dịch vụ: <strong style={{ color: 'var(--color-primary)' }}>{totalServices.toLocaleString('vi-VN')} đ</strong>
                      </span>
                    </div>

                    {items.length === 0 ? (
                      <div className="data-table-card" style={{ padding: '36px', textAlign: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--color-outline)', marginBottom: '8px' }}>
                          build
                        </span>
                        <p style={{ margin: 0, color: 'var(--color-outline)', fontSize: '0.875rem' }}>
                          Chưa có dịch vụ nào trong phiếu sửa chữa này.
                        </p>
                      </div>
                    ) : (
                      <div className="data-table-card">
                        <div className="data-table-container">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                                <th>TÊN DỊCH VỤ</th>
                                <th>LOẠI DỊCH VỤ</th>
                                <th style={{ textAlign: 'center' }}>SỐ LƯỢNG</th>
                                <th style={{ textAlign: 'right' }}>ĐƠN GIÁ</th>
                                <th style={{ textAlign: 'right' }}>THÀNH TIỀN</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item, idx) => (
                                <tr key={item.maChiTiet || idx}>
                                  <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                  <td><strong>{item.tenDichVu}</strong></td>
                                  <td style={{ color: 'var(--color-outline)' }}>{item.tenLoaiDichVu || '—'}</td>
                                  <td style={{ textAlign: 'center' }}>{item.soLuong}</td>
                                  <td style={{ textAlign: 'right' }}>{Number(item.donGia).toLocaleString('vi-VN')} đ</td>
                                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                    {Number(item.thanhTien).toLocaleString('vi-VN')} đ
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: PARTS */}
                {activeTab === 'parts' && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                      }}
                    >
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                        Phụ Tùng & Vật Tư Sử Dụng
                      </h4>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-outline)' }}>
                        Tổng phụ tùng: <strong style={{ color: 'var(--color-primary)' }}>{totalParts.toLocaleString('vi-VN')} đ</strong>
                      </span>
                    </div>

                    {parts.length === 0 ? (
                      <div className="data-table-card" style={{ padding: '36px', textAlign: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--color-outline)', marginBottom: '8px' }}>
                          inventory_2
                        </span>
                        <p style={{ margin: 0, color: 'var(--color-outline)', fontSize: '0.875rem' }}>
                          Chưa có phụ tùng nào được xuất cho phiếu này.
                        </p>
                      </div>
                    ) : (
                      <div className="data-table-card">
                        <div className="data-table-container">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                                <th>MÃ PHỤ TÙNG</th>
                                <th>TÊN PHỤ TÙNG</th>
                                <th>ĐVT</th>
                                <th style={{ textAlign: 'center' }}>SỐ LƯỢNG</th>
                                <th style={{ textAlign: 'right' }}>ĐƠN GIÁ</th>
                                <th style={{ textAlign: 'right' }}>THÀNH TIỀN</th>
                              </tr>
                            </thead>
                            <tbody>
                              {parts.map((part, idx) => (
                                <tr key={part.maChiTiet || idx}>
                                  <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                  <td><code>{part.maPhuTungCode || `#${part.maPhuTung}`}</code></td>
                                  <td><strong>{part.tenPhuTung}</strong></td>
                                  <td>{part.donViTinh || 'Cái'}</td>
                                  <td style={{ textAlign: 'center' }}>{part.soLuong}</td>
                                  <td style={{ textAlign: 'right' }}>{Number(part.donGia).toLocaleString('vi-VN')} đ</td>
                                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                    {Number(part.thanhTien).toLocaleString('vi-VN')} đ
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-outline)' }}>Tổng ước tính: </span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--color-primary)' }}>
              {totalCost.toLocaleString('vi-VN')} đ
            </strong>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Status change buttons for Manager/Admin */}
            {isManagerOrAdmin && (
              <div style={{ display: 'flex', gap: '6px' }}>
                {repairOrder.trangThai === 'CHO_XU_LY' && (
                  <Button
                    variant="primary"
                    onClick={() => handleUpdateOrderStatus('DANG_SUA')}
                    disabled={actionLoading}
                    style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
                  >
                    Bắt đầu sửa
                  </Button>
                )}
                {repairOrder.trangThai === 'DA_PHAN_CONG' && (
                  <Button
                    variant="primary"
                    onClick={() => handleUpdateOrderStatus('DANG_SUA')}
                    disabled={actionLoading}
                    style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
                  >
                    Bắt đầu sửa
                  </Button>
                )}
                {repairOrder.trangThai === 'DANG_SUA' && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => handleUpdateOrderStatus('TAM_DUNG')}
                      disabled={actionLoading}
                      style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
                    >
                      Tạm dừng
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => handleUpdateOrderStatus('HOAN_TAT')}
                      disabled={actionLoading}
                      style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: 'var(--color-success)', minHeight: 'auto' }}
                    >
                      Hoàn tất
                    </Button>
                  </>
                )}
                {repairOrder.trangThai === 'TAM_DUNG' && (
                  <Button
                    variant="primary"
                    onClick={() => handleUpdateOrderStatus('DANG_SUA')}
                    disabled={actionLoading}
                    style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
                  >
                    Tiếp tục sửa
                  </Button>
                )}
              </div>
            )}

            <Button variant="secondary" onClick={onClose} style={{ padding: '6px 16px', minHeight: 'auto' }}>
              Đóng
            </Button>
          </div>
        </div>
      </div>

      {/* Assign Technician Modal */}
      <AssignTechnicianModal
        isOpen={isAssignModalOpen}
        repairOrder={repairOrder}
        onClose={() => setIsAssignModalOpen(false)}
        onSuccess={() => {
          setSuccessMsg('Đã tạo phân công kỹ thuật viên thành công!');
          loadDetails();
          onOrderUpdated();
        }}
      />

      {/* Reject Assignment Modal */}
      <RejectAssignmentModal
        isOpen={Boolean(selectedRejectAssignment)}
        assignment={selectedRejectAssignment}
        onClose={() => setSelectedRejectAssignment(null)}
        onSuccess={() => {
          setSuccessMsg('Đã từ chối phân công');
          loadDetails();
          onOrderUpdated();
        }}
      />
    </div>
  );
};
