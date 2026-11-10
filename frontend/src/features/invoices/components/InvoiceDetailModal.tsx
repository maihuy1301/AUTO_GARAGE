import React from 'react';
import { InvoiceResponse, InvoiceStatusLabels, InvoiceStatusTone } from '@/types/invoice.types';
import { Button } from '@/components/common/Button';

interface InvoiceDetailModalProps {
  isOpen: boolean;
  invoice: InvoiceResponse | null;
  onClose: () => void;
  onPayCash?: (invoice: InvoiceResponse) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  isOpen,
  invoice,
  onClose,
  onPayCash,
}) => {
  if (!isOpen || !invoice) return null;

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

  const statusTone = InvoiceStatusTone[invoice.trangThai] || 'default';
  const statusLabel = InvoiceStatusLabels[invoice.trangThai] || invoice.trangThai;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f9fafb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                receipt_long
              </span>
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#111827' }}>
                Chi tiết Hóa đơn #{invoice.maHoaDon}
              </h2>
              <div style={{ fontSize: '0.825rem', color: '#6b7280', marginTop: '2px' }}>
                Phiếu sửa chữa đại diện: #{invoice.maPhieuSuaChua || '—'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`status-badge ${statusTone}`}>
              {statusLabel}
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9ca3af',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
              }}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              backgroundColor: '#f8fafc',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '24px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Khách hàng
              </div>
              <div style={{ fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>
                {invoice.tenKhachHang || '—'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                SĐT: {invoice.soDienThoaiKhachHang || '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Phương tiện & Biển số
              </div>
              <div style={{ fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>
                {invoice.bienSoXe || '—'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {[invoice.tenHangXe, invoice.tenModel].filter(Boolean).join(' ') || 'Xe khách hàng'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Chi nhánh & Thu ngân
              </div>
              <div style={{ fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>
                {invoice.tenChiNhanh || '—'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Thu ngân: {invoice.tenThuNgan || '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Thời gian lập
              </div>
              <div style={{ fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>
                {formatDateTime(invoice.ngayLap)}
              </div>
            </div>
          </div>

          {/* Dịch vụ sửa chữa */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span className="material-symbols-outlined" style={{ color: '#2563eb', fontSize: '20px' }}>
                build
              </span>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Hạng mục Dịch vụ ({invoice.services?.length || 0})
              </h3>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: '50px' }}>STT</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Tên dịch vụ</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: '80px' }}>Số lượng</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', width: '130px' }}>Đơn giá</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', width: '130px' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {invoice.services && invoice.services.length > 0 ? (
                  invoice.services.map((item, index) => (
                    <tr key={item.maChiTiet} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>{index + 1}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{item.tenDichVu || `Dịch vụ #${item.maDichVu || item.maChiTiet}`}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>{item.soLuong}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatCurrency(item.donGia)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.thanhTien)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                      Không có dịch vụ nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Phụ tùng & Linh kiện */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span className="material-symbols-outlined" style={{ color: '#ea580c', fontSize: '20px' }}>
                extension
              </span>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Phụ tùng & Linh kiện ({invoice.parts?.length || 0})
              </h3>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: '50px' }}>STT</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Tên phụ tùng</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: '90px' }}>Mã phụ tùng</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: '80px' }}>Số lượng</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: '70px' }}>ĐVT</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', width: '120px' }}>Đơn giá</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', width: '120px' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {invoice.parts && invoice.parts.length > 0 ? (
                  invoice.parts.map((item, index) => (
                    <tr key={item.maChiTiet} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>{index + 1}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{item.tenPhuTung || `Phụ tùng #${item.maPhuTung || item.maChiTiet}`}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'monospace', color: '#64748b' }}>{item.maPhuTungCode || '—'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>{item.soLuong}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>{item.donViTinh || 'Cái'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatCurrency(item.donGia)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.thanhTien)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                      Không sử dụng phụ tùng
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Tổng tiền & Bảng thanh toán */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <div style={{ width: '320px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: '#475569' }}>
                <span>Tổng tiền dịch vụ & phụ tùng:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(invoice.tongTien)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: '2px dashed #cbd5e1',
                  marginTop: '10px',
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: '#1e293b',
                }}
              >
                <span>Thành tiền:</span>
                <span style={{ color: '#2563eb' }}>{formatCurrency(invoice.thanhTien)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Button variant="secondary" onClick={handlePrint}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>
              print
            </span>
            In hóa đơn
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {invoice.trangThai === 'CHUA_THANH_TOAN' && onPayCash && (
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  onPayCash(invoice);
                }}
                style={{
                  backgroundColor: '#059669',
                  borderColor: '#059669',
                  color: '#fff',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  payments
                </span>
                Xác nhận thanh toán tiền mặt
              </Button>
            )}

            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
