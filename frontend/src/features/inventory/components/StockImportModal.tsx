import React, { useState, useEffect } from 'react';
import { PartResponse, StockImportRequest } from '@/types/part.types';
import { BranchResponse } from '@/types/branch.types';
import { inventoryService } from '../services/inventory.service';
import { branchService } from '@/features/branches/services/branch.service';
import { Button } from '@/components/common/Button';

interface StockImportModalProps {
  isOpen: boolean;
  parts: PartResponse[];
  isAdmin: boolean;
  selectedPartId?: number;
  onClose: () => void;
  onSuccess: () => void;
  onOpenBulkImport?: () => void;
}

export const StockImportModal: React.FC<StockImportModalProps> = ({
  isOpen,
  parts,
  isAdmin,
  selectedPartId,
  onClose,
  onSuccess,
  onOpenBulkImport,
}) => {
  const [maPhuTung, setMaPhuTung] = useState<number>(0);
  const [soLuong, setSoLuong] = useState<number>(10);
  const [branchId, setBranchId] = useState<number>(1);
  const [ghiChu, setGhiChu] = useState<string>('');

  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (isAdmin) {
        branchService.getAll().then(setBranches).catch(console.error);
      }
      const initialPartId = selectedPartId || (parts.length > 0 ? parts[0].maPhuTung : 0);
      setMaPhuTung(initialPartId);
      setSoLuong(10);
      setGhiChu('Nhập kho định kỳ từ nhà cung cấp');
      setError(null);
    }
  }, [isOpen, parts, selectedPartId, isAdmin]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maPhuTung) {
      setError('Vui lòng chọn phụ tùng cần nhập');
      return;
    }
    if (!soLuong || soLuong <= 0) {
      setError('Số lượng nhập phải lớn hơn 0');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: StockImportRequest = {
        maPhuTung,
        soLuong,
        branchId: isAdmin ? branchId : undefined,
        ghiChu: ghiChu.trim(),
      };

      await inventoryService.importStock(payload);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi nhập kho');
    } finally {
      setLoading(false);
    }
  };

  const selectedPart = parts.find((p) => p.maPhuTung === maPhuTung);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '540px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#6ee7b7' }}>
              add_shopping_cart
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Nhập Kho Phụ Tùng</h3>
              <p style={{ margin: 0, fontSize: '0.775rem', color: '#d1fae5' }}>
                Nhập số lượng phụ tùng cần bổ sung cho chi nhánh
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#d1fae5',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
              <span>{error}</span>
            </div>
          )}

          {isAdmin && branches.length > 0 && (
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                Chi nhánh tiếp nhận <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                className="form-control"
                value={branchId}
                onChange={(e) => setBranchId(parseInt(e.target.value, 10))}
                style={{ fontSize: '0.85rem' }}
              >
                {branches.map((b) => (
                  <option key={b.maChiNhanh} value={b.maChiNhanh}>
                    {b.tenChiNhanh}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
              Phụ tùng cần nhập <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              className="form-control"
              value={maPhuTung}
              onChange={(e) => setMaPhuTung(parseInt(e.target.value, 10))}
              style={{ fontSize: '0.85rem' }}
            >
              {parts.map((p) => (
                <option key={p.maPhuTung} value={p.maPhuTung}>
                  [{p.maPhuTungCode}] {p.tenPhuTung} ({p.donViTinh || 'Cái'})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                Số lượng nhập <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                className="form-control"
                value={soLuong}
                onChange={(e) => setSoLuong(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Đơn vị tính</label>
              <input
                type="text"
                className="form-control"
                disabled
                value={selectedPart?.donViTinh || 'Cái'}
                style={{ fontSize: '0.85rem', backgroundColor: '#f1f5f9' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Ghi chú chứng từ / Nhà cung cấp</label>
            <input
              type="text"
              className="form-control"
              placeholder="VD: Lô hàng nhập từ Tổng kho Sài Gòn..."
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: '10px',
              paddingTop: '16px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {onOpenBulkImport && (
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBulkImport();
                }}
                disabled={loading}
                style={{
                  color: '#059669',
                  borderColor: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title="Nhập nhiều mặt hàng cùng lúc bằng file Excel (.xlsx / .csv)"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  upload_file
                </span>
                Nhập bằng Excel
              </Button>
            )}
            <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={loading} style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '4px' }}>
                save
              </span>
              Xác nhận nhập kho
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
