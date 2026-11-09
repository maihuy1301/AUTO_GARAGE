import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ServiceResponse, ServiceCategoryResponse } from '@/types/service.types';
import { serviceCatalogService } from '../services/serviceCatalog.service';
import { ServiceModal } from '../components/ServiceModal';
import { ServiceCategoryModal } from '../components/ServiceCategoryModal';
import { Button } from '@/components/common/Button';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ActionDropdown } from '@/components/common/ActionDropdown';

export const ServicesPage: React.FC = () => {
  const { user } = useAuth();
  const userRoles = user?.roles || [];
  const isAdmin = userRoles.includes('ROLE_ADMIN');
  const isManager = userRoles.includes('ROLE_MANAGER');

  const [services, setServices] = useState<ServiceResponse[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isServiceModalOpen, setIsServiceModalOpen] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<ServiceResponse | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [svcData, catData] = await Promise.all([
        serviceCatalogService.getAllServices(false),
        serviceCatalogService.getAllCategories(false),
      ]);
      setServices(svcData);
      setCategories(catData);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi tải danh mục dịch vụ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleToggleStatus = async (service: ServiceResponse) => {
    try {
      const newStatus = !service.trangThai;
      await serviceCatalogService.updateServiceStatus(service.maDichVu, newStatus);
      setToast(
        `Đã ${newStatus ? 'kích hoạt' : 'tạm ngưng'} dịch vụ "${service.tenDichVu}" thành công!`
      );
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể cập nhật trạng thái dịch vụ');
    }
  };

  const handleDeleteService = async (service: ServiceResponse) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa dịch vụ "${service.tenDichVu}"?`)) return;
    try {
      await serviceCatalogService.deleteService(service.maDichVu);
      setToast(`Đã xóa dịch vụ "${service.tenDichVu}" thành công!`);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể xóa dịch vụ này');
    }
  };

  const handleOpenCreate = () => {
    setSelectedService(null);
    setIsServiceModalOpen(true);
  };

  const handleOpenEdit = (svc: ServiceResponse) => {
    setSelectedService(svc);
    setIsServiceModalOpen(true);
  };

  const filteredServices = useMemo(() => {
    return services.filter((svc) => {
      const matchesSearch =
        searchTerm === '' ||
        svc.tenDichVu.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (svc.tenLoaiDichVu && svc.tenLoaiDichVu.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (svc.moTa && svc.moTa.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat =
        categoryFilter === 'ALL' ||
        (svc.maLoaiDichVu && svc.maLoaiDichVu === parseInt(categoryFilter, 10));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && svc.trangThai) ||
        (statusFilter === 'INACTIVE' && !svc.trangThai);

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [services, searchTerm, categoryFilter, statusFilter]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const activeCount = services.filter((s) => s.trangThai).length;
  const inactiveCount = services.filter((s) => !s.trangThai).length;


  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          className="alert alert-info"
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 1100,
            boxShadow: 'var(--shadow-lg)',
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 20px',
            border: 'none',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#ffffff' }}>
            check_circle
          </span>
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{ color: '#ffffff', marginLeft: '12px', display: 'flex', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              close
            </span>
          </button>
        </div>
      )}

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
            Danh Mục Dịch Vụ & Giá Công
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
            Cập nhật dịch vụ, giá tiền công và phụ tùng định mức
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchData}
            disabled={loading}
          >
            <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`} style={{ fontSize: '18px' }}>
              refresh
            </span>
            <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>

          {isAdmin && (
            <>
              <Button
                variant="secondary"
                onClick={() => setIsCategoryModalOpen(true)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-primary)' }}>
                  category
                </span>
                <span>Quản lý loại dịch vụ</span>
              </Button>

              <Button
                variant="primary"
                onClick={handleOpenCreate}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  add
                </span>
                <span>Thêm dịch vụ mới</span>
              </Button>
            </>
          )}
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
            onClick={fetchData}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 4 Summary KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          label="Tổng Số Dịch Vụ"
          value={services.length}
          icon="build"
          colorTheme="default"
          trend="Danh mục hệ thống"
          trendUp={true}
        />
        <KpiCard
          label="Đang Hoạt Động"
          value={activeCount}
          icon="check_circle"
          colorTheme="green"
          trend="Đang áp dụng"
          trendUp={true}
        />
        <KpiCard
          label="Tạm Ngưng"
          value={inactiveCount}
          icon="pause_circle"
          colorTheme="slate"
          trend="Ngưng tiếp nhận"
          trendUp={inactiveCount === 0}
        />
        <KpiCard
          label="Loại Dịch Vụ"
          value={categories.length}
          icon="category"
          colorTheme="orange"
          trend="Phân nhóm dịch vụ"
          trendUp={true}
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="filter-card">
        <div className="filter-search-box">
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder="Tìm tên dịch vụ, loại dịch vụ, mô tả..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">Tất cả loại dịch vụ</option>
            {categories.map((c) => (
              <option key={c.maLoaiDichVu} value={c.maLoaiDichVu}>
                {c.tenLoai} {!c.trangThai ? '(Tạm ngưng)' : ''}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Tạm ngưng</option>
          </select>
        </div>
      </div>

      {/* Main Table Card */}
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
              Đang tải danh mục dịch vụ...
            </p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div style={{ padding: '32px 0' }}>
            <EmptyState
              title="Không tìm thấy dịch vụ nào"
              description="Không có dịch vụ phù hợp. Thử đổi từ khóa hoặc bộ lọc."
            />
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '70px', textAlign: 'center' }}>Mã</th>
                  <th>Dịch Vụ & Mô Tả</th>
                  <th>Loại Dịch Vụ</th>
                  <th style={{ textAlign: 'right' }}>Giá Công</th>
                  <th>Phụ Tùng Kèm Theo</th>
                  <th style={{ textAlign: 'right' }}>Ước Tính Tổng</th>
                  <th style={{ textAlign: 'center' }}>Thời Gian</th>
                  <th style={{ textAlign: 'center' }}>Trạng Thái</th>
                  {(isAdmin || isManager) && (
                    <th style={{ textAlign: 'right', minWidth: '100px', paddingRight: '16px' }}>Thao Tác</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((svc) => {
                  const partsList = svc.parts || svc.defaultParts || [];
                  const partsCount = partsList.length;
                  const partsPrice = svc.tienPhuTungDuKien ?? svc.totalPartPrice ?? 0;
                  const totalEstimated = svc.tongGiaDuKien ?? svc.estimatedTotal ?? (svc.donGia + partsPrice);
                  return (

                    <tr key={svc.maDichVu}>
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
                          #{svc.maDichVu}
                        </span>
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--color-on-surface)', fontSize: '0.9rem' }}>
                          {svc.tenDichVu}
                        </div>
                        {svc.moTa && (
                          <div style={{ fontSize: '0.775rem', color: 'var(--color-on-surface-variant)', marginTop: '2px', maxWidth: '280px' }}>
                            {svc.moTa}
                          </div>
                        )}
                      </td>

                      <td>
                        <span className="status-badge primary">
                          {svc.tenLoaiDichVu || 'Chung'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                        {formatCurrency(svc.donGia)}
                      </td>

                      <td>
                        {partsCount > 0 ? (
                          <div>
                            <span
                              className="status-badge warning"
                              style={{ cursor: 'pointer' }}
                              title={partsList.map((p) => `${p.tenPhuTung} (x${p.soLuong})`).join('\n')}
                            >
                              {partsCount} phụ tùng
                            </span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-outline)', marginTop: '2px' }}>
                              +{formatCurrency(partsPrice)}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-outline)' }}>Thuần công</span>
                        )}
                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-primary-container)' }}>
                        {formatCurrency(totalEstimated)}
                      </td>

                      <td style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                        {svc.thoiGianDuKien ? `${svc.thoiGianDuKien} phút` : '—'}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-badge ${svc.trangThai ? 'success' : 'danger'}`}>
                          {svc.trangThai ? 'Hoạt động' : 'Tạm ngưng'}
                        </span>
                      </td>



                      {(isAdmin || isManager) && (
                        <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                          <ActionDropdown
                            items={[
                              isAdmin
                                ? {
                                    label: 'Chỉnh sửa dịch vụ',
                                    icon: 'edit',
                                    variant: 'primary',
                                    onClick: () => handleOpenEdit(svc),
                                  }
                                : false,
                              {
                                label: svc.trangThai ? 'Tạm ngưng dịch vụ' : 'Kích hoạt dịch vụ',
                                icon: svc.trangThai ? 'pause_circle' : 'check_circle',
                                variant: svc.trangThai ? 'danger' : 'success',
                                onClick: () => handleToggleStatus(svc),
                              },
                              isAdmin
                                ? {
                                    label: 'Xóa dịch vụ',
                                    icon: 'delete',
                                    variant: 'danger',
                                    onClick: () => handleDeleteService(svc),
                                  }
                                : false,
                            ]}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Service Modal (Admin only) */}
      {isAdmin && (
        <ServiceModal
          isOpen={isServiceModalOpen}
          service={selectedService}
          categories={categories}
          onClose={() => {
            setIsServiceModalOpen(false);
            setSelectedService(null);
          }}
          onSuccess={() => {
            setIsServiceModalOpen(false);
            setSelectedService(null);
            setToast('Đã lưu thông tin dịch vụ thành công!');
            fetchData();
          }}
        />
      )}

      {/* Service Category Modal (Admin only) */}
      {isAdmin && (
        <ServiceCategoryModal
          isOpen={isCategoryModalOpen}
          categories={categories}
          onClose={() => setIsCategoryModalOpen(false)}
          onRefresh={() => {
            setToast('Cập nhật loại dịch vụ thành công!');
            fetchData();
          }}
        />
      )}
    </div>
  );
};

