import React, { useState, useEffect } from 'react';
import { ServiceResponse, ServiceCategoryResponse, CreateServiceRequest, UpdateServiceRequest, ServicePartItemRequest } from '@/types/service.types';
import { PartResponse } from '@/types/part.types';
import { serviceCatalogService } from '../services/serviceCatalog.service';
import { inventoryService } from '@/features/inventory/services/inventory.service';
import { Button } from '@/components/common/Button';

interface ServiceModalProps {
  isOpen: boolean;
  service: ServiceResponse | null;
  categories: ServiceCategoryResponse[];
  onClose: () => void;
  onSuccess: () => void;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  service,
  categories,
  onClose,
  onSuccess,
}) => {
  const [tenDichVu, setTenDichVu] = useState<string>('');
  const [maLoaiDichVu, setMaLoaiDichVu] = useState<number>(0);
  const [moTa, setMoTa] = useState<string>('');
  const [donGia, setDonGia] = useState<number>(0);
  const [thoiGianDuKien, setThoiGianDuKien] = useState<number>(30);
  const [defaultParts, setDefaultParts] = useState<ServicePartItemRequest[]>([]);

  const [availableParts, setAvailableParts] = useState<PartResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Load available parts for configuration
      inventoryService.getAllParts(false).then(setAvailableParts).catch(console.error);

      if (service) {
        setTenDichVu(service.tenDichVu);
        setMaLoaiDichVu(service.maLoaiDichVu || (categories.length > 0 ? categories[0].maLoaiDichVu : 0));
        setMoTa(service.moTa || '');
        setDonGia(service.donGia);
        setThoiGianDuKien(service.thoiGianDuKien || 30);
        const existingParts = service.parts || service.defaultParts || [];
        setDefaultParts(
          existingParts.map((dp) => ({
            maPhuTung: dp.maPhuTung,
            soLuong: dp.soLuong,
          }))
        );
      } else {
        setTenDichVu('');
        setMaLoaiDichVu(categories.length > 0 ? categories[0].maLoaiDichVu : 0);
        setMoTa('');
        setDonGia(100000);
        setThoiGianDuKien(30);
        setDefaultParts([]);
      }
      setError(null);
    }
  }, [isOpen, service, categories]);

  if (!isOpen) return null;

  const handleAddPartItem = () => {
    if (availableParts.length === 0) return;
    const firstUnused = availableParts.find((p) => !defaultParts.some((dp) => dp.maPhuTung === p.maPhuTung));
    const partId = firstUnused ? firstUnused.maPhuTung : availableParts[0].maPhuTung;
    setDefaultParts([...defaultParts, { maPhuTung: partId, soLuong: 1 }]);
  };

  const handleRemovePartItem = (index: number) => {
    setDefaultParts(defaultParts.filter((_, i) => i !== index));
  };

  const handleUpdatePartItem = (index: number, field: 'maPhuTung' | 'soLuong', value: number) => {
    const next = [...defaultParts];
    next[index] = { ...next[index], [field]: value };
    setDefaultParts(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenDichVu.trim()) {
      setError('Vui lòng nhập tên dịch vụ');
      return;
    }
    if (!maLoaiDichVu) {
      setError('Vui lòng chọn loại dịch vụ');
      return;
    }
    if (donGia < 0) {
      setError('Đơn giá không được nhỏ hơn 0');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: CreateServiceRequest | UpdateServiceRequest = {
        tenDichVu: tenDichVu.trim(),
        maLoaiDichVu,
        moTa: moTa.trim(),
        donGia,
        thoiGianDuKien,
        defaultParts,
      };

      if (service) {
        await serviceCatalogService.updateService(service.maDichVu, payload);
      } else {
        await serviceCatalogService.createService(payload as CreateServiceRequest);
      }

      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu dịch vụ');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

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
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
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
              build
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                {service ? `Cập nhật dịch vụ #${service.maDichVu}` : 'Thêm Dịch Vụ Mới'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.775rem', color: '#94a3b8' }}>
                Nhập thông tin dịch vụ, giá tiền công và phụ tùng đi kèm
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1 }}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Basic Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                  Tên dịch vụ <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: Thay dầu động cơ, Căn chỉnh thước lái..."
                  value={tenDichVu}
                  onChange={(e) => setTenDichVu(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                  Loại dịch vụ <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={maLoaiDichVu}
                  onChange={(e) => setMaLoaiDichVu(parseInt(e.target.value, 10))}
                  style={{ fontSize: '0.85rem' }}
                >
                  <option value={0} disabled>-- Chọn loại --</option>
                  {categories.map((c) => (
                    <option key={c.maLoaiDichVu} value={c.maLoaiDichVu}>
                      {c.tenLoai}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                  Đơn giá tiền công (VNĐ) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  className="form-control"
                  value={donGia}
                  onChange={(e) => setDonGia(Number(e.target.value))}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                  Thời gian dự kiến (phút)
                </label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  className="form-control"
                  placeholder="30"
                  value={thoiGianDuKien}
                  onChange={(e) => setThoiGianDuKien(Number(e.target.value))}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Mô tả quy trình dịch vụ</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Mô tả chi tiết các bước kiểm tra, bảo dưỡng..."
                value={moTa}
                onChange={(e) => setMoTa(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            {/* Default Parts Section */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                    Phụ tùng định mức kèm theo ({defaultParts.length})
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Phụ tùng và số lượng dự kiến cần dùng cho dịch vụ
                  </div>
                </div>
                <Button variant="secondary" type="button" onClick={handleAddPartItem} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', marginRight: '4px' }}>add</span>
                  Thêm phụ tùng
                </Button>
              </div>

              {defaultParts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '0.8rem' }}>
                  Dịch vụ này chưa có phụ tùng định mức.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {defaultParts.map((dp, idx) => {
                    const selectedPart = availableParts.find((p) => p.maPhuTung === dp.maPhuTung);
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr 1fr auto',
                          gap: '10px',
                          alignItems: 'center',
                          backgroundColor: '#ffffff',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <select
                          className="form-control"
                          value={dp.maPhuTung}
                          onChange={(e) => handleUpdatePartItem(idx, 'maPhuTung', parseInt(e.target.value, 10))}
                          style={{ fontSize: '0.8rem', padding: '6px' }}
                        >
                          {availableParts.map((p) => (
                            <option key={p.maPhuTung} value={p.maPhuTung}>
                              [{p.maPhuTungCode}] {p.tenPhuTung} ({formatCurrency(p.giaBan || 0)})
                            </option>
                          ))}
                        </select>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>SL:</span>
                          <input
                            type="number"
                            min="1"
                            className="form-control"
                            value={dp.soLuong}
                            onChange={(e) => handleUpdatePartItem(idx, 'soLuong', Math.max(1, parseInt(e.target.value, 10) || 1))}
                            style={{ fontSize: '0.8rem', padding: '6px' }}
                          />
                        </div>

                        <div style={{ fontSize: '0.8rem', color: '#475569', textAlign: 'right' }}>
                          {selectedPart ? formatCurrency((selectedPart.giaBan || 0) * dp.soLuong) : '—'}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemovePartItem(idx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              backgroundColor: '#f8fafc',
            }}
          >
            <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '4px' }}>
                check
              </span>
              {service ? 'Cập nhật dịch vụ' : 'Tạo dịch vụ mới'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
