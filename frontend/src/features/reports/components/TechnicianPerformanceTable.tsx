import React from 'react';
import { TechnicianReportResponseData } from '../types/report.types';

interface TechnicianPerformanceTableProps {
  technicians: TechnicianReportResponseData[];
  loading: boolean;
  selectedBranchName?: string;
}

export const TechnicianPerformanceTable: React.FC<TechnicianPerformanceTableProps> = ({
  technicians,
  loading,
  selectedBranchName,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '24px',
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            Hiệu Suất Kỹ Thuật Viên
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '2px' }}>
            Số công việc được giao, đang làm và đã hoàn tất của từng kỹ thuật viên
          </p>
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '4px 10px',
            backgroundColor: 'var(--color-surface-container)',
            color: 'var(--color-primary)',
            borderRadius: '9999px',
          }}
        >
          {technicians.length} kỹ thuật viên
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '50px', textAlign: 'center' }}>#</th>
              <th>Kỹ thuật viên</th>
              <th>Chi nhánh</th>
              <th style={{ textAlign: 'center' }}>Được giao</th>
              <th style={{ textAlign: 'center' }}>Đang làm</th>
              <th style={{ textAlign: 'center' }}>Hoàn thành</th>
              <th style={{ width: '160px', textAlign: 'center' }}>Tỷ lệ hoàn tất</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--color-outline)' }}>
                  Đang tải danh sách kỹ thuật viên...
                </td>
              </tr>
            ) : technicians.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-outline)' }}>
                  Chưa có dữ liệu phân công kỹ thuật viên trong kỳ này
                </td>
              </tr>
            ) : (
              technicians.map((t, idx) => {
                const techId = t.maNhanVien ?? t.technicianId ?? idx + 1;
                const techName = t.hoTen || t.technicianName || `KTV #${techId}`;
                const branch = t.tenChiNhanh || t.branchName || selectedBranchName || '—';
                const totalAssigned = t.soPhieuPhanCong ?? t.totalAssigned ?? 0;
                const inProgress = t.soPhieuDangSua ?? t.inProgress ?? 0;
                const completed = t.soPhieuHoanTat ?? t.completed ?? 0;
                const completionRate =
                  totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
                const avatarChar = techName.trim().charAt(0).toUpperCase() || 'T';

                return (
                  <tr key={techId}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--color-outline)' }}>
                      {idx + 1}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="data-table-avatar">
                          {avatarChar}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>
                          {techName}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.825rem', color: 'var(--color-on-surface-variant)' }}>
                        {branch}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{totalAssigned}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--color-primary)' }}>
                      {inProgress}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-success)' }}>
                      {completed}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            flex: 1,
                            height: '6px',
                            backgroundColor: 'var(--color-surface-gray)',
                            borderRadius: '9999px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${completionRate}%`,
                              backgroundColor: completionRate >= 80 ? 'var(--color-success)' : 'var(--color-primary)',
                              borderRadius: '9999px',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, width: '32px' }}>
                          {completionRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
