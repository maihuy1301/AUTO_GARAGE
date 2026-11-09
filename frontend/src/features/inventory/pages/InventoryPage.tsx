import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PartResponse, InventoryResponse, StockTransactionResponse } from '@/types/part.types';
import { BranchResponse } from '@/types/branch.types';
import { inventoryService } from '../services/inventory.service';
import { branchService } from '@/features/branches/services/branch.service';
import { PartModal } from '../components/PartModal';
import { StockImportModal } from '../components/StockImportModal';
import { BulkPartModal } from '../components/BulkPartModal';
import { BulkStockImportModal } from '../components/BulkStockImportModal';
import { Button } from '@/components/common/Button';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ActionDropdown } from '@/components/common/ActionDropdown';

export const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const userRoles = user?.roles || [];
  const isAdmin = userRoles.includes('ROLE_ADMIN');
  const isManager = userRoles.includes('ROLE_MANAGER');

  // Tabs
  const [activeTab, setActiveTab] = useState<'catalog' | 'stock' | 'transactions'>('catalog');

  // Data states
  const [parts, setParts] = useState<PartResponse[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryResponse[]>([]);
  const [transactions, setTransactions] = useState<StockTransactionResponse[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isPartModalOpen, setIsPartModalOpen] = useState<boolean>(false);
  const [selectedPart, setSelectedPart] = useState<PartResponse | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [selectedPartForImport, setSelectedPartForImport] = useState<number | undefined>(undefined);
  const [isBulkPartModalOpen, setIsBulkPartModalOpen] = useState<boolean>(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [partsData, stockData, transData] = await Promise.all([
        inventoryService.getAllParts(false),
        inventoryService.getBranchInventory(),
        (isAdmin || isManager) ? inventoryService.getStockTransactions() : Promise.resolve([]),
      ]);

      setParts(partsData);
      setInventoryList(stockData);
      setTransactions(transData);

      if (isAdmin) {
        branchService.getAll().then(setBranches).catch(console.error);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi tải dữ liệu kho');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isManager]);

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

  const handleTogglePartStatus = async (part: PartResponse) => {
    try {
      const newStatus = !part.trangThai;
      await inventoryService.updatePartStatus(part.maPhuTung, newStatus);
      setToast(`Đã ${newStatus ? 'kích hoạt' : 'tạm ngưng'} phụ tùng "${part.tenPhuTung}" thành công!`);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể cập nhật trạng thái phụ tùng');
    }
  };

  const handleDeletePart = async (part: PartResponse) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa phụ tùng "${part.tenPhuTung}" [${part.maPhuTungCode}]?`)) return;
    try {
      await inventoryService.deletePart(part.maPhuTung);
      setToast(`Đã xóa phụ tùng "${part.tenPhuTung}" thành công!`);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể xóa phụ tùng này');
    }
  };

  const handleOpenCreatePart = () => {
    setSelectedPart(null);
    setIsPartModalOpen(true);
  };

  const handleOpenEditPart = (p: PartResponse) => {
    setSelectedPart(p);
    setIsPartModalOpen(true);
  };

  const handleOpenImportModal = (partId?: number) => {
    setSelectedPartForImport(partId);
    setIsImportModalOpen(true);
  };

  // Filtered Parts
  const filteredParts = useMemo(() => {
    return parts.filter((p) => {
      const matchesSearch =
        search === '' ||
        p.tenPhuTung.toLowerCase().includes(search.toLowerCase()) ||
        p.maPhuTungCode.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && p.trangThai) ||
        (statusFilter === 'INACTIVE' && !p.trangThai);

      return matchesSearch && matchesStatus;
    });
  }, [parts, search, statusFilter]);

  // Filtered Stock
  const filteredStock = useMemo(() => {
    return inventoryList.filter((item) => {
      const matchesSearch =
        search === '' ||
        (item.tenPhuTung && item.tenPhuTung.toLowerCase().includes(search.toLowerCase())) ||
        (item.maPhuTungCode && item.maPhuTungCode.toLowerCase().includes(search.toLowerCase())) ||
        (item.tenChiNhanh && item.tenChiNhanh.toLowerCase().includes(search.toLowerCase()));

      const matchesBranch =
        branchFilter === 'ALL' ||
        (item.maChiNhanh && item.maChiNhanh === parseInt(branchFilter, 10));

      return matchesSearch && matchesBranch;
    });
  }, [inventoryList, search, branchFilter]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        search === '' ||
        (t.tenPhuTung && t.tenPhuTung.toLowerCase().includes(search.toLowerCase())) ||
        (t.maPhuTungCode && t.maPhuTungCode.toLowerCase().includes(search.toLowerCase())) ||
        (t.tenChiNhanh && t.tenChiNhanh.toLowerCase().includes(search.toLowerCase())) ||
        (t.ghiChu && t.ghiChu.toLowerCase().includes(search.toLowerCase()));

      const matchesBranch =
        branchFilter === 'ALL' ||
        (t.maChiNhanh && t.maChiNhanh === parseInt(branchFilter, 10));

      return matchesSearch && matchesBranch;
    });
  }, [transactions, search, branchFilter]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('vi-VN');
    } catch {
      return dateStr;
    }
  };

  const lowStockCount = inventoryList.filter((item) => item.soLuongTon <= item.soLuongToiThieu).length;
  const activePartsCount = parts.filter((p) => p.trangThai).length;

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
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
            Quản Lý Kho & Phụ Tùng
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
            Quản lý phụ tùng, tồn kho từng chi nhánh và lịch sử nhập, xuất kho
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            marginLeft: 'auto',
            justifyContent: 'flex-end',
          }}
        >
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

          {(isAdmin || isManager) && (
            <Button
              variant="secondary"
              onClick={() => handleOpenImportModal()}
              style={{ color: '#059669', borderColor: '#059669' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                add_shopping_cart
              </span>
              <span>Nhập kho</span>
            </Button>
          )}

          {isAdmin && (
            <Button
              variant="primary"
              onClick={handleOpenCreatePart}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                add
              </span>
              <span>Thêm phụ tùng mới</span>
            </Button>
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
          label="Tổng Mã Phụ Tùng"
          value={parts.length}
          icon="inventory_2"
          colorTheme="default"
          trend="Phụ tùng trong danh mục"
          trendUp={true}
        />
        <KpiCard
          label="Đang Áp Dụng"
          value={activePartsCount}
          icon="check_circle"
          colorTheme="green"
          trend="Phụ tùng đang sử dụng"
          trendUp={true}
        />
        <KpiCard
          label="Cảnh Báo Tồn Thấp"
          value={lowStockCount}
          icon="warning"
          colorTheme="orange"
          trend="Cần nhập bổ sung"
          trendUp={lowStockCount === 0}
        />
        <KpiCard
          label="Giao Dịch Kho"
          value={transactions.length}
          icon="sync_alt"
          colorTheme="slate"
          trend="Lịch sử nhập/xuất"
          trendUp={true}
        />
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-outline-variant, #e2e8f0)', paddingBottom: '4px' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'catalog' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('catalog')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>list_alt</span>
          Danh mục Phụ tùng ({parts.length})
        </button>

        <button
          type="button"
          className={`btn ${activeTab === 'stock' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('stock')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>warehouse</span>
          Tồn kho chi nhánh ({inventoryList.length})
        </button>

        {(isAdmin || isManager) && (
          <button
            type="button"
            className={`btn ${activeTab === 'transactions' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('transactions')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>history</span>
            Lịch sử Nhập / Xuất kho ({transactions.length})
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="filter-card">
        <div className="filter-search-box">
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder={
              activeTab === 'catalog'
                ? 'Tìm mã phụ tùng, tên phụ tùng...'
                : activeTab === 'stock'
                ? 'Tìm phụ tùng, chi nhánh...'
                : 'Tìm phụ tùng, mã giao dịch, chi nhánh...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          {(activeTab === 'stock' || activeTab === 'transactions') && isAdmin && branches.length > 0 && (
            <select
              className="filter-select"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="ALL">Tất cả chi nhánh</option>
              {branches.map((b) => (
                <option key={b.maChiNhanh} value={b.maChiNhanh}>
                  {b.tenChiNhanh}
                </option>
              ))}
            </select>
          )}

          {activeTab === 'catalog' && (
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang áp dụng</option>
              <option value="INACTIVE">Tạm ngưng</option>
            </select>
          )}
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
              Đang tải dữ liệu kho...
            </p>
          </div>
        ) : (
          <div className="data-table-container">
            {/* TAB 1: CATALOG */}
            {activeTab === 'catalog' && (
              <>
                {filteredParts.length === 0 ? (
                  <div style={{ padding: '32px 0' }}>
                    <EmptyState
                      title="Không tìm thấy phụ tùng nào"
                      description="Không có phụ tùng phù hợp. Thử đổi từ khóa hoặc bộ lọc."
                    />
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '90px', textAlign: 'center' }}>Mã Code</th>
                        <th>Tên Phụ Tùng</th>
                        <th style={{ textAlign: 'center' }}>Đơn Vị Tính</th>
                        {isAdmin && <th style={{ textAlign: 'right' }}>Giá Nhập Chuẩn</th>}
                        <th style={{ textAlign: 'right' }}>Giá Bán Niêm Yết</th>
                        <th style={{ textAlign: 'center' }}>Trạng Thái</th>
                        {(isAdmin || isManager) && <th style={{ textAlign: 'right', minWidth: '100px', paddingRight: '16px' }}>Thao Tác</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParts.map((p) => (
                        <tr key={p.maPhuTung}>
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
                              {p.maPhuTungCode}
                            </span>
                          </td>

                          <td style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>{p.tenPhuTung}</td>

                          <td style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>{p.donViTinh || 'Cái'}</td>

                          {isAdmin && (
                            <td style={{ textAlign: 'right', color: 'var(--color-on-surface-variant)' }}>
                              {p.giaNhap ? formatCurrency(p.giaNhap) : '—'}
                            </td>
                          )}

                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                            {formatCurrency(p.giaBan || 0)}
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <span className={`status-badge ${p.trangThai ? 'success' : 'danger'}`}>
                              {p.trangThai ? 'Hoạt động' : 'Tạm ngưng'}
                            </span>
                          </td>

                          {(isAdmin || isManager) && (
                            <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                              <ActionDropdown
                                items={[
                                  {
                                    label: 'Nhập thêm vào kho',
                                    icon: 'add_shopping_cart',
                                    variant: 'success',
                                    onClick: () => handleOpenImportModal(p.maPhuTung),
                                  },
                                  isAdmin
                                    ? {
                                        label: 'Chỉnh sửa thông tin',
                                        icon: 'edit',
                                        variant: 'primary',
                                        onClick: () => handleOpenEditPart(p),
                                      }
                                    : false,
                                  {
                                    label: p.trangThai ? 'Tạm ngưng áp dụng' : 'Kích hoạt phụ tùng',
                                    icon: p.trangThai ? 'pause_circle' : 'check_circle',
                                    variant: p.trangThai ? 'danger' : 'success',
                                    onClick: () => handleTogglePartStatus(p),
                                  },
                                  isAdmin
                                    ? {
                                        label: 'Xóa phụ tùng',
                                        icon: 'delete',
                                        variant: 'danger',
                                        onClick: () => handleDeletePart(p),
                                      }
                                    : false,
                                ]}
                              />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {/* TAB 2: STOCK */}
            {activeTab === 'stock' && (
              <>
                {filteredStock.length === 0 ? (
                  <div style={{ padding: '32px 0' }}>
                    <EmptyState
                      title="Không có dữ liệu tồn kho"
                      description="Không có số liệu tồn kho phù hợp với bộ lọc."
                    />
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Chi Nhánh</th>
                        <th>Mã Phụ Tùng</th>
                        <th>Tên Phụ Tùng</th>
                        <th style={{ textAlign: 'center' }}>Đơn Vị Tính</th>
                        <th style={{ textAlign: 'right' }}>Giá Bán</th>
                        <th style={{ textAlign: 'center' }}>Số Lượng Tồn</th>
                        <th style={{ textAlign: 'center' }}>Tồn Tối Thiểu</th>
                        <th style={{ textAlign: 'center' }}>Trạng Thái Tồn</th>
                        {(isAdmin || isManager) && <th style={{ textAlign: 'right', minWidth: '100px', paddingRight: '16px' }}>Thao Tác</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStock.map((tk, idx) => {
                        const isLowStock = tk.soLuongTon <= tk.soLuongToiThieu;
                        return (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{tk.tenChiNhanh || '—'}</td>

                            <td>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                  backgroundColor: 'var(--color-surface-container)',
                                  color: 'var(--color-on-surface)',
                                  padding: '2px 6px',
                                  borderRadius: 'var(--radius-sm)',
                                }}
                              >
                                {tk.maPhuTungCode}
                              </span>
                            </td>

                            <td style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>{tk.tenPhuTung}</td>

                            <td style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>{tk.donViTinh || 'Cái'}</td>

                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(tk.giaBan || 0)}</td>

                            <td style={{ textAlign: 'center' }}>
                              <span
                                style={{
                                  fontSize: '1rem',
                                  fontWeight: 800,
                                  color: isLowStock ? 'var(--color-danger, #dc2626)' : 'var(--color-success, #16a34a)',
                                }}
                              >
                                {tk.soLuongTon}
                              </span>
                            </td>

                            <td style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>{tk.soLuongToiThieu}</td>

                            <td style={{ textAlign: 'center' }}>
                              {isLowStock ? (
                                <span className="status-badge danger">
                                  Sắp hết hàng
                                </span>
                              ) : (
                                <span className="status-badge success">
                                  Đủ hàng
                                </span>
                              )}
                            </td>

                            {(isAdmin || isManager) && (
                              <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                                <ActionDropdown
                                  items={[
                                    {
                                      label: 'Nhập thêm vào kho này',
                                      icon: 'add_shopping_cart',
                                      variant: 'success',
                                      onClick: () => handleOpenImportModal(tk.maPhuTung),
                                    },
                                  ]}
                                />
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {/* TAB 3: TRANSACTIONS */}
            {activeTab === 'transactions' && (
              <>
                {filteredTransactions.length === 0 ? (
                  <div style={{ padding: '32px 0' }}>
                    <EmptyState
                      title="Chưa có giao dịch kho nào"
                      description="Chưa có lần nhập hoặc xuất kho nào phù hợp với bộ lọc."
                    />
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '70px', textAlign: 'center' }}>Mã GD</th>
                        <th>Thời Gian</th>
                        <th>Chi Nhánh</th>
                        <th>Loại Giao Dịch</th>
                        <th>Phụ Tùng</th>
                        <th style={{ textAlign: 'center' }}>Số Lượng</th>
                        <th>Phiếu Sửa Chữa</th>
                        <th>Ghi Chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((tx) => {
                        const isNhap = tx.loaiGiaoDich === 'NHAP';
                        return (
                          <tr key={tx.maGiaoDich}>
                            <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--color-outline)' }}>
                              #{tx.maGiaoDich}
                            </td>

                            <td style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                              {formatDateTime(tx.thoiGian)}
                            </td>

                            <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                              {tx.tenChiNhanh || '—'}
                            </td>

                            <td>
                              <span className={`status-badge ${isNhap ? 'success' : 'warning'}`}>
                                {isNhap ? 'NHẬP KHO' : 'XUẤT KHO'}
                              </span>
                            </td>

                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>{tx.tenPhuTung}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-outline)', fontFamily: 'monospace' }}>
                                {tx.maPhuTungCode}
                              </div>
                            </td>

                            <td style={{ textAlign: 'center', fontWeight: 800, color: isNhap ? 'var(--color-success, #16a34a)' : 'var(--color-warning, #ea580c)' }}>
                              {isNhap ? `+${tx.soLuong}` : `-${tx.soLuong}`} {tx.donViTinh || ''}
                            </td>

                            <td style={{ fontSize: '0.85rem' }}>
                              {tx.maPhieuSuaChua ? (
                                <span className="status-badge primary">
                                  Lệnh #{tx.maPhieuSuaChua}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>

                            <td style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', maxWidth: '240px' }}>
                              {tx.ghiChu || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Part Modal (Admin only) */}
      {isAdmin && (
        <PartModal
          isOpen={isPartModalOpen}
          part={selectedPart}
          onClose={() => {
            setIsPartModalOpen(false);
            setSelectedPart(null);
          }}
          onSuccess={() => {
            setIsPartModalOpen(false);
            setSelectedPart(null);
            setToast('Đã lưu thông tin phụ tùng thành công!');
            fetchData();
          }}
          onOpenBulkCreate={() => setIsBulkPartModalOpen(true)}
        />
      )}

      {/* Stock Import Modal (Manager & Admin) */}
      {(isAdmin || isManager) && (
        <StockImportModal
          isOpen={isImportModalOpen}
          parts={parts.filter((p) => p.trangThai)}
          isAdmin={isAdmin}
          selectedPartId={selectedPartForImport}
          onClose={() => {
            setIsImportModalOpen(false);
            setSelectedPartForImport(undefined);
          }}
          onSuccess={() => {
            setIsImportModalOpen(false);
            setSelectedPartForImport(undefined);
            setToast('Nhập kho phụ tùng thành công!');
            fetchData();
          }}
          onOpenBulkImport={() => setIsBulkImportModalOpen(true)}
        />
      )}

      {/* Bulk Part Creation Modal (Admin Only) */}
      {isAdmin && (
        <BulkPartModal
          isOpen={isBulkPartModalOpen}
          existingParts={parts}
          onClose={() => setIsBulkPartModalOpen(false)}
          onSuccess={(count) => {
            setToast(`Đã thêm thành công ${count} phụ tùng mới vào danh mục!`);
            fetchData();
          }}
        />
      )}

      {/* Bulk Stock Import Modal (Manager & Admin) */}
      {(isAdmin || isManager) && (
        <BulkStockImportModal
          isOpen={isBulkImportModalOpen}
          availableParts={parts.filter((p) => p.trangThai)}
          branches={branches}
          isAdmin={isAdmin}
          userBranchId={user?.maChiNhanh ? Number(user.maChiNhanh) : undefined}
          onClose={() => setIsBulkImportModalOpen(false)}
          onSuccess={(count) => {
            setToast(`Đã nhập kho thành công ${count} mặt hàng phụ tùng!`);
            fetchData();
          }}
        />
      )}
    </div>
  );
};
