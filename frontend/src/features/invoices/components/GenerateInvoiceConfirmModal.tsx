import React, { useState, useEffect } from 'react';
import { Button } from '@/components/common/Button';
import { invoiceService } from '../services/invoice.service';
import { repairOrderService } from '@/features/repair-orders/services/repairOrder.service';
import { InvoiceResponse } from '@/types/invoice.types';
import { RepairOrderResponse } from '@/types/repair-order.types';

interface GenerateInvoiceConfirmModalProps {
  isOpen: boolean;
  repairOrder: RepairOrderResponse | null;
  allOrders?: RepairOrderResponse[];
  onClose: () => void;
  onSuccess: (invoice: InvoiceResponse) => void;
}

export const GenerateInvoiceConfirmModal: React.FC<GenerateInvoiceConfirmModalProps> = ({
  isOpen,
  repairOrder,
  allOrders,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [checkingDetails, setCheckingDetails] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItemsCount, setTotalItemsCount] = useState<number>(0);
  const [totalPartsCount, setTotalPartsCount] = useState<number>(0);

  useEffect(() => {
    if (!isOpen || !repairOrder) return;
    let isSubscribed = true;

    const checkOrderDetails = async () => {
      try {
        setCheckingDetails(true);
        setError(null);

        // Gom các mã lệnh sửa chữa liên quan (lệnh gốc và các lệnh phát sinh)
        const rootId = repairOrder.maPhieuCha || repairOrder.maPhieuSuaChua;
        const targetIds = [rootId];
        if (allOrders && allOrders.length > 0) {
          allOrders.forEach((o) => {
            if ((o.maPhieuCha === rootId || o.maPhieuSuaChua === rootId) && !targetIds.includes(o.maPhieuSuaChua)) {
              targetIds.push(o.maPhieuSuaChua);
            }
          });
        } else if (repairOrder.maPhieuSuaChua !== rootId) {
          targetIds.push(repairOrder.maPhieuSuaChua);
        }

        let itemsCount = 0;
        let partsCount = 0;

        for (const orderId of targetIds) {
          const [items, parts] = await Promise.all([
            repairOrderService.getItems(orderId).catch(() => []),
            repairOrderService.getParts(orderId).catch(() => []),
          ]);

          itemsCount += items.length;
          partsCount += parts.length;
        }

        if (isSubscribed) {
          setTotalItemsCount(itemsCount);
          setTotalPartsCount(partsCount);
          setCheckingDetails(false);
        }
      } catch (err) {
        console.error('Lỗi khi kiểm tra dịch vụ của lệnh sửa chữa:', err);
        if (isSubscribed) {
          setCheckingDetails(false);
        }
      }
    };

    checkOrderDetails();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, repairOrder, allOrders]);

  if (!isOpen || !repairOrder) return null;

  const hasNoServices = !checkingDetails && totalItemsCount === 0 && totalPartsCount === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await invoiceService.createFromRepairOrder(repairOrder.maPhieuSuaChua, {});
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

            {hasNoServices ? (
              <div
                style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  marginBottom: '20px',
                  fontSize: '0.875rem',
                  color: '#92400e',
                  lineHeight: 1.5,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#b45309' }}>
                  warning
                </span>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                    Lệnh sửa chữa chưa có dịch vụ / chi phí (0đ)
                  </div>
                  <div>
                    Không thể xuất hóa đơn cho lệnh sửa chữa chưa có dịch vụ hoặc phụ tùng nào. Vui lòng kiểm tra lại dịch vụ trước khi lập hóa đơn.
                  </div>
                </div>
              </div>
            ) : (
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
            )}
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
            <Button
              type="submit"
              variant="primary"
              disabled={loading || checkingDetails || hasNoServices}
            >
              {loading
                ? 'Đang xuất...'
                : checkingDetails
                ? 'Đang kiểm tra...'
                : hasNoServices
                ? 'Không thể xuất hóa đơn (0đ)'
                : 'Xác nhận xuất hóa đơn'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
