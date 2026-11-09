import React, { useState } from 'react';
import { ServiceCategoryResponse, ServiceCategoryRequest } from '@/types/service.types';
import { serviceCatalogService } from '../services/serviceCatalog.service';
import { Button } from '@/components/common/Button';

interface ServiceCategoryModalProps {
  isOpen: boolean;
  categories: ServiceCategoryResponse[];
  onClose: () => void;
  onRefresh: () => void;
}

export const ServiceCategoryModal: React.FC<ServiceCategoryModalProps> = ({
  isOpen,
  categories,
  onClose,
  onRefresh,
}) => {
  const [editingCat, setEditingCat] = useState<ServiceCategoryResponse | null>(null);
  const [formData, setFormData] = useState<ServiceCategoryRequest>({
    tenLoai: '',
    moTa: '',
    trangThai: true,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setEditingCat(null);
    setFormData({ tenLoai: '', moTa: '', trangThai: true });
    setError(null);
  };

  const handleStartEdit = (cat: ServiceCategoryResponse) => {
    setEditingCat(cat);
    setFormData({
      tenLoai: cat.tenLoai,
      moTa: cat.moTa || '',
      trangThai: cat.trangThai,
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenLoai.trim()) {
      setError('Vui lòng nhập tên loại dịch vụ');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (editingCat) {
        await serviceCatalogService.updateCategory(editingCat.maLoaiDichVu, formData);
        setSuccessMsg(`Đã cập nhật loại dịch vụ "${formData.tenLoai}" thành công!`);
      } else {
        await serviceCatalogService.createCategory(formData);
        setSuccessMsg(`Đã thêm loại dịch vụ "${formData.tenLoai}" thành công!`);
      }
      handleStartCreate();
      onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu loại dịch vụ');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (cat: ServiceCategoryResponse) => {
    const nextStatus = !cat.trangThai;
    const actionName = nextStatus ? 'kích hoạt lại' : 'tạm ngưng hỗ trợ';
    const confirmMsg = nextStatus
      ? `Bạn có chắc muốn kích hoạt lại loại dịch vụ "${cat.tenLoai}"? Các dịch vụ thuộc loại này sẽ xuất hiện lại trên hệ thống và mobile.`
      : `Bạn có chắc muốn tạm ngưng loại dịch vụ "${cat.tenLoai}"? Khi tắt, tất cả dịch vụ thuộc loại này sẽ bị ẩn khỏi Danh mục và ứng dụng Mobile.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setLoading(true);
      setError(null);
      await serviceCatalogService.updateCategoryStatus(cat.maLoaiDichVu, nextStatus);
      setSuccessMsg(`Đã ${actionName} loại dịch vụ "${cat.tenLoai}" thành công!`);
      onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể cập nhật trạng thái loại dịch vụ');
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
              category
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Quản Lý Loại Dịch Vụ</h3>
              <p style={{ margin: 0, fontSize: '0.775rem', color: '#94a3b8' }}>
                Thêm hoặc cập nhật loại dịch vụ sửa chữa, bảo dưỡng
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
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Create/Edit */}
          <form
            onSubmit={handleSubmit}
            style={{
              backgroundColor: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              padding: '18px 20px',
            }}
          >
            <div style={{ fontSize: '0.925rem', fontWeight: 700, marginBottom: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--color-primary)' }}>
                {editingCat ? 'edit' : 'add_circle'}
              </span>
              {editingCat ? `Chỉnh sửa loại dịch vụ: ${editingCat.tenLoai}` : 'Thêm loại dịch vụ mới'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                  Tên loại dịch vụ <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: Bảo dưỡng định kỳ, Sửa chữa động cơ..."
                  value={formData.tenLoai}
                  onChange={(e) => setFormData({ ...formData, tenLoai: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                  Mô tả ngắn
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Mô tả nhóm dịch vụ..."
                  value={formData.moTa || ''}
                  onChange={(e) => setFormData({ ...formData, moTa: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              {editingCat && (
                <Button variant="secondary" onClick={handleStartCreate} style={{ padding: '7px 16px' }}>
                  Hủy sửa
                </Button>
              )}
              <Button variant="primary" type="submit" disabled={loading} style={{ padding: '7px 20px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '4px' }}>
                  {editingCat ? 'check' : 'add'}
                </span>
                {editingCat ? 'Lưu thay đổi' : 'Thêm loại'}
              </Button>
            </div>
          </form>

          {/* List Table */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                Danh sách hiện có ({categories.length})
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Khi ngừng hoạt động loại dịch vụ, các dịch vụ thuộc loại này sẽ ẩn trên web và ứng dụng.
              </div>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', width: '60px', textAlign: 'center', color: '#475569' }}>Mã</th>
                    <th style={{ padding: '10px 14px', color: '#475569' }}>Tên loại</th>
                    <th style={{ padding: '10px 14px', color: '#475569' }}>Mô tả</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#475569' }}>Số dịch vụ</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', color: '#475569' }}>Trạng thái</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', color: '#475569', minWidth: '130px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.maLoaiDichVu} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            backgroundColor: '#f1f5f9',
                            color: '#0369a1',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          #{cat.maLoaiDichVu}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                        {cat.tenLoai}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b' }}>
                        {cat.moTa || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span className="status-badge primary" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                          {cat.soLuongDichVu || 0} dịch vụ
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span className={`status-badge ${cat.trangThai ? 'success' : 'danger'}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                          {cat.trangThai ? 'Hoạt động' : 'Tạm ngưng'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cat)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            title="Chỉnh sửa thông tin loại dịch vụ"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(cat)}
                            className={`btn ${cat.trangThai ? 'btn-danger' : 'btn-primary'}`}
                            style={{
                              padding: '4px 10px',
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title={cat.trangThai ? 'Tắt trạng thái (ẩn toàn bộ dịch vụ thuộc loại này)' : 'Bật lại trạng thái'}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                              {cat.trangThai ? 'power_settings_new' : 'check_circle'}
                            </span>
                            <span>{cat.trangThai ? 'Tắt' : 'Bật'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};
