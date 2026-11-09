import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  RepairOrderResponse,
  RepairOrderStatusLabels,
  RepairOrderStatusTone,
} from '@/types/repair-order.types';
import { Button } from '@/components/common/Button';
import { ActionDropdown } from '@/components/common/ActionDropdown';

interface RepairOrderTableProps {
  orders: RepairOrderResponse[];
  loading: boolean;
  canAssign?: boolean;
  canGenerateInvoice?: boolean;
  onViewDetail: (order: RepairOrderResponse) => void;
  onAssign?: (order: RepairOrderResponse) => void;
  onGenerateInvoice?: (order: RepairOrderResponse) => void;
}

export const RepairOrderTable: React.FC<RepairOrderTableProps> = ({
  orders,
  loading,
  canAssign = false,
  canGenerateInvoice = false,
  onViewDetail,
  onAssign,
  onGenerateInvoice,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canOpenChat = user?.roles?.some(role => ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_FRONT_DESK'].includes(role)) ?? false;
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<number>>(new Set());
  const pageSize = 10;

  // Toggle single order accordion
  const toggleExpand = (orderId: number) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  // Grouping: Root Orders vs Children Map
  const { rootOrders, childrenMap } = useMemo(() => {
    const map = new Map<number, RepairOrderResponse[]>();
    const roots: RepairOrderResponse[] = [];
    const allIds = new Set(orders.map((o) => o.maPhieuSuaChua));

    // First pass: group children by parent id
    orders.forEach((o) => {
      if (o.maPhieuCha && allIds.has(o.maPhieuCha)) {
        const existing = map.get(o.maPhieuCha) || [];
        existing.push(o);
        map.set(o.maPhieuCha, existing);
      }
    });

    // Second pass: roots are orders that either have no parent OR whose parent is not in current dataset
    orders.forEach((o) => {
      if (!o.maPhieuCha || !allIds.has(o.maPhieuCha)) {
        roots.push(o);
      }
    });

    return { rootOrders: roots, childrenMap: map };
  }, [orders]);

  const totalPages = Math.ceil(rootOrders.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const displayedRootOrders = rootOrders.slice(startIndex, startIndex + pageSize);

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
          Đang tải danh sách lệnh sửa chữa...
        </p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="data-table-card" style={{ padding: '48px', textAlign: 'center' }}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '48px', color: 'var(--color-outline)', marginBottom: '12px' }}
        >
          assignment
        </span>
        <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-on-surface)' }}>
          Không có lệnh sửa chữa nào
        </h4>
        <p style={{ margin: 0, color: 'var(--color-outline)', fontSize: '0.875rem' }}>
          Không có lệnh sửa chữa phù hợp. Thử đổi từ khóa hoặc bộ lọc.
        </p>
      </div>
    );
  }

  return (
    <div className="data-table-card">
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '130px', textAlign: 'left', paddingLeft: '16px' }}>MÃ LỆNH</th>
              <th>PHƯƠNG TIỆN & BIỂN SỐ</th>
              <th>KHÁCH HÀNG</th>
              <th>CHI NHÁNH</th>
              <th>THỜI GIAN BẮT ĐẦU</th>
              <th style={{ width: '150px', textAlign: 'center' }}>TRẠNG THÁI</th>
              <th style={{ width: '120px', textAlign: 'right', paddingRight: '16px' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {displayedRootOrders.map((order) => {
              const statusLabel = RepairOrderStatusLabels[order.trangThai] || order.trangThai;
              const statusTone = RepairOrderStatusTone[order.trangThai] || 'primary';
              const children = childrenMap.get(order.maPhieuSuaChua) || [];
              const hasChildren = children.length > 0;
              const isExpanded = expandedOrderIds.has(order.maPhieuSuaChua);

              return (
                <React.Fragment key={order.maPhieuSuaChua}>
                  {/* ROOT / MAIN ROW */}
                  <tr
                    style={{
                      backgroundColor: isExpanded ? 'rgba(59, 130, 246, 0.04)' : undefined,
                      transition: 'background-color 0.2s',
                    }}
                  >
                    {/* Mã Lệnh & Accordion Toggle */}
                    <td style={{ paddingLeft: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(order.maPhieuSuaChua)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--color-primary)',
                            }}
                            title={isExpanded ? 'Thu gọn phiếu phát sinh' : 'Xem các phiếu phát sinh'}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{
                                fontSize: '20px',
                                transition: 'transform 0.2s',
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              }}
                            >
                              chevron_right
                            </span>
                          </button>
                        ) : (
                          <span style={{ width: '20px', display: 'inline-block' }} />
                        )}

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: '0.825rem',
                                backgroundColor: 'var(--color-surface-container)',
                                color: 'var(--color-primary)',
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-sm)',
                                display: 'inline-block',
                              }}
                            >
                              #{order.maPhieuSuaChua}
                            </span>
                          </div>

                          {order.maPhieuCha ? (
                            <div style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: 600, marginTop: '2px' }}>
                              ↳ Gốc #{order.maPhieuCha}
                            </div>
                          ) : (
                            order.maTiepNhan && (
                              <div style={{ fontSize: '0.725rem', color: 'var(--color-outline)', marginTop: '2px' }}>
                                TN #{order.maTiepNhan}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Phương tiện & Biển số */}
                    <td>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid #fde68a',
                            }}
                          >
                            {order.bienSoXe}
                          </span>

                          {hasChildren && (
                            <span
                              onClick={() => toggleExpand(order.maPhieuSuaChua)}
                              style={{
                                fontSize: '0.725rem',
                                fontWeight: 600,
                                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                                color: '#7c3aed',
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                              }}
                              title={`Có ${children.length} phiếu sửa chữa phát sinh liên kết`}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                                alt_route
                              </span>
                              +{children.length} phát sinh
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '3px' }}>
                          {order.hangXe || order.tenHangXe || ''} {order.modelXe || order.tenModel || ''}
                        </div>
                      </div>
                    </td>

                    {/* Khách hàng */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="data-table-avatar">
                          {order.tenKhachHang ? order.tenKhachHang.charAt(0).toUpperCase() : 'KH'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>
                            {order.tenKhachHang}
                          </div>
                          <div
                            style={{
                              fontSize: '0.775rem',
                              color: 'var(--color-outline)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginTop: '2px',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                              call
                            </span>
                            <span>{order.soDienThoaiKhachHang || '—'}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Chi nhánh */}
                    <td>
                      <div style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--color-on-surface)' }}>
                        {order.tenChiNhanh}
                      </div>
                    </td>

                    {/* Thời gian bắt đầu */}
                    <td>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface)' }}>
                        {formatDateTime(order.thoiGianBatDau)}
                      </div>
                      {order.thoiGianHoanTat && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', marginTop: '2px' }}>
                          Xong: {formatDateTime(order.thoiGianHoanTat)}
                        </div>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span className={`status-badge ${statusTone}`}>
                          {statusLabel}
                        </span>
                        {order.daXuatHoaDon ? (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: '#047857',
                              backgroundColor: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              padding: '2px 7px',
                              borderRadius: '9999px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                            title="Lệnh sửa chữa đã được xuất hóa đơn thanh toán"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
                              receipt_long
                            </span>
                            Đã xuất HĐ
                          </span>
                        ) : (
                          order.trangThai === 'HOAN_TAT' && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 500,
                                color: '#b45309',
                                backgroundColor: '#fffbeb',
                                border: '1px solid #fde68a',
                                padding: '2px 7px',
                                borderRadius: '9999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                              title="Lệnh đã hoàn tất kỹ thuật, chưa xuất hóa đơn"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
                                pending
                              </span>
                              Chờ xuất HĐ
                            </span>
                          )
                        )}
                      </div>
                    </td>

                    {/* Thao tác */}
                    <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                      <ActionDropdown
                        items={[
                          {
                            label: 'Xem chi tiết lệnh',
                            icon: 'visibility',
                            onClick: () => onViewDetail(order),
                          },
                          canOpenChat && {
                            label: 'Trao đổi sửa chữa',
                            icon: 'chat',
                            onClick: () => navigate(`/app/repair-orders/${order.maPhieuSuaChua}/chat`),
                          },
                          canGenerateInvoice && onGenerateInvoice && order.trangThai === 'HOAN_TAT' && !order.daXuatHoaDon
                            ? {
                                label: 'Xuất hóa đơn',
                                icon: 'receipt_long',
                                variant: 'primary',
                                onClick: () => onGenerateInvoice(order),
                              }
                            : false,
                          canAssign && onAssign
                            ? {
                                label: 'Phân công kỹ thuật viên',
                                icon: 'person_add',
                                variant: 'primary',
                                onClick: () => onAssign(order),
                              }
                            : false,
                        ]}
                      />
                    </td>
                  </tr>

                  {/* EXPANDED CHILD ROWS (ACCORDION) */}
                  {hasChildren && isExpanded && (
                    children.map((child, idx) => {
                      const childStatusLabel = RepairOrderStatusLabels[child.trangThai] || child.trangThai;
                      const childStatusTone = RepairOrderStatusTone[child.trangThai] || 'primary';
                      const isLastChild = idx === children.length - 1;

                      return (
                        <tr
                          key={child.maPhieuSuaChua}
                          style={{
                            backgroundColor: 'rgba(243, 244, 246, 0.7)',
                            borderLeft: '4px solid #7c3aed',
                            borderBottom: isLastChild ? '2px solid rgba(124, 58, 237, 0.2)' : undefined,
                          }}
                        >
                          {/* Child Code & Tree Branch Icon */}
                          <td style={{ paddingLeft: '28px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#7c3aed', fontWeight: 700, fontSize: '1.1rem' }}>
                                ↳
                              </span>
                              <div>
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    backgroundColor: 'rgba(124, 58, 237, 0.12)',
                                    color: '#7c3aed',
                                    padding: '2px 6px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid rgba(124, 58, 237, 0.25)',
                                    display: 'inline-block',
                                  }}
                                >
                                  #{child.maPhieuSuaChua}
                                </span>
                                <div style={{ fontSize: '0.675rem', color: '#7c3aed', fontWeight: 600, marginTop: '2px' }}>
                                  (Phát sinh)
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Phương tiện */}
                          <td>
                            <div>
                              <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', fontWeight: 500 }}>
                                {child.bienSoXe}
                              </span>
                              {child.ghiChu && (
                                <div
                                  style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--color-outline)',
                                    marginTop: '2px',
                                    maxWidth: '220px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                  title={child.ghiChu}
                                >
                                  📝 {child.ghiChu}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Khách hàng */}
                          <td>
                            <div style={{ fontSize: '0.825rem', color: 'var(--color-on-surface)' }}>
                              {child.tenKhachHang}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-outline)' }}>
                              {child.soDienThoaiKhachHang || '—'}
                            </div>
                          </td>

                          {/* Chi nhánh */}
                          <td>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-outline)' }}>
                              {child.tenChiNhanh}
                            </div>
                          </td>

                          {/* Thời gian */}
                          <td>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface)' }}>
                              {formatDateTime(child.thoiGianBatDau)}
                            </div>
                          </td>

                          {/* Trạng thái */}
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                              <span className={`status-badge ${childStatusTone}`} style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                                {childStatusLabel}
                              </span>
                              {child.daXuatHoaDon ? (
                                <span
                                  style={{
                                    fontSize: '0.675rem',
                                    fontWeight: 600,
                                    color: '#047857',
                                    backgroundColor: '#ecfdf5',
                                    border: '1px solid #a7f3d0',
                                    padding: '1px 6px',
                                    borderRadius: '9999px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                  }}
                                  title="Đã xuất hóa đơn thanh toán"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>
                                    receipt_long
                                  </span>
                                  Đã có HĐ
                                </span>
                              ) : null}
                            </div>
                          </td>

                          {/* Thao tác */}
                          <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                            <ActionDropdown
                              items={[
                                {
                                  label: 'Xem chi tiết lệnh phát sinh',
                                  icon: 'visibility',
                                  onClick: () => onViewDetail(child),
                                },
                                canOpenChat && {
                                  label: 'Trao đổi sửa chữa',
                                  icon: 'chat',
                                  onClick: () => navigate(`/app/repair-orders/${child.maPhieuSuaChua}/chat`),
                                },
                                canGenerateInvoice && onGenerateInvoice && child.trangThai === 'HOAN_TAT' && !child.daXuatHoaDon
                                  ? {
                                      label: 'Xuất hóa đơn',
                                      icon: 'receipt_long',
                                      variant: 'primary',
                                      onClick: () => onGenerateInvoice(child),
                                    }
                                  : false,
                                canAssign && onAssign
                                  ? {
                                      label: 'Phân công kỹ thuật viên',
                                      icon: 'person_add',
                                      variant: 'primary',
                                      onClick: () => onAssign(child),
                                    }
                                  : false,
                              ]}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div
          className="pagination-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--color-outline)' }}>
            Hiển thị {startIndex + 1} - {Math.min(startIndex + pageSize, rootOrders.length)} / {rootOrders.length} lệnh chính (tổng {orders.length} lệnh)
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <Button
              variant="secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{ padding: '6px 12px', minHeight: 'auto' }}
            >
              Trang trước
            </Button>
            <Button
              variant="secondary"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{ padding: '6px 12px', minHeight: 'auto' }}
            >
              Trang sau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
