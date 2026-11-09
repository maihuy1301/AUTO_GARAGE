import React, { useState, useEffect } from 'react';
import { PartResponse, CreatePartRequest, UpdatePartRequest } from '@/types/part.types';
import { inventoryService } from '../services/inventory.service';
import { Button } from '@/components/common/Button';

interface PartModalProps {
  isOpen: boolean;
  part: PartResponse | null;
  onClose: () => void;
  onSuccess: () => void;
  onOpenBulkCreate?: () => void;
}

export const PartModal: React.FC<PartModalProps> = ({
  isOpen,
  part,
  onClose,
  onSuccess,
  onOpenBulkCreate,
}) => {
  const [maPhuTungCode, setMaPhuTungCode] = useState<string>('');
  const [tenPhuTung, setTenPhuTung] = useState<string>('');
  const [donViTinh, setDonViTinh] = useState<string>('Cái');
  const [giaNhap, setGiaNhap] = useState<number>(0);
  const [giaBan, setGiaBan] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (part) {
        setMaPhuTungCode(part.maPhuTungCode);
        setTenPhuTung(part.tenPhuTung);
        setDonViTinh(part.donViTinh || 'Cái');
        setGiaNhap(part.giaNhap || 0);
        setGiaBan(part.giaBan || 0);
      } else {
        setMaPhuTungCode('');
        setTenPhuTung('');
        setDonViTinh('Cái');
        setGiaNhap(50000);
        setGiaBan(100000);
      }
      setError(null);
    }
  }, [isOpen, part]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!part && !maPhuTungCode.trim()) {
      setError('Vui lòng nhập mã phụ tùng');
      return;
    }
    if (!tenPhuTung.trim()) {
      setError('Vui lòng nhập tên phụ tùng');
      return;
    }
    if (giaBan < 0) {
      setError('Giá bán không được nhỏ hơn 0');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (part) {
        const payload: UpdatePartRequest = {
          tenPhuTung: tenPhuTung.trim(),
          donViTinh: donViTinh.trim(),
          giaNhap,
          giaBan,
        };
        await inventoryService.updatePart(part.maPhuTung, payload);
      } else {
        const payload: CreatePartRequest = {
          maPhuTungCode: maPhuTungCode.trim().toUpperCase(),
          tenPhuTung: tenPhuTung.trim(),
          donViTinh: donViTinh.trim(),
          giaNhap,
          giaBan,
        };
        await inventoryService.createPart(payload);
      }

      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu phụ tùng');
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
          maxWidth: '560px',
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
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#38bdf8' }}>
              inventory_2
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                {part ? `Chỉnh sửa phụ tùng [${part.maPhuTungCode}]` : 'Thêm Phụ Tùng Danh Mục Mới'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.775rem', color: '#94a3b8' }}>
                Thêm mã, tên, đơn vị tính và giá phụ tùng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                Mã phụ tùng (Code) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="VD: PT-OIL-01"
                disabled={Boolean(part)}
                value={maPhuTungCode}
                onChange={(e) => setMaPhuTungCode(e.target.value.toUpperCase())}
                style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                Tên phụ tùng <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="VD: Dầu nhớt Total Quartz..."
                value={tenPhuTung}
                onChange={(e) => setTenPhuTung(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Đơn vị tính</label>
              <input
                type="text"
                className="form-control"
                placeholder="Cái, Lít, Bình..."
                value={donViTinh}
                onChange={(e) => setDonViTinh(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Giá nhập (VNĐ)</label>
              <input
                type="number"
                min="0"
                step="5000"
                className="form-control"
                value={giaNhap}
                onChange={(e) => setGiaNhap(Number(e.target.value))}
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                Giá bán niêm yết <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                min="0"
                step="5000"
                className="form-control"
                value={giaBan}
                onChange={(e) => setGiaBan(Number(e.target.value))}
                style={{ fontSize: '0.85rem' }}
              />
            </div>
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
            {!part && onOpenBulkCreate && (
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBulkCreate();
                }}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--color-primary)',
                  borderColor: 'var(--color-primary)',
                }}
                title="Thêm nhiều phụ tùng từ file Excel hoặc CSV"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  post_add
                </span>
                Thêm bằng Excel
              </Button>
            )}
            <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '4px' }}>
                check
              </span>
              {part ? 'Cập nhật' : 'Thêm vào danh mục'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
