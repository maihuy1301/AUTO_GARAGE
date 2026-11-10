import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BrandResponse, ModelResponse, CreateBrandRequest, CreateModelRequest } from '@/types/brand-model.types';
import { brandModelService } from '@/features/vehicles/services/brand-model.service';
import { BrandFormModal } from '@/features/vehicles/components/BrandFormModal';
import { ModelFormModal } from '@/features/vehicles/components/ModelFormModal';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { DashboardSkeleton } from '@/features/dashboard/components/DashboardSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/common/Button';
import { ActionDropdown } from '@/components/common/ActionDropdown';

export const BrandModelManagementPage: React.FC = () => {
  const { user } = useAuth();
  const userRoles = user?.roles || [];
  const isAdmin = userRoles.includes('ROLE_ADMIN');

  const [activeTab, setActiveTab] = useState<'BRANDS' | 'MODELS'>('BRANDS');
  const [brands, setBrands] = useState<BrandResponse[]>([]);
  const [allModels, setAllModels] = useState<Record<number, ModelResponse[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Search & Filter
  const [brandSearchTerm, setBrandSearchTerm] = useState<string>('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('ALL');
  const [modelSearchTerm, setModelSearchTerm] = useState<string>('');

  // Modals state
  const [isBrandModalOpen, setIsBrandModalOpen] = useState<boolean>(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState<boolean>(false);
  const [modelTargetBrandId, setModelTargetBrandId] = useState<number | undefined>(undefined);

  // Load all brands and their models
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const brandList = await brandModelService.getActiveBrands();
      setBrands(brandList);

      // Fetch models for each brand concurrently
      const modelMap: Record<number, ModelResponse[]> = {};
      await Promise.all(
        brandList.map(async (b) => {
          try {
            const models = await brandModelService.getModelsByBrand(b.maHangXe);
            modelMap[b.maHangXe] = models;
          } catch {
            modelMap[b.maHangXe] = [];
          }
        })
      );
      setAllModels(modelMap);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('Không tải được danh sách hãng và dòng xe. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Add Brand Submit
  const handleCreateBrand = async (data: CreateBrandRequest) => {
    const created = await brandModelService.createBrand(data);
    setBrands((prev) => [...prev, created]);
    setAllModels((prev) => ({ ...prev, [created.maHangXe]: [] }));
  };

  // Handle Add Model Submit
  const handleCreateModel = async (brandId: number, data: CreateModelRequest) => {
    const created = await brandModelService.createModel(brandId, data);
    setAllModels((prev) => ({
      ...prev,
      [brandId]: [...(prev[brandId] || []), created],
    }));
  };

  // Filtered Brands
  const filteredBrands = useMemo(() => {
    return brands.filter((b) => {
      const term = brandSearchTerm.toLowerCase().trim();
      return !term || b.tenHangXe.toLowerCase().includes(term);
    });
  }, [brands, brandSearchTerm]);

  // Total model count calculation
  const totalModelsCount = useMemo(() => {
    return Object.values(allModels).reduce((acc, list) => acc + list.length, 0);
  }, [allModels]);

  // Filtered Model groups for Model Tab (Tree representation)
  const filteredModelGroups = useMemo(() => {
    return brands
      .filter((b) => selectedBrandFilter === 'ALL' || String(b.maHangXe) === selectedBrandFilter)
      .map((b) => {
        const brandModels = allModels[b.maHangXe] || [];
        const filtered = brandModels.filter((m) => {
          const term = modelSearchTerm.toLowerCase().trim();
          return !term || m.tenModel.toLowerCase().includes(term);
        });
        return {
          brand: b,
          models: filtered,
          totalCount: brandModels.length,
        };
      })
      .filter((group) => modelSearchTerm ? group.models.length > 0 : true);
  }, [brands, allModels, selectedBrandFilter, modelSearchTerm]);

  if (isLoading && brands.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            Quản Lý Hãng Xe & Model Xe
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
            Quản lý hãng xe và các dòng xe thuộc từng hãng.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {lastUpdated && (
            <span style={{ fontSize: '0.8rem', color: 'var(--color-outline)' }}>
              Cập nhật lúc: {lastUpdated}
            </span>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadData}
            disabled={isLoading}
          >
            <span className={`material-symbols-outlined ${isLoading ? 'animate-spin' : ''}`} style={{ fontSize: '18px' }}>
              refresh
            </span>
            <span>{isLoading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>

          {isAdmin && (
            activeTab === 'BRANDS' ? (
              <Button
                variant="primary"
                onClick={() => setIsBrandModalOpen(true)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  add_circle
                </span>
                <span>Thêm hãng xe</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => {
                  setModelTargetBrandId(selectedBrandFilter !== 'ALL' ? Number(selectedBrandFilter) : undefined);
                  setIsModelModalOpen(true);
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  add_circle
                </span>
                <span>Thêm Model xe</span>
              </Button>
            )
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger">
          <span className="material-symbols-outlined">error</span>
          <span style={{ flex: 1 }}>{error}</span>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
            onClick={loadData}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          label="Tổng Hãng Xe"
          value={brands.length}
          icon="category"
          colorTheme="default"
          trend="Hãng đang hoạt động"
          trendUp={true}
        />
        <KpiCard
          label="Tổng Dòng Xe (Model)"
          value={totalModelsCount}
          icon="directions_car"
          colorTheme="green"
          trend="Model trong hệ thống"
          trendUp={true}
        />
        <KpiCard
          label="Trung Bình Model / Hãng"
          value={brands.length > 0 ? (totalModelsCount / brands.length).toFixed(1) : '0'}
          icon="analytics"
          colorTheme="orange"
          trend="Độ đa dạng danh mục"
          trendUp={true}
        />
        <KpiCard
          label="Trạng Thái Danh Mục"
          value="Sẵn Sàng"
          icon="verified"
          colorTheme="slate"
          trend="Cascading Dropdown Active"
          trendUp={true}
        />
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'BRANDS' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('BRANDS')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            category
          </span>
          <span>Danh Mục Hãng Xe ({brands.length})</span>
        </button>

        <button
          type="button"
          className={`btn ${activeTab === 'MODELS' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('MODELS')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            account_tree
          </span>
          <span>Model Xe Theo Hãng ({totalModelsCount})</span>
        </button>
      </div>

      {/* TAB 1: BRANDS LIST */}
      {activeTab === 'BRANDS' && (
        <div>
          {/* Search Bar */}
          <div className="filter-card">
            <div className="filter-search-box">
              <span className="material-symbols-outlined">search</span>
              <input
                type="text"
                placeholder="Tìm kiếm theo tên hãng xe (VD: Toyota, Honda, Hyundai...)..."
                value={brandSearchTerm}
                onChange={(e) => setBrandSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Brands Table */}
          <div className="data-table-card">
            {filteredBrands.length === 0 ? (
              <div style={{ padding: '32px 0' }}>
                <EmptyState
                  title="Không tìm thấy hãng xe"
                  description={
                    brands.length === 0
                      ? 'Chưa có hãng xe nào trong hệ thống. Hãy thêm hãng xe mới.'
                      : 'Không tìm thấy hãng xe nào khớp với từ khóa tìm kiếm.'
                  }
                />
              </div>
            ) : (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mã Hãng</th>
                      <th>Tên Hãng Xe</th>
                      <th>Số Lượng Model</th>
                      <th>Trạng Thái</th>
                      <th style={{ textAlign: 'right', paddingRight: '16px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBrands.map((brand) => {
                      const count = (allModels[brand.maHangXe] || []).length;
                      return (
                        <tr key={brand.maHangXe}>
                          <td>
                            <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                              #{brand.maHangXe}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: 'var(--radius-md)',
                                  backgroundColor: 'var(--color-surface-container-high)',
                                  color: 'var(--color-primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '0.85rem',
                                }}
                              >
                                {brand.tenHangXe.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-on-surface)' }}>
                                {brand.tenHangXe}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="status-badge primary">
                              {count} dòng xe (Model)
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${brand.trangThai !== false ? 'success' : 'danger'}`}>
                              {brand.trangThai !== false ? 'Hoạt động' : 'Tạm khóa'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                            <ActionDropdown
                              items={[
                                {
                                  label: 'Xem các dòng xe (Model)',
                                  icon: 'account_tree',
                                  onClick: () => {
                                    setSelectedBrandFilter(String(brand.maHangXe));
                                    setActiveTab('MODELS');
                                  },
                                },
                                isAdmin
                                  ? {
                                      label: 'Thêm dòng xe mới',
                                      icon: 'add_circle',
                                      variant: 'primary',
                                      onClick: () => {
                                        setModelTargetBrandId(brand.maHangXe);
                                        setIsModelModalOpen(true);
                                      },
                                    }
                                  : false,
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
        </div>
      )}

      {/* TAB 2: MODELS BY BRAND (Cascading Tree / Group View) */}
      {activeTab === 'MODELS' && (
        <div>
          {/* Search & Filter Bar */}
          <div className="filter-card">
            <div className="filter-search-box">
              <span className="material-symbols-outlined">search</span>
              <input
                type="text"
                placeholder="Tìm tên Model xe (VD: Camry, Vios, City, CR-V, Civic...)..."
                value={modelSearchTerm}
                onChange={(e) => setModelSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-controls">
              <select
                className="filter-select"
                value={selectedBrandFilter}
                onChange={(e) => setSelectedBrandFilter(e.target.value)}
              >
                <option value="ALL">Tất cả hãng xe ({brands.length})</option>
                {brands.map((b) => (
                  <option key={b.maHangXe} value={b.maHangXe}>
                    {b.tenHangXe}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Model Groups */}
          {filteredModelGroups.length === 0 ? (
            <div className="data-table-card" style={{ padding: '32px 0' }}>
              <EmptyState
                title="Không tìm thấy Model xe"
                description="Không tìm thấy dòng xe phù hợp. Thử đổi từ khóa hoặc chọn hãng khác."
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredModelGroups.map(({ brand, models, totalCount }) => (
                <div
                  key={brand.maHangXe}
                  className="data-table-card"
                  style={{ padding: '20px' }}
                >
                  {/* Brand Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--color-primary)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '1.1rem',
                        }}
                      >
                        {brand.tenHangXe.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                          {brand.tenHangXe}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '2px' }}>
                          Mã Hãng: #{brand.maHangXe} • {totalCount} model xe đã đăng ký
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setModelTargetBrandId(brand.maHangXe);
                          setIsModelModalOpen(true);
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                          add
                        </span>
                        <span>Thêm Model cho {brand.tenHangXe}</span>
                      </Button>
                    )}
                  </div>

                  {/* Models Grid / Tree */}
                  {models.length === 0 ? (
                    <div
                      style={{
                        padding: '16px',
                        backgroundColor: 'var(--color-surface-gray)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                        color: 'var(--color-outline)',
                        fontSize: '0.875rem',
                      }}
                    >
                      Chưa có model xe nào cho hãng này. Nhấn nút &quot;Thêm Model&quot; để tạo mới.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                        gap: '12px',
                      }}
                    >
                      {models.map((m) => (
                        <div
                          key={m.maModel}
                          style={{
                            padding: '12px 16px',
                            backgroundColor: 'var(--color-surface-container-low)',
                            border: '1px solid var(--color-outline-variant)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-primary)' }}>
                              directions_car
                            </span>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--color-on-surface)', fontSize: '0.9rem' }}>
                                {m.tenModel}
                              </div>
                              <div style={{ fontSize: '0.725rem', color: 'var(--color-outline)' }}>
                                ID: #{m.maModel}
                              </div>
                            </div>
                          </div>

                          <span className={`status-badge ${m.trangThai !== false ? 'success' : 'danger'}`} style={{ fontSize: '0.7rem' }}>
                            {m.trangThai !== false ? 'Khả dụng' : 'Khóa'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals (Chỉ Admin mới có quyền tạo mới) */}
      {isAdmin && (
        <>
          <BrandFormModal
            isOpen={isBrandModalOpen}
            onClose={() => setIsBrandModalOpen(false)}
            onSubmit={handleCreateBrand}
          />

          <ModelFormModal
            isOpen={isModelModalOpen}
            brandsList={brands}
            selectedBrandId={modelTargetBrandId}
            onClose={() => setIsModelModalOpen(false)}
            onSubmit={handleCreateModel}
          />
        </>
      )}
    </div>
  );
};
