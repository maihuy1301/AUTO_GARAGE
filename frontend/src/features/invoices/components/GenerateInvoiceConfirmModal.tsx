import React, { useState } from 'react';
import { Button } from '@/components/common/Button';
import { invoiceService } from '../services/invoice.service';
import { InvoiceResponse } from '@/types/invoice.types';
import { RepairOrderResponse } from '@/types/repair-order.types';

interface GenerateInvoiceConfirmModalProps {
  isOpen: boolean;
  repairOrder: RepairOrderResponse | null;
  onClose: () => void;
  onSuccess: (invoice: InvoiceResponse) => void;
}

export const GenerateInvoiceConfirmModal: React.FC<GenerateInvoiceConfirmModalProps> = ({
  isOpen,
  repairOrder,
  onClose,
  onSuccess,
}) => {
  const [giamGia, setGiamGia] = useState<number>(0);
  const [thue, setThue] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !repairOrder) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await invoiceService.createFromRepairOrder(repairOrder.maPhieuSuaChua, {
        giamGia: giamGia >= 0 ? giamGia : 0,
        thue: thue >= 0 ? thue : 0,
      });
      onSuccess(res);
    } catch (err: any) {
      console.error('Lỗi khi xuất hóa đơn:', err);
      const msg = err.response?.data?.message || err.message || 'Không thể xuất hóa đơn cho lệnh này';
      setError(msg);
    } finally {
      setLoading(false);
    }
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
        zIndex: 1100,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
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
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
              Xác nhận Xuất Hóa Đơn
            </h3>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Lệnh sửa chữa #{repairOrder.maPhieuSuaChua} ({repairOrder.bienSoXe})
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '24px' }}>
            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#b91c1c',
                  fontSize: '0.875rem',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  error
                </span>
                <span>{error}</span>
              </div>
            )}

            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '14px 16px',
                marginBottom: '20px',
                fontSize: '0.875rem',
                color: '#1e40af',
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  info
                </span>
                Bạn có chắc chắn muốn xuất hóa đơn cho lệnh sửa chữa này?
              </div>
              <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px' }}>
                <li>Hóa đơn gồm dịch vụ, phụ tùng của lệnh sửa chữa và các phiếu phát sinh liên quan.</li>
                <li>Sau khi xuất hóa đơn, tồn kho phụ tùng sẽ được cập nhật.</li>
              </ul>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Giảm giá (VNĐ)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={giamGia}
                  onChange={(e) => setGiamGia(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Thuế VAT (VNĐ)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={thue}
                  onChange={(e) => setThue(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Đang xuất...' : 'Xác nhận xuất hóa đơn'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
