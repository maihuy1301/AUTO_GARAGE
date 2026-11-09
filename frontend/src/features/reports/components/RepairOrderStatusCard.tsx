import React from 'react';
import { RepairOrderReportResponseData, ServiceReportResponseData } from '../types/report.types';

interface RepairOrderStatusCardProps {
  repairOrderData: RepairOrderReportResponseData | null;
  serviceData: ServiceReportResponseData[];
  loading: boolean;
}

export const RepairOrderStatusCard: React.FC<RepairOrderStatusCardProps> = ({
  repairOrderData,
  serviceData,
  loading,
}) => {
  const total = repairOrderData?.total || 0;
  const hoanTat = repairOrderData?.hoanTat || 0;
  const dangSua = repairOrderData?.dangSua || 0;
  const choXuLy = (repairOrderData?.choXuLy || 0) + (repairOrderData?.daPhanCong || 0);
  const tamDungHuy = (repairOrderData?.tamDung || 0) + (repairOrderData?.huy || 0);

  const calcPercent = (val: number) => {
    if (!total || total === 0) return 0;
    return Math.round((val / total) * 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const topServices = serviceData.slice(0, 5);
  const maxServiceUses = Math.max(...topServices.map((s) => s.soLanSuDung), 1);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        marginBottom: '24px',
      }}
    >
      {/* 1. Phân bổ Trạng thái Lệnh Sửa Chữa */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            Trạng Thái Lệnh Sửa Chữa
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '2px', marginBottom: '20px' }}>
            Tổng số: <strong style={{ color: 'var(--color-on-surface)' }}>{total}</strong> lệnh quản lý
          </p>

          {/* Segmented Progress Bar */}
          <div
            style={{
              height: '14px',
              borderRadius: '9999px',
              backgroundColor: 'var(--color-surface-gray)',
              overflow: 'hidden',
              display: 'flex',
              marginBottom: '24px',
              border: '1px solid var(--color-border)',
            }}
          >
            {total > 0 ? (
              <>
                <div
                  style={{
                    width: `${calcPercent(hoanTat)}%`,
                    backgroundColor: 'var(--color-success)',
                    transition: 'width 0.3s ease',
                  }}
                  title={`Hoàn tất: ${hoanTat} (${calcPercent(hoanTat)}%)`}
                />
                <div
                  style={{
                    width: `${calcPercent(dangSua)}%`,
                    backgroundColor: 'var(--color-primary)',
                    transition: 'width 0.3s ease',
                  }}
                  title={`Đang sửa chữa: ${dangSua} (${calcPercent(dangSua)}%)`}
                />
                <div
                  style={{
                    width: `${calcPercent(choXuLy)}%`,
                    backgroundColor: 'var(--color-warning)',
                    transition: 'width 0.3s ease',
                  }}
                  title={`Chờ xử lý / phân công: ${choXuLy} (${calcPercent(choXuLy)}%)`}
                />
                <div
                  style={{
                    width: `${calcPercent(tamDungHuy)}%`,
                    backgroundColor: 'var(--color-danger)',
                    transition: 'width 0.3s ease',
                  }}
                  title={`Tạm dừng / Đã hủy: ${tamDungHuy} (${calcPercent(tamDungHuy)}%)`}
                />
              </>
            ) : (
              <div style={{ width: '100%', backgroundColor: '#e2e8f0' }} />
            )}
          </div>

          {/* Status Breakdown Legend List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface)' }}>Đã hoàn tất sửa chữa</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{hoanTat}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)', width: '38px', textAlign: 'right' }}>
                  {calcPercent(hoanTat)}%
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface)' }}>Đang sửa chữa</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{dangSua}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)', width: '38px', textAlign: 'right' }}>
                  {calcPercent(dangSua)}%
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-warning)' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface)' }}>Chờ xử lý / phân công</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{choXuLy}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)', width: '38px', textAlign: 'right' }}>
                  {calcPercent(choXuLy)}%
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-danger)' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface)' }}>Tạm dừng / Đã hủy</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{tamDungHuy}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)', width: '38px', textAlign: 'right' }}>
                  {calcPercent(tamDungHuy)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Dịch Vụ Được Đặt Nhiều Nhất */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              Dịch vụ được sử dụng nhiều
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '2px' }}>
              Sắp xếp theo số lần sử dụng trong kỳ
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-outline)', fontSize: '0.85rem' }}>
            Đang tải danh sách dịch vụ...
          </div>
        ) : topServices.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--color-outline)',
              fontSize: '0.85rem',
              backgroundColor: 'var(--color-surface-gray)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--color-border)',
            }}
          >
            Chưa có số liệu dịch vụ trong kỳ này
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {topServices.map((svc, idx) => {
              const barWidth = Math.max(Math.round((svc.soLanSuDung / maxServiceUses) * 100), 8);
              return (
                <div key={svc.maDichVu || idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: idx === 0 ? 'var(--color-secondary-container)' : 'var(--color-surface-container)',
                          color: idx === 0 ? '#ffffff' : 'var(--color-primary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                        {svc.tenDichVu}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {svc.soLanSuDung} lượt
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)', marginLeft: '6px' }}>
                        ({formatCurrency(svc.doanhThu)})
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div
                    style={{
                      height: '8px',
                      borderRadius: '9999px',
                      backgroundColor: 'var(--color-surface-gray)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${barWidth}%`,
                        backgroundColor: idx === 0 ? 'var(--color-primary)' : 'var(--color-primary-container)',
                        borderRadius: '9999px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
