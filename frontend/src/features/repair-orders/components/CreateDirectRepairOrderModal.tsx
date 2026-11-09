import React, { useState, useEffect, useMemo } from 'react';
import {
  RepairOrderResponse,
  CreateDirectRepairOrderRequest,
} from '@/types/repair-order.types';
import { CustomerResponse } from '@/types/customer.types';
import { VehicleResponse } from '@/types/vehicle.types';
import { ServiceItem, ServicePartResponse } from '@/types/service.types';
import { customerService } from '@/features/customers/services/customer.service';
import { vehicleService } from '@/features/vehicles/services/vehicle.service';
import { serviceCatalogService } from '@/features/services/services/serviceCatalog.service';
import { invoiceService } from '@/features/invoices/services/invoice.service';
import { repairOrderService } from '../services/repairOrder.service';
import { Button } from '@/components/common/Button';

interface SelectedServiceEntry {
  maDichVu: number;
  tenDichVu: string;
  donGia: number;
  soLuong: number;
  ghiChu?: string;
  parts?: ServicePartResponse[];
  tienPhuTungDuKien?: number;
  tongGiaDuKien?: number;
}

interface CreateDirectRepairOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newOrder: RepairOrderResponse) => void;
}

export const CreateDirectRepairOrderModal: React.FC<CreateDirectRepairOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Master Data
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [availableServices, setAvailableServices] = useState<ServiceItem[]>([]);
  const [existingOrders, setExistingOrders] = useState<RepairOrderResponse[]>([]);
  const [invoicedOrderIds, setInvoicedOrderIds] = useState<Set<number>>(new Set());

  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [loadingCustomerVehicles, setLoadingCustomerVehicles] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Quick Parent Order Search & Selection
  const [parentOrderSearch, setParentOrderSearch] = useState<string>('');
  const [selectedParentOrderId, setSelectedParentOrderId] = useState<number | ''>('');

  // Form State
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | ''>('');
  const [soKm, setSoKm] = useState<string>('');
  const [yeuCauKhachHang, setYeuCauKhachHang] = useState<string>('');
  const [thoiGianBatDau, setThoiGianBatDau] = useState<string>('');
  const [ghiChu, setGhiChu] = useState<string>('');

  // Selected Services List
  const [selectedServices, setSelectedServices] = useState<SelectedServiceEntry[]>([]);
  const [tempServiceId, setTempServiceId] = useState<number | ''>('');
  const [tempQuantity, setTempQuantity] = useState<number>(1);
  const [tempNote, setTempNote] = useState<string>('');

  // Initial Load
  useEffect(() => {
    if (!isOpen) return;

    // Reset form
    setError(null);
    setParentOrderSearch('');
    setSelectedParentOrderId('');
    setSelectedCustomerId('');
    setCustomerSearch('');
    setSelectedVehicleId('');
    setSoKm('');
    setYeuCauKhachHang('');
    setGhiChu('');
    setSelectedServices([]);
    setTempServiceId('');
    setTempQuantity(1);
    setTempNote('');
    setLoadingCustomerVehicles(false);

    // Set default datetime to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setThoiGianBatDau(now.toISOString().slice(0, 16));

    const loadMasterData = async () => {
      try {
        setLoadingData(true);
        const [customersRes, vehiclesRes, servicesRes, ordersRes, invoicesRes] = await Promise.all([
          customerService.getAll().catch(() => []),
          vehicleService.getAll().catch(() => []),
          serviceCatalogService.getAll().catch(() => []),
          repairOrderService.getAll().catch(() => []),
          invoiceService.getAll().catch(() => []),
        ]);

        setCustomers(customersRes.filter((c) => c.trangThai !== false));
        setVehicles(vehiclesRes);
        setAvailableServices(servicesRes.filter((s) => s.trangThai !== false));
        // Hiển thị các phiếu sửa chữa chưa bị hủy (bao gồm cả phiếu đang sửa hoặc vừa tạo)
        setExistingOrders(ordersRes.filter((o) => o.trangThai !== 'HUY'));

        const invoicedSet = new Set<number>();
        (invoicesRes || []).forEach((inv) => {
          if (inv.maPhieuSuaChua) {
            invoicedSet.add(inv.maPhieuSuaChua);
          }
        });
        (ordersRes || []).forEach((o) => {
          if (o.daXuatHoaDon && o.maPhieuSuaChua) {
            invoicedSet.add(o.maPhieuSuaChua);
          }
        });
        setInvoicedOrderIds(invoicedSet);
      } catch (err: any) {
        console.error('Lỗi khi tải dữ liệu khởi tạo tạo phiếu sửa chữa:', err);
        setError('Không thể tải đầy đủ danh mục dữ liệu. Vui lòng thử lại.');
      } finally {
        setLoadingData(false);
      }
    };

    loadMasterData();
  }, [isOpen]);

  // Helper check whether order is already invoiced
  const isOrderInvoiced = (order: RepairOrderResponse) => {
    return Boolean(order.daXuatHoaDon || invoicedOrderIds.has(order.maPhieuSuaChua));
  };

  // Filter Parent Orders by search (Chỉ hiển thị phiếu gốc: maPhieuCha == null để tránh lồng nhánh con)
  const filteredParentOrders = useMemo(() => {
    const rootOrders = existingOrders.filter((o) => !o.maPhieuCha);
    if (!parentOrderSearch.trim()) return rootOrders;
    const q = parentOrderSearch.toLowerCase();
    return rootOrders.filter((o) => {
      const id = `#${o.maPhieuSuaChua}`.toLowerCase();
      const plate = (o.bienSoXe || '').toLowerCase();
      const cus = (o.tenKhachHang || '').toLowerCase();
      const phone = (o.soDienThoaiKhachHang || '').toLowerCase();
      const model = `${o.hangXe || o.tenHangXe || ''} ${o.modelXe || o.tenModel || ''}`.toLowerCase();
      return id.includes(q) || plate.includes(q) || cus.includes(q) || phone.includes(q) || model.includes(q);
    });
  }, [existingOrders, parentOrderSearch]);

  // Selected Parent Order Info
  const selectedParentOrderInfo = useMemo(() => {
    if (!selectedParentOrderId) return null;
    return existingOrders.find((o) => o.maPhieuSuaChua === Number(selectedParentOrderId)) || null;
  }, [existingOrders, selectedParentOrderId]);

  // Handler: When user selects Parent Order -> Auto-fill Customer, Vehicle, etc.
  const handleParentOrderChange = async (parentOrderId: number | '') => {
    if (!parentOrderId) {
      setSelectedParentOrderId('');
      return;
    }

    const parentOrder = existingOrders.find((o) => o.maPhieuSuaChua === Number(parentOrderId));
    if (!parentOrder) return;

    if (isOrderInvoiced(parentOrder)) {
      setError(`Phiếu sửa chữa #${parentOrder.maPhieuSuaChua} đã được xuất hóa đơn thanh toán. Vui lòng tạo phiếu sửa chữa độc lập.`);
      setSelectedParentOrderId('');
      return;
    }

    setSelectedParentOrderId(parentOrderId);

    // 1. Auto-fill Customer
    if (parentOrder.maKhachHang) {
      setSelectedCustomerId(parentOrder.maKhachHang);

      // Load vehicles for this customer to ensure smooth UI
      try {
        setLoadingCustomerVehicles(true);
        const cusVehicles = await vehicleService.getAll(parentOrder.maKhachHang);
        setVehicles((prev) => {
          const map = new Map<number, VehicleResponse>();
          prev.forEach((v) => map.set(v.maXe, v));
          cusVehicles.forEach((v) => map.set(v.maXe, v));
          return Array.from(map.values());
        });

        // 2. Auto-fill Vehicle
        if (parentOrder.maXe) {
          setSelectedVehicleId(parentOrder.maXe);
          const currentV = cusVehicles.find((v) => v.maXe === parentOrder.maXe);
          if (currentV?.soKmHienTai) {
            setSoKm(String(currentV.soKmHienTai));
          }
        }
      } catch (e) {
        console.error('Lỗi khi nạp danh sách xe của phiếu cha:', e);
      } finally {
        setLoadingCustomerVehicles(false);
      }
    } else if (parentOrder.maXe) {
      setSelectedVehicleId(parentOrder.maXe);
    }

    // 3. Auto-fill / Prefix Customer Request
    setYeuCauKhachHang((prev) => {
      const prefix = `[Phát sinh từ Phiếu #${parentOrder.maPhieuSuaChua}] `;
      if (!prev || prev.startsWith('[Phát sinh từ Phiếu #')) {
        return prefix;
      }
      return `${prefix}${prev}`;
    });
  };

  // Filter Customers by search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        (c.hoTen || '').toLowerCase().includes(q) ||
        (c.soDienThoai || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  // Filter Vehicles for selected customer
  const customerVehicles = useMemo(() => {
    if (!selectedCustomerId) return [];
    return vehicles.filter((v) => v.maKhachHang === Number(selectedCustomerId));
  }, [vehicles, selectedCustomerId]);

  // When customer changes manually
  const handleCustomerChange = async (customerId: number | '') => {
    setSelectedCustomerId(customerId);
    setSelectedVehicleId('');

    if (customerId) {
      try {
        setLoadingCustomerVehicles(true);
        const customerVehiclesRes = await vehicleService.getAll(Number(customerId));
        setVehicles((prev) => {
          const map = new Map<number, VehicleResponse>();
          prev.forEach((v) => map.set(v.maXe, v));
          customerVehiclesRes.forEach((v) => map.set(v.maXe, v));
          return Array.from(map.values());
        });
      } catch (e) {
        console.error('Lỗi khi tải danh sách xe của khách hàng:', e);
      } finally {
        setLoadingCustomerVehicles(false);
      }
    }
  };

  // When vehicle changes manually
  const handleVehicleChange = (vehicleId: number | '') => {
    setSelectedVehicleId(vehicleId);
    const v = vehicles.find((x) => x.maXe === Number(vehicleId));
    if (v?.soKmHienTai) {
      setSoKm(String(v.soKmHienTai));
    }
  };

  // Add Service Handler
  const handleAddService = () => {
    if (!tempServiceId) return;
    const serviceDef = availableServices.find((s) => s.maDichVu === Number(tempServiceId));
    if (!serviceDef) return;

    // Check if already added
    const existingIndex = selectedServices.findIndex((s) => s.maDichVu === serviceDef.maDichVu);
    if (existingIndex >= 0) {
      const updated = [...selectedServices];
      updated[existingIndex].soLuong = (updated[existingIndex].soLuong || 1) + tempQuantity;
      if (tempNote.trim()) {
        updated[existingIndex].ghiChu = tempNote.trim();
      }
      setSelectedServices(updated);
    } else {
      setSelectedServices([
        ...selectedServices,
        {
          maDichVu: serviceDef.maDichVu,
          tenDichVu: serviceDef.tenDichVu,
          donGia: serviceDef.donGia,
          soLuong: tempQuantity > 0 ? tempQuantity : 1,
          ghiChu: tempNote.trim() || undefined,
          parts: serviceDef.parts || [],
          tienPhuTungDuKien: serviceDef.tienPhuTungDuKien || 0,
          tongGiaDuKien: serviceDef.tongGiaDuKien || serviceDef.donGia || 0,
        },
      ]);
    }

    setTempServiceId('');
    setTempQuantity(1);
    setTempNote('');
  };

  // Remove Service Handler
  const handleRemoveService = (serviceId: number) => {
    setSelectedServices(selectedServices.filter((s) => s.maDichVu !== serviceId));
  };

  // Calculate estimated totals (Labor, Parts, Total)
  const estimatedTotals = useMemo(() => {
    let labor = 0;
    let parts = 0;
    selectedServices.forEach((item) => {
      const qty = item.soLuong || 1;
      labor += (item.donGia || 0) * qty;
      parts += (item.tienPhuTungDuKien || 0) * qty;
    });
    return {
      labor,
      parts,
      total: labor + parts,
    };
  }, [selectedServices]);

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCustomerId) {
      setError('Vui lòng chọn khách hàng.');
      return;
    }

    if (!selectedVehicleId) {
      setError('Vui lòng chọn phương tiện của khách hàng.');
      return;
    }

    if (selectedServices.length === 0) {
      setError('Vui lòng chọn ít nhất một dịch vụ yêu cầu từ danh mục.');
      return;
    }

    if (selectedParentOrderId) {
      const parentOrder = existingOrders.find((o) => o.maPhieuSuaChua === Number(selectedParentOrderId));
      if (parentOrder && isOrderInvoiced(parentOrder)) {
        setError(`Phiếu sửa chữa cha #${selectedParentOrderId} đã được xuất hóa đơn thanh toán, không thể tạo thêm phiếu phát sinh kế thừa.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      // Expand service ids by quantity if needed
      const serviceIds: number[] = [];
      selectedServices.forEach((s) => {
        for (let i = 0; i < (s.soLuong || 1); i++) {
          serviceIds.push(s.maDichVu);
        }
      });

      const payload: CreateDirectRepairOrderRequest = {
        maKhachHang: Number(selectedCustomerId),
        maXe: Number(selectedVehicleId),
        maPhieuCha: selectedParentOrderId ? Number(selectedParentOrderId) : undefined,
        serviceIds: serviceIds,
        soKm: soKm ? Number(soKm) : undefined,
        yeuCauKhachHang: yeuCauKhachHang.trim() || undefined,
        thoiGianBatDau: thoiGianBatDau ? new Date(thoiGianBatDau).toISOString() : undefined,
        ghiChu: ghiChu.trim() || undefined,
      };

      const result = await repairOrderService.createDirect(payload);
      onSuccess(result);
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi tạo lệnh sửa chữa chủ động:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Không thể tạo lệnh sửa chữa. Vui lòng kiểm tra lại thông tin.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '880px', width: '95%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }}>
                playlist_add_circle
              </span>
              Tạo lệnh sửa chữa / phiếu phát sinh
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--color-outline)' }}>
              Tạo lệnh cho khách vãng lai hoặc lập phiếu phát sinh từ lệnh sửa chữa đã có
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} type="button" aria-label="Đóng">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto', padding: '20px' }}>
            {error && (
              <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  error
                </span>
                <span>{error}</span>
              </div>
            )}

            {/* QUICK PARENT ORDER SELECTION (AUTO-FILL FEATURE) */}
            <div
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '22px' }}>
                    bolt
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-primary)' }}>
                    Lập phiếu phát sinh từ lệnh có sẵn (không bắt buộc)
                  </span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-outline)' }}>
                  Chọn lệnh gốc để điền sẵn khách hàng, xe và tình trạng xe. Không chọn được lệnh đã xuất hóa đơn.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(300px, 2fr)', gap: '10px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="🔍 Lọc phiếu cha theo mã, biển số, tên khách..."
                  value={parentOrderSearch}
                  onChange={(e) => setParentOrderSearch(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />

                <select
                  id="direct-ro-parent"
                  className="form-input"
                  value={selectedParentOrderId}
                  onChange={(e) => handleParentOrderChange(e.target.value ? Number(e.target.value) : '')}
                  disabled={submitting}
                  style={{ fontSize: '0.85rem', fontWeight: selectedParentOrderId ? 600 : 400 }}
                >
                  <option value="">-- Không có (Tạo phiếu sửa chữa độc lập) --</option>
                  {filteredParentOrders.map((po) => {
                    const invoiced = isOrderInvoiced(po);
                    return (
                      <option
                        key={po.maPhieuSuaChua}
                        value={po.maPhieuSuaChua}
                        disabled={invoiced}
                        style={invoiced ? { color: '#9ca3af', backgroundColor: '#f3f4f6' } : undefined}
                      >
                        #{po.maPhieuSuaChua} - {po.bienSoXe} ({po.hangXe || ''} {po.modelXe || ''}) - {po.tenKhachHang || 'Khách vãng lai'} [{po.trangThai}]
                        {invoiced ? ' ⛔ [ĐÃ XUẤT HÓA ĐƠN - KHÔNG KHẢ DỤNG]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedParentOrderInfo && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      ✓ Đã liên kết Phiếu #{selectedParentOrderInfo.maPhieuSuaChua}:
                    </span>{' '}
                    <span style={{ color: 'var(--color-on-surface)' }}>
                      {selectedParentOrderInfo.bienSoXe} - {selectedParentOrderInfo.tenKhachHang} ({selectedParentOrderInfo.soDienThoaiKhachHang || 'SĐT N/A'})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleParentOrderChange('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-danger)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      close
                    </span>
                    Bỏ chọn
                  </button>
                </div>
              )}
            </div>

            {/* Row: Customer & Vehicle Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* Customer */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="direct-ro-customer">
                  Khách hàng <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="🔍 Gõ tên hoặc SĐT để lọc khách hàng..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  />
                  <select
                    id="direct-ro-customer"
                    className="form-input"
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerChange(e.target.value ? Number(e.target.value) : '')}
                    disabled={submitting || loadingData}
                    required
                  >
                    <option value="">-- Chọn khách hàng ({filteredCustomers.length}) --</option>
                    {filteredCustomers.map((c) => (
                      <option key={c.maKhachHang} value={c.maKhachHang}>
                        {c.hoTen} - {c.soDienThoai}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vehicle */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="direct-ro-vehicle">
                  Phương tiện <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <select
                  id="direct-ro-vehicle"
                  className="form-input"
                  value={selectedVehicleId}
                  onChange={(e) => handleVehicleChange(e.target.value ? Number(e.target.value) : '')}
                  disabled={submitting || !selectedCustomerId || loadingCustomerVehicles}
                  required
                >
                  <option value="">
                    {loadingCustomerVehicles
                      ? '⏳ Đang tải danh sách xe của khách hàng...'
                      : !selectedCustomerId
                      ? '-- Vui lòng chọn khách hàng trước --'
                      : customerVehicles.length === 0
                      ? '-- Khách hàng chưa có xe nào --'
                      : `-- Chọn phương tiện (${customerVehicles.length} xe) --`}
                  </option>
                  {customerVehicles.map((v) => (
                    <option key={v.maXe} value={v.maXe}>
                      {v.bienSo} ({v.tenHangXe || v.hangXe || ''} {v.tenModel || v.model || ''} - {v.namSanXuat || 'N/A'})
                    </option>
                  ))}
                </select>
                {selectedCustomerId && !loadingCustomerVehicles && customerVehicles.length === 0 && (
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--color-danger)' }}>
                    Khách hàng này chưa có xe được ghi nhận trong hệ thống.
                  </p>
                )}
              </div>
            </div>

            {/* Row: Odometer & Start Time */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* Odometer */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="direct-ro-sokm">
                  Số Km hiện tại
                </label>
                <input
                  id="direct-ro-sokm"
                  type="number"
                  min="0"
                  className="form-input"
                  placeholder="VD: 45000"
                  value={soKm}
                  onChange={(e) => setSoKm(e.target.value)}
                  disabled={submitting}
                />
              </div>

              {/* Start Time */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="direct-ro-starttime">
                  Thời gian bắt đầu dự kiến
                </label>
                <input
                  id="direct-ro-starttime"
                  type="datetime-local"
                  className="form-input"
                  value={thoiGianBatDau}
                  onChange={(e) => setThoiGianBatDau(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Customer Request */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="direct-ro-request">
                Yêu cầu của khách hàng / Tình trạng xe
              </label>
              <input
                id="direct-ro-request"
                type="text"
                className="form-input"
                placeholder="VD: [Phát sinh] Kiểm tra thêm hệ thống phanh sau..."
                value={yeuCauKhachHang}
                onChange={(e) => setYeuCauKhachHang(e.target.value)}
                disabled={submitting}
              />
            </div>

            {/* Ghi chú */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="direct-ro-note">
                Ghi chú sửa chữa
              </label>
              <textarea
                id="direct-ro-note"
                className="form-input"
                style={{ height: 'auto', minHeight: '55px', resize: 'vertical' }}
                placeholder="Nhập ghi chú hoặc yêu cầu kỹ thuật đặc biệt..."
                value={ghiChu}
                onChange={(e) => setGhiChu(e.target.value)}
                disabled={submitting}
                maxLength={500}
              />
            </div>

            {/* Service Catalog Multi-Add */}
            <div
              style={{
                backgroundColor: 'var(--color-surface-container-low)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                border: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-on-surface)' }}>
                  🛠️ Hạng Mục Dịch Vụ Yêu Cầu <span style={{ color: 'var(--color-danger)' }}>*</span>
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-outline)' }}>
                  Đã chọn: <strong>{selectedServices.length}</strong> dịch vụ
                </span>
              </div>

              {/* Add Service Inputs */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(200px, 2fr) 90px minmax(150px, 1fr) auto',
                  gap: '8px',
                  alignItems: 'center',
                }}
              >
                <select
                  className="form-input"
                  style={{ fontSize: '0.85rem' }}
                  value={tempServiceId}
                  onChange={(e) => setTempServiceId(e.target.value ? Number(e.target.value) : '')}
                  disabled={submitting}
                >
                  <option value="">-- Chọn dịch vụ từ danh mục --</option>
                  {availableServices.map((s) => (
                    <option key={s.maDichVu} value={s.maDichVu}>
                      {s.tenDichVu} (Công: {(s.donGia || 0).toLocaleString('vi-VN')} đ{s.parts && s.parts.length > 0 ? ` + ${s.parts.length} phụ tùng ~${(s.tongGiaDuKien || s.donGia).toLocaleString('vi-VN')} đ` : ''})
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  className="form-input"
                  style={{ fontSize: '0.85rem' }}
                  placeholder="SL"
                  value={tempQuantity}
                  onChange={(e) => setTempQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={submitting}
                />

                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.85rem' }}
                  placeholder="Ghi chú dịch vụ..."
                  value={tempNote}
                  onChange={(e) => setTempNote(e.target.value)}
                  disabled={submitting}
                />

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddService}
                  disabled={!tempServiceId || submitting}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '4px' }}>
                    add
                  </span>
                  Thêm
                </Button>
              </div>

              {/* Selected Services Table */}
              {selectedServices.length > 0 ? (
                <div style={{ overflowX: 'auto', marginTop: '6px' }}>
                  <table className="data-table" style={{ fontSize: '0.85rem', width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-surface-container)' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Dịch vụ</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Đơn giá</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>SL</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Thành tiền</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Ghi chú</th>
                        <th style={{ padding: '8px', textAlign: 'center', width: '40px' }}>Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedServices.map((item) => {
                        const price = item.donGia || 0;
                        const qty = item.soLuong || 1;
                        const hasParts = Boolean(item.parts && item.parts.length > 0);
                        return (
                          <React.Fragment key={item.maDichVu}>
                            <tr style={{ borderBottom: hasParts ? 'none' : '1px solid var(--color-border)' }}>
                              <td style={{ padding: '8px', fontWeight: 600 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{item.tenDichVu}</span>
                                  {hasParts && (
                                    <span
                                      style={{
                                        fontSize: '0.72rem',
                                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                        color: 'var(--color-primary)',
                                        padding: '1px 6px',
                                        borderRadius: '10px',
                                        fontWeight: 600,
                                      }}
                                    >
                                      {item.parts!.length} phụ tùng
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '8px', textAlign: 'right' }}>{price.toLocaleString('vi-VN')} đ</td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>{qty}</td>
                              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: 'var(--color-primary)' }}>
                                {(price * qty).toLocaleString('vi-VN')} đ
                              </td>
                              <td style={{ padding: '8px', color: 'var(--color-outline)' }}>{item.ghiChu || '-'}</td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveService(item.maDichVu)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-danger)',
                                    cursor: 'pointer',
                                    padding: '2px',
                                  }}
                                  title="Xóa"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                    delete
                                  </span>
                                </button>
                              </td>
                            </tr>
                            {hasParts && (
                              <tr style={{ backgroundColor: 'var(--color-surface-container-low)' }}>
                                <td colSpan={6} style={{ padding: '6px 12px 10px 24px', borderBottom: '1px solid var(--color-border)' }}>
                                  <div
                                    style={{
                                      fontSize: '0.75rem',
                                      color: 'var(--color-outline)',
                                      fontWeight: 600,
                                      marginBottom: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-primary)' }}>
                                      build_circle
                                    </span>
                                    Phụ tùng định mức kèm theo ({item.parts!.length}):
                                  </div>
                                  <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse', backgroundColor: '#ffffff', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                                    <thead>
                                      <tr style={{ color: 'var(--color-on-surface-variant)', borderBottom: '1px solid var(--color-border)' }}>
                                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Tên phụ tùng</th>
                                        <th style={{ textAlign: 'center', padding: '4px 8px' }}>SL định mức</th>
                                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>Đơn giá</th>
                                        <th style={{ textAlign: 'right', padding: '4px 8px' }}>Thành tiền</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {item.parts!.map((p) => (
                                        <tr key={p.maPhuTung} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                          <td style={{ padding: '4px 8px' }}>{p.tenPhuTung}</td>
                                          <td style={{ textAlign: 'center', padding: '4px 8px' }}>
                                            {(p.soLuong || 1) * qty} {p.donViTinh || ''}
                                          </td>
                                          <td style={{ textAlign: 'right', padding: '4px 8px' }}>
                                            {Number(p.donGia || 0).toLocaleString('vi-VN')} đ
                                          </td>
                                          <td style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>
                                            {(Number(p.donGia || 0) * (p.soLuong || 1) * qty).toLocaleString('vi-VN')} đ
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  <div style={{ textAlign: 'right', marginTop: '4px', fontSize: '0.75rem', color: 'var(--color-outline)' }}>
                                    Tiền phụ tùng định mức: <strong style={{ color: 'var(--color-on-surface)' }}>{((item.tienPhuTungDuKien || 0) * qty).toLocaleString('vi-VN')} đ</strong>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} style={{ padding: '8px', fontSize: '0.85rem', textAlign: 'right', color: 'var(--color-on-surface-variant)' }}>
                          Tiền công dịch vụ:
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>
                          {estimatedTotals.labor.toLocaleString('vi-VN')} đ
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                      {estimatedTotals.parts > 0 && (
                        <tr>
                          <td colSpan={3} style={{ padding: '8px', fontSize: '0.85rem', textAlign: 'right', color: 'var(--color-on-surface-variant)' }}>
                            Tiền phụ tùng định mức:
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>
                            {estimatedTotals.parts.toLocaleString('vi-VN')} đ
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      )}
                      <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                        <td colSpan={3} style={{ padding: '10px 8px', fontWeight: 700, textAlign: 'right', fontSize: '0.9rem' }}>
                          Tổng dự kiến tạm tính:
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--color-primary)', fontSize: '1.05rem' }}>
                          {estimatedTotals.total.toLocaleString('vi-VN')} đ
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '12px', color: 'var(--color-outline)', fontSize: '0.85rem' }}>
                  Chưa có dịch vụ nào được chọn. Vui lòng chọn ít nhất 1 dịch vụ.
                </div>
              )}

              {/* Warning on Inventory */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  backgroundColor: 'rgba(234, 179, 8, 0.08)',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(234, 179, 8, 0.25)',
                  fontSize: '0.8rem',
                  color: '#ca8a04',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', flexShrink: 0 }}>
                  info
                </span>
                <span>
                  <strong>Phụ tùng dự kiến:</strong> Phụ tùng đi kèm dịch vụ được đưa vào danh sách dự kiến. Tồn kho <strong>chưa bị trừ</strong> cho đến khi kỹ thuật viên xuất phụ tùng để sửa chữa.
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 20px', borderTop: '1px solid var(--color-border)' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Hủy bỏ
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>
                add_task
              </span>
              Tạo Lệnh Sửa Chữa
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
