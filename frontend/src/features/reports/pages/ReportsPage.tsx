import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { branchService } from '@/features/branches/services/branch.service';
import { reportService } from '../services/report.service';
import {
  DashboardResponseData,
  RevenueReportResponseData,
  AppointmentReportResponseData,
  RepairOrderReportResponseData,
  BranchReportResponseData,
  TechnicianReportResponseData,
  InventoryReportResponseData,
  ServiceReportResponseData,
  ReportFilterParams,
} from '../types/report.types';
import { BranchResponse } from '@/types/branch.types';
import { ReportFilterBar } from '../components/ReportFilterBar';
import { ReportKpiCards } from '../components/ReportKpiCards';
import { RevenueChartCard } from '../components/RevenueChartCard';
import { RepairOrderStatusCard } from '../components/RepairOrderStatusCard';
import { TechnicianPerformanceTable } from '../components/TechnicianPerformanceTable';
import { InventoryAlertTable } from '../components/InventoryAlertTable';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.roles?.includes('ROLE_ADMIN'));

  // Branches
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [selectedBranchCode, setSelectedBranchCode] = useState<string>('');

  // Date filters
  const [datePreset, setDatePreset] = useState<'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'>('month');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Report Data
  const [dashboardData, setDashboardData] = useState<DashboardResponseData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueReportResponseData | null>(null);
  const [appointmentData, setAppointmentData] = useState<AppointmentReportResponseData | null>(null);
  const [repairOrderData, setRepairOrderData] = useState<RepairOrderReportResponseData | null>(null);
  const [branchData, setBranchData] = useState<BranchReportResponseData[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianReportResponseData[]>([]);
  const [inventory, setInventory] = useState<InventoryReportResponseData[]>([]);
  const [services, setServices] = useState<ServiceReportResponseData[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'technicians' | 'inventory'>('technicians');

  // Compute dates based on preset
  const applyDatePreset = useCallback((preset: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const toStr = formatYMD(now);
    let fromStr = toStr;

    if (preset === 'today') {
      fromStr = toStr;
    } else if (preset === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(now.setDate(diff));
      fromStr = formatYMD(monday);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      fromStr = formatYMD(firstDay);
    } else if (preset === 'quarter') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const firstDayQ = new Date(now.getFullYear(), quarterMonth, 1);
      fromStr = formatYMD(firstDayQ);
    } else if (preset === 'year') {
      const firstDayY = new Date(now.getFullYear(), 0, 1);
      fromStr = formatYMD(firstDayY);
    } else {
      // custom: keep current
      return;
    }

    setFromDate(fromStr);
    setToDate(toStr);
  }, []);

  // Initialize
  useEffect(() => {
    applyDatePreset('month');

    // Load branches
    branchService
      .getAll()
      .then((res) => {
        setBranches(res);
      })
      .catch((err) => console.error('Lỗi khi tải danh sách chi nhánh:', err));

    // If Manager: force branch
    if (!isAdmin && user?.maChiNhanh) {
      setSelectedBranchCode(String(user.maChiNhanh));
    }
  }, [applyDatePreset, isAdmin, user?.maChiNhanh]);

  // Fetch all reports
  const fetchReports = useCallback(async () => {
    if (!fromDate || !toDate) return;

    try {
      setLoading(true);

      const params: ReportFilterParams = {
        from: fromDate,
        to: toDate,
        branchCode: selectedBranchCode || undefined,
      };

      const [
        dashRes,
        revRes,
        apptRes,
        roRes,
        techRes,
        invRes,
        branchRes,
        svcRes,
      ] = await Promise.all([
        reportService.getDashboard(params).catch(() => null),
        reportService.getRevenue(params).catch(() => null),
        reportService.getAppointments(params).catch(() => null),
        reportService.getRepairOrders(params).catch(() => null),
        reportService.getTechnicians(params).catch(() => []),
        reportService.getInventory(params).catch(() => []),
        isAdmin ? reportService.getBranches(params).catch(() => []) : Promise.resolve([]),
        reportService.getServices(params).catch(() => []),
      ]);

      setDashboardData(dashRes);
      setRevenueData(revRes);
      setAppointmentData(apptRes);
      setRepairOrderData(roRes);
      setTechnicians(techRes || []);
      setInventory(invRes || []);
      setBranchData(branchRes || []);
      setServices(svcRes || []);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu báo cáo:', err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, selectedBranchCode, isAdmin]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const currentBranchName =
    branches.find((b) => String(b.maChiNhanh) === selectedBranchCode)?.tenChiNhanh ||
    (isAdmin ? (selectedBranchCode ? `Chi nhánh #${selectedBranchCode}` : 'Tất cả chi nhánh') : user?.tenChiNhanh || 'Chi nhánh hiện tại');

  // Export to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    const branchName = currentBranchName;

    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += `BÁO CÁO THỐNG KÊ HOẠT ĐỘNG GARAGE\n`;
    csvContent += `Thời gian:,${fromDate} đến ${toDate}\n`;
    csvContent += `Phạm vi:,${branchName}\n`;
    csvContent += `Ngày xuất:,${new Date().toLocaleString('vi-VN')}\n\n`;

    // 1. Chỉ số tổng hợp
    csvContent += `--- CHỈ SỐ TỔNG QUAN ---\n`;
    csvContent += `Tổng Doanh Thu (VNĐ):,${revenueData?.totalRevenue ?? dashboardData?.totalRevenue ?? 0}\n`;
    csvContent += `Đã Thu (VNĐ):,${revenueData?.totalPaid ?? 0}\n`;
    csvContent += `  - Thu Tiền mặt (VNĐ):,${revenueData?.paidByCash ?? 0}\n`;
    csvContent += `  - Thu Chuyển khoản (VNĐ):,${revenueData?.paidByTransfer ?? 0}\n`;
    csvContent += `Còn Nợ (VNĐ):,${revenueData?.totalUnpaid ?? 0}\n`;
    csvContent += `Tổng Lệnh Sửa Chữa:,${repairOrderData?.total ?? dashboardData?.totalRepairOrders ?? 0}\n`;
    csvContent += `Lệnh Hoàn Tất:,${repairOrderData?.hoanTat ?? dashboardData?.repairOrdersCompleted ?? 0}\n`;
    csvContent += `Lệnh Đang Sửa:,${repairOrderData?.dangSua ?? dashboardData?.repairOrdersInProgress ?? 0}\n`;
    csvContent += `Tổng Lịch Hẹn:,${appointmentData?.total ?? dashboardData?.totalAppointments ?? 0}\n\n`;

    // 2. Kỹ thuật viên
    if (technicians.length > 0) {
      csvContent += `--- HIỆU SUẤT KỸ THUẬT VIÊN ---\n`;
      csvContent += `Mã KTV,Tên Kỹ Thuật Viên,Chi Nhánh,Được Giao,Đang Làm,Hoàn Thành\n`;
      technicians.forEach((t) => {
        const id = t.maNhanVien ?? t.technicianId ?? '';
        const name = t.hoTen || t.technicianName || `KTV #${id}`;
        const branch = t.tenChiNhanh || t.branchName || branchName;
        const assigned = t.soPhieuPhanCong ?? t.totalAssigned ?? 0;
        const doing = t.soPhieuDangSua ?? t.inProgress ?? 0;
        const done = t.soPhieuHoanTat ?? t.completed ?? 0;
        csvContent += `"${id}","${name}","${branch}",${assigned},${doing},${done}\n`;
      });
      csvContent += `\n`;
    }

    // 3. Tồn kho
    if (inventory.length > 0) {
      csvContent += `--- TỒN KHO PHỤ TÙNG ---\n`;
      csvContent += `Mã Phụ Tùng,Tên Phụ Tùng,Chi Nhánh,Tồn Kho,Tối Thiểu,Cảnh Báo\n`;
      inventory.forEach((i) => {
        const code = i.maPhuTungCode || i.partCode || (i.maPhuTung ? `PT${i.maPhuTung}` : '');
        const name = i.tenPhuTung || i.partName || `Phụ tùng #${code}`;
        const branch = i.tenChiNhanh || i.branchName || branchName;
        const stock = i.soLuongTon ?? i.stockQuantity ?? 0;
        const min = i.soLuongToiThieu ?? i.minQuantity ?? 0;
        const isLow = (i.sapHetHang ?? i.warningLowStock ?? false) || (stock <= min);
        const warn = isLow ? 'Cảnh báo hết' : 'Đủ hàng';
        csvContent += `"${code}","${name}","${branch}",${stock},${min},"${warn}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BaoCao_Garage_${fromDate}_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--color-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          Báo Cáo & Thống Kê Chi Tiết
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-outline)', marginTop: '4px' }}>
          Xem doanh thu, tình hình sửa chữa, công việc kỹ thuật viên và tồn kho theo kỳ
        </p>
      </div>

      {/* Filter Bar */}
      <ReportFilterBar
        datePreset={datePreset}
        onDatePresetChange={applyDatePreset}
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        selectedBranchCode={selectedBranchCode}
        onBranchChange={setSelectedBranchCode}
        branches={branches}
        isAdmin={isAdmin}
        userBranchName={user?.tenChiNhanh || undefined}
        onRefresh={fetchReports}
        onExport={handleExportCSV}
        loading={loading}
      />

      {/* 4 Key Metrics Bento Cards */}
      <ReportKpiCards
        dashboardData={dashboardData}
        revenueData={revenueData}
        appointmentData={appointmentData}
        repairOrderData={repairOrderData}
        inventoryData={inventory}
        loading={loading}
      />

      {/* Revenue Chart Card */}
      <RevenueChartCard
        revenueData={revenueData}
        branchData={branchData}
        isAdmin={isAdmin}
        loading={loading}
      />

      {/* Repair Order Status & Top Services Breakdown */}
      <RepairOrderStatusCard
        repairOrderData={repairOrderData}
        serviceData={services}
        loading={loading}
      />

      {/* Tabs Selection for Detailed Tables */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '8px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('technicians')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'technicians' ? 700 : 500,
            color: activeTab === 'technicians' ? 'var(--color-primary)' : 'var(--color-outline)',
            backgroundColor: activeTab === 'technicians' ? 'var(--color-surface-container)' : 'transparent',
            transition: 'all 0.15s ease',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            engineering
          </span>
          <span>Năng suất Kỹ thuật viên ({technicians.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'inventory' ? 700 : 500,
            color: activeTab === 'inventory' ? 'var(--color-primary)' : 'var(--color-outline)',
            backgroundColor: activeTab === 'inventory' ? 'var(--color-surface-container)' : 'transparent',
            transition: 'all 0.15s ease',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            inventory_2
          </span>
          <span>Cảnh báo Kho & Phụ tùng ({inventory.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'technicians' ? (
        <TechnicianPerformanceTable
          technicians={technicians}
          loading={loading}
          selectedBranchName={currentBranchName}
        />
      ) : (
        <InventoryAlertTable
          inventory={inventory}
          loading={loading}
          selectedBranchName={currentBranchName}
        />
      )}
    </div>
  );
};
