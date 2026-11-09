import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { invoiceService } from '../services/invoice.service';
import { InvoiceResponse, InvoiceStatusLabels, InvoiceStatusTone } from '@/types/invoice.types';
import { InvoiceDetailModal } from '../components/InvoiceDetailModal';
import { CashPaymentModal } from '../components/CashPaymentModal';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ActionDropdown } from '@/components/common/ActionDropdown';
import { useAuth } from '@/hooks/useAuth';

export const InvoicesPage: React.FC = () => {
  const { hasAnyRole } = useAuth();
  const canMakeCashPayment = hasAnyRole(['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_FRONT_DESK']);

  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Selected Invoice Modal
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponse | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Cash Payment Modal
  const [cashPaymentInvoice, setCashPaymentInvoice] = useState<InvoiceResponse | null>(null);
  const [isCashPaymentOpen, setIsCashPaymentOpen] = useState<boolean>(false);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await invoiceService.getAll();
      setInvoices(data);
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách hóa đơn:', err);
      setError('Không thể tải danh sách hóa đơn từ máy chủ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleViewDetail = (invoice: InvoiceResponse) => {
    setSelectedInvoice(invoice);
    setIsDetailModalOpen(true);
  };

  const handleOpenCashPayment = (invoice: InvoiceResponse) => {
    setCashPaymentInvoice(invoice);
    setIsCashPaymentOpen(true);
  };

  const handleCashPaymentSuccess = () => {
    const invId = cashPaymentInvoice?.maHoaDon;
    setIsCashPaymentOpen(false);
    setCashPaymentInvoice(null);
    setSuccessToast(`Đã xác nhận thanh toán tiền mặt thành công cho Hóa đơn #${invId}!`);
    loadInvoices();

    // Tự tắt toast sau 4 giây
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Filtered list
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesStatus = statusFilter === 'ALL' || inv.trangThai === statusFilter;
      const term = searchTerm.toLowerCase().trim();
      if (!term) return matchesStatus;

      const matchesSearch =
        inv.maHoaDon.toString().includes(term) ||
        (inv.tenKhachHang && inv.tenKhachHang.toLowerCase().includes(term)) ||
        (inv.soDienThoaiKhachHang && inv.soDienThoaiKhachHang.includes(term)) ||
        (inv.bienSoXe && inv.bienSoXe.toLowerCase().includes(term)) ||
        (inv.tenChiNhanh && inv.tenChiNhanh.toLowerCase().includes(term)) ||
        (inv.maPhieuSuaChua && inv.maPhieuSuaChua.toString().includes(term));

      return matchesStatus && matchesSearch;
    });
  }, [invoices, searchTerm, statusFilter]);

  // KPI Metrics
  const totalCount = invoices.length;
  const paidCount = invoices.filter((i) => i.trangThai === 'DA_THANH_TOAN').length;
  const pendingCount = invoices.filter((i) => i.trangThai === 'CHUA_THANH_TOAN').length;
  const totalRevenue = invoices
    .filter((i) => i.trangThai === 'DA_THANH_TOAN')
    .reduce((sum, i) => sum + (i.thanhTien || 0), 0);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            Quản Lý Hóa Đơn & Doanh Thu
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
            Tra cứu hóa đơn, xem chi tiết dịch vụ, phụ tùng và tình trạng thanh toán
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadInvoices}
            disabled={loading}
          >
            <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`} style={{ fontSize: '18px' }}>
              refresh
            </span>
            <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger">
          <span className="material-symbols-outlined">error</span>
          <span style={{ flex: 1 }}>{error}</span>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
            onClick={loadInvoices}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Success Toast / Alert */}
      {successToast && (
        <div
          className="alert alert-success"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#ecfdf5',
            borderColor: '#a7f3d0',
            color: '#065f46',
            borderRadius: '8px',
            padding: '12px 16px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#059669' }}>
            check_circle
          </span>
          <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem' }}>{successToast}</span>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#059669',
              padding: '2px',
              display: 'flex',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              close
            </span>
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          label="Tổng Số Hóa Đơn"
          value={totalCount}
          icon="receipt_long"
          colorTheme="default"
          trend="Hóa đơn đã lập"
          trendUp={true}
        />
        <KpiCard
          label="Chưa Thanh Toán"
          value={pendingCount}
          icon="pending"
          colorTheme="orange"
          trend="Cần thu tiền"
          trendUp={pendingCount === 0}
        />
        <KpiCard
          label="Đã Thanh Toán"
          value={paidCount}
          icon="check_circle"
          colorTheme="green"
          trend="Đã thu đủ tiền"
          trendUp={true}
        />
        <KpiCard
          label="Doanh Thu Đã Thu"
          value={formatCurrency(totalRevenue)}
          icon="payments"
          colorTheme="slate"
          trend="Tổng tiền thực thu"
          trendUp={true}
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="filter-card">
        <div className="filter-search-box">
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder="Tìm theo mã HD (#1), khách hàng, SĐT, biển số, mã lệnh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="CHUA_THANH_TOAN">Chưa thanh toán</option>
            <option value="THANH_TOAN_MOT_PHAN">Thanh toán một phần</option>
            <option value="DA_THANH_TOAN">Đã thanh toán</option>
            <option value="HUY">Đã hủy</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="data-table-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <span
              className="material-symbols-outlined animate-spin"
              style={{ fontSize: '36px', color: 'var(--color-primary-container)', marginBottom: '12px' }}
            >
              progress_activity
            </span>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem', fontWeight: 500 }}>
              Đang tải danh sách hóa đơn...
            </p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div style={{ padding: '32px 0' }}>
            <EmptyState
              title="Không tìm thấy hóa đơn nào"
              description="Không có hóa đơn phù hợp. Thử đổi từ khóa hoặc bộ lọc."
            />
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>Mã HD</th>
                  <th>Lệnh Sửa Chữa</th>
                  <th>Khách Hàng</th>
                  <th>Phương Tiện</th>
                  <th>Chi Nhánh</th>
                  <th>Ngày Lập</th>
                  <th style={{ textAlign: 'right' }}>Thành Tiền</th>
                  <th style={{ textAlign: 'center' }}>Trạng Thái</th>
                  <th style={{ textAlign: 'right', minWidth: '100px', paddingRight: '16px' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const tone = InvoiceStatusTone[inv.trangThai] || 'gray';
                  const label = InvoiceStatusLabels[inv.trangThai] || inv.trangThai;

                  const statusClass =
                    tone === 'warning'
                      ? 'warning'
                      : tone === 'success'
                      ? 'success'
                      : tone === 'danger'
                      ? 'danger'
                      : tone === 'primary' || tone === 'info'
                      ? 'primary'
                      : '';

                  return (
                    <tr key={inv.maHoaDon}>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            backgroundColor: 'var(--color-surface-container)',
                            color: 'var(--color-primary)',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            display: 'inline-block',
                          }}
                        >
                          #{inv.maHoaDon}
                        </span>
                      </td>

                      <td>
                        {inv.maPhieuSuaChua ? (
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary-container)' }}>
                            Lệnh #{inv.maPhieuSuaChua}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>{inv.tenKhachHang || '—'}</div>
                        <div style={{ fontSize: '0.775rem', color: 'var(--color-outline)', marginTop: '2px' }}>{inv.soDienThoaiKhachHang || '—'}</div>
                      </td>

                      <td>
                        {inv.bienSoXe ? (
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid #fde68a',
                              display: 'inline-block',
                            }}
                          >
                            {inv.bienSoXe}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                          {inv.tenChiNhanh || '—'}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                          {formatDateTime(inv.ngayLap)}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                        {formatCurrency(inv.thanhTien)}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-badge ${statusClass}`}>
                          {label}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                        <ActionDropdown
                          items={[
                            {
                              label: 'Xem chi tiết hóa đơn',
                              icon: 'visibility',
                              variant: 'primary',
                              onClick: () => handleViewDetail(inv),
                            },
                            ...(inv.trangThai === 'CHUA_THANH_TOAN' && canMakeCashPayment
                              ? [
                                  {
                                    label: 'Xác nhận thanh toán tiền mặt',
                                    icon: 'payments',
                                    variant: 'success' as const,
                                    onClick: () => handleOpenCashPayment(inv),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        isOpen={isDetailModalOpen}
        invoice={selectedInvoice}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedInvoice(null);
        }}
        onPayCash={canMakeCashPayment ? handleOpenCashPayment : undefined}
      />

      {/* Cash Payment Modal */}
      <CashPaymentModal
        isOpen={isCashPaymentOpen}
        invoice={cashPaymentInvoice}
        onClose={() => {
          setIsCashPaymentOpen(false);
          setCashPaymentInvoice(null);
        }}
        onSuccess={handleCashPaymentSuccess}
      />
    </div>
  );
};
