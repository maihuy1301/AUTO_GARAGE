import React from 'react';
import { BranchResponse } from '@/types/branch.types';

interface ReportFilterBarProps {
  datePreset: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  onDatePresetChange: (preset: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom') => void;
  fromDate: string;
  toDate: string;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  selectedBranchCode: string;
  onBranchChange: (branchCode: string) => void;
  branches: BranchResponse[];
  isAdmin: boolean;
  userBranchName?: string;
  onRefresh: () => void;
  onExport: () => void;
  loading: boolean;
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  datePreset,
  onDatePresetChange,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  selectedBranchCode,
  onBranchChange,
  branches,
  isAdmin,
  userBranchName,
  onRefresh,
  onExport,
  loading,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}
    >
      {/* Left: Quick Date Presets & Custom Pickers */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            display: 'inline-flex',
            backgroundColor: 'var(--color-surface-gray)',
            padding: '3px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
          }}
        >
          {[
            { id: 'today', label: 'Hôm nay' },
            { id: 'week', label: 'Tuần này' },
            { id: 'month', label: 'Tháng này' },
            { id: 'quarter', label: 'Quý này' },
            { id: 'year', label: 'Năm nay' },
            { id: 'custom', label: 'Tùy chọn' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onDatePresetChange(preset.id as any)}
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: datePreset === preset.id ? 600 : 500,
                borderRadius: 'var(--radius-sm)',
                color: datePreset === preset.id ? 'var(--color-primary)' : 'var(--color-outline)',
                backgroundColor: datePreset === preset.id ? '#ffffff' : 'transparent',
                boxShadow: datePreset === preset.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Date pickers (shown always or editable when custom) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)' }}>Từ:</span>
            <input
              type="date"
              className="form-input"
              value={fromDate}
              onChange={(e) => {
                onDatePresetChange('custom');
                onFromDateChange(e.target.value);
              }}
              style={{
                padding: '6px 10px',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: datePreset === 'custom' ? '#ffffff' : 'var(--color-surface-gray)',
              }}
            />
          </div>
          <span style={{ color: 'var(--color-outline)', fontSize: '0.8rem' }}>→</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)' }}>Đến:</span>
            <input
              type="date"
              className="form-input"
              value={toDate}
              onChange={(e) => {
                onDatePresetChange('custom');
                onToDateChange(e.target.value);
              }}
              style={{
                padding: '6px 10px',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: datePreset === 'custom' ? '#ffffff' : 'var(--color-surface-gray)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Right: Branch Selector & Action Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
        {/* Branch Filter */}
        {isAdmin ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-primary)' }}>
              storefront
            </span>
            <select
              className="form-input"
              value={selectedBranchCode}
              onChange={(e) => onBranchChange(e.target.value)}
              disabled={loading}
              style={{
                padding: '7px 12px',
                fontSize: '0.825rem',
                fontWeight: 600,
                color: 'var(--color-primary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: '#ffffff',
                minWidth: '200px',
              }}
            >
              <option value="">Tất cả chi nhánh</option>
              {branches.map((b) => (
                <option key={b.maChiNhanh} value={String(b.maChiNhanh)}>
                  {b.tenChiNhanh}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: 'var(--color-surface-container)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.825rem',
              fontWeight: 600,
              color: 'var(--color-primary)',
              border: '1px solid rgba(0, 35, 111, 0.15)',
            }}
            title="Dữ liệu được giới hạn cho chi nhánh của bạn"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              lock
            </span>
            <span>{userBranchName || 'Chi nhánh của bạn'}</span>
          </div>
        )}

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            backgroundColor: '#ffffff',
            color: 'var(--color-on-surface)',
            fontSize: '0.825rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          title="Tải lại dữ liệu"
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '18px',
              animation: loading ? 'spin 1s linear infinite' : 'none',
            }}
          >
            refresh
          </span>
          <span>Làm mới</span>
        </button>

        {/* Export CSV Button */}
        <button
          type="button"
          onClick={onExport}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
            fontSize: '0.825rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            transition: 'background-color 0.15s ease',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            download
          </span>
          <span>Xuất báo cáo</span>
        </button>
      </div>
    </div>
  );
};
