import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { CreatePartRequest, PartResponse } from '@/types/part.types';
import { inventoryService } from '../services/inventory.service';
import { downloadPartCatalogTemplate } from '../utils/excelTemplate';
import { Button } from '@/components/common/Button';

interface BulkPartModalProps {
  isOpen: boolean;
  existingParts: PartResponse[];
  onClose: () => void;
  onSuccess: (count: number) => void;
}

interface ParsedPartRow {
  index: number;
  data: CreatePartRequest;
  error?: string;
  isValid: boolean;
}

export const BulkPartModal: React.FC<BulkPartModalProps> = ({
  isOpen,
  existingParts,
  onClose,
  onSuccess,
}) => {
  const [rows, setRows] = useState<ParsedPartRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setRows([]);
    setFileName('');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setError('File Excel rỗng hoặc không có dữ liệu hợp lệ');
          setRows([]);
          return;
        }

        const existingCodes = new Set(existingParts.map((p) => p.maPhuTungCode.toUpperCase()));
        const batchCodes = new Set<string>();

        const parsedRows: ParsedPartRow[] = rawJson.map((r, idx) => {
          // Trích xuất các trường với header linh hoạt
          const rawCode = String(
            r['Mã phụ tùng (*)'] || r['Mã phụ tùng'] || r['MaPhuTungCode'] || r['Code'] || r['Mã'] || ''
          ).trim();

          const rawName = String(
            r['Tên phụ tùng (*)'] || r['Tên phụ tùng'] || r['TenPhuTung'] || r['Name'] || r['Tên'] || ''
          ).trim();

          const donViTinh = String(
            r['Đơn vị tính'] || r['ĐVT'] || r['DonViTinh'] || r['Unit'] || 'Cái'
          ).trim();

          const rawGiaNhap = r['Giá nhập (VNĐ)'] ?? r['Giá nhập'] ?? r['GiaNhap'] ?? 0;
          const giaNhap = parseFloat(String(rawGiaNhap).replace(/[^0-9.]/g, '')) || 0;

          const rawGiaBan = r['Giá bán (VNĐ)'] ?? r['Giá bán'] ?? r['GiaBan'] ?? 0;
          const giaBan = parseFloat(String(rawGiaBan).replace(/[^0-9.]/g, '')) || 0;

          const codeUpper = rawCode.toUpperCase();
          let err: string | undefined = undefined;

          if (!rawCode) {
            err = 'Thiếu mã phụ tùng';
          } else if (!rawName) {
            err = 'Thiếu tên phụ tùng';
          } else if (existingCodes.has(codeUpper)) {
            err = `Mã '${codeUpper}' đã có trên hệ thống`;
          } else if (batchCodes.has(codeUpper)) {
            err = `Mã '${codeUpper}' bị trùng trong file`;
          } else if (giaBan < 0 || giaNhap < 0) {
            err = 'Giá không được âm';
          }

          if (rawCode) {
            batchCodes.add(codeUpper);
          }

          return {
            index: idx + 1,
            data: {
              maPhuTungCode: codeUpper,
              tenPhuTung: rawName,
              donViTinh: donViTinh || 'Cái',
              giaNhap,
              giaBan,
            },
            error: err,
            isValid: !err,
          };
        });

        setRows(parsedRows);
      } catch (err: any) {
        console.error('Lỗi khi đọc file Excel:', err);
        setError('Không thể đọc file Excel. Vui lòng kiểm tra định dạng file (.xlsx, .xls, .csv)');
        setRows([]);
      }
    };

    reader.readAsBinaryString(file);
  };

  const validCount = rows.filter((r) => r.isValid).length;
  const errorCount = rows.length - validCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validData = rows.filter((r) => r.isValid).map((r) => r.data);
    if (validData.length === 0) {
      setError('Không có dòng dữ liệu hợp lệ nào để thêm');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await inventoryService.bulkCreateParts({ parts: validData });
      onSuccess(validData.length);
      handleClose();
    } catch (err: any) {
      console.error('Lỗi khi tạo hàng loạt phụ tùng:', err);
      const msg = err.response?.data?.message || err.message || 'Không thể tạo phụ tùng hàng loạt';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="modal-container large"
        style={{ maxWidth: '850px', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title" style={{ margin: 0 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }}>
                upload_file
              </span>
              Thêm phụ tùng bằng Excel
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--color-outline)' }}>
              Tải file Excel hoặc CSV để thêm nhiều phụ tùng vào danh mục
            </p>
          </div>
          <button className="modal-close-btn" onClick={handleClose} type="button" aria-label="Đóng">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {error && (
              <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  error
                </span>
                <span>{error}</span>
              </div>
            )}

            {/* Hướng dẫn & Tải file mẫu */}
            <div
              style={{
                backgroundColor: 'var(--color-surface-container-low)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px 20px',
                border: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-on-surface)' }}>
                  Bước 1: Chuẩn bị file dữ liệu
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '2px' }}>
                  Điền mã, tên, đơn vị tính, giá nhập và giá bán theo file mẫu
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={downloadPartCatalogTemplate}
                style={{ fontSize: '0.825rem' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>
                  download
                </span>
                Tải file mẫu Excel (.xlsx)
              </Button>
            </div>

            {/* Vùng chọn file */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-on-surface)', marginBottom: '8px' }}>
                Bước 2: Tải lên file Excel cần nhập
              </div>
              <div
                style={{
                  border: '2px dashed var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px 20px',
                  textAlign: 'center',
                  backgroundColor: rows.length > 0 ? '#f8fafc' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                  disabled={loading}
                />
                <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--color-primary)' }}>
                  table_view
                </span>
                <div style={{ fontWeight: 600, color: 'var(--color-on-surface)', marginTop: '6px' }}>
                  {fileName ? (
                    <span style={{ color: 'var(--color-primary)' }}>{fileName}</span>
                  ) : (
                    'Bấm vào đây để chọn file Excel (.xlsx, .csv)'
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-outline)', marginTop: '4px' }}>
                  Chấp nhận file .xlsx, .xls hoặc .csv
                </div>
              </div>
            </div>

            {/* Bảng Preview Xem Trước */}
            {rows.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-on-surface)' }}>
                    Bước 3: Xem trước dữ liệu ({rows.length} dòng)
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                      ✓ {validCount} hợp lệ
                    </span>
                    {errorCount > 0 && (
                      <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                        • {errorCount} dòng lỗi (sẽ bỏ qua)
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    maxHeight: '260px',
                    overflowY: 'auto',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <table className="data-table" style={{ width: '100%', fontSize: '0.825rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                        <th>Mã phụ tùng</th>
                        <th>Tên phụ tùng</th>
                        <th>ĐVT</th>
                        <th style={{ textAlign: 'right' }}>Giá nhập</th>
                        <th style={{ textAlign: 'right' }}>Giá bán</th>
                        <th style={{ width: '130px', textAlign: 'center' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr
                          key={r.index}
                          style={{
                            backgroundColor: r.isValid ? undefined : 'rgba(239, 68, 68, 0.05)',
                          }}
                        >
                          <td style={{ textAlign: 'center', color: 'var(--color-outline)' }}>{r.index}</td>
                          <td>
                            <strong style={{ fontFamily: 'monospace' }}>{r.data.maPhuTungCode || '—'}</strong>
                          </td>
                          <td>{r.data.tenPhuTung || '—'}</td>
                          <td>{r.data.donViTinh}</td>
                          <td style={{ textAlign: 'right' }}>{formatCurrency(r.data.giaNhap)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(r.data.giaBan)}</td>
                          <td style={{ textAlign: 'center' }}>
                            {r.isValid ? (
                              <span
                                style={{
                                  fontSize: '0.725rem',
                                  fontWeight: 600,
                                  color: 'var(--color-success)',
                                  backgroundColor: '#ecfdf5',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                }}
                              >
                                ✓ Hợp lệ
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.725rem',
                                  fontWeight: 600,
                                  color: '#dc2626',
                                  backgroundColor: '#fee2e2',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                }}
                                title={r.error}
                              >
                                ⚠ {r.error}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={validCount === 0 || loading}
              isLoading={loading}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>
                check_circle
              </span>
              Xác Nhận Thêm ({validCount} phụ tùng)
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
