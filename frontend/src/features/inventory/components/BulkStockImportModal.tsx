import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { PartResponse, BulkStockImportItem } from '@/types/part.types';
import { BranchResponse } from '@/types/branch.types';
import { inventoryService } from '../services/inventory.service';
import { downloadStockImportTemplate } from '../utils/excelTemplate';
import { Button } from '@/components/common/Button';

interface BulkStockImportModalProps {
  isOpen: boolean;
  availableParts: PartResponse[];
  branches: BranchResponse[];
  isAdmin: boolean;
  userBranchId?: number;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

interface ParsedStockRow {
  index: number;
  item: BulkStockImportItem;
  partName?: string;
  unit?: string;
  error?: string;
  isValid: boolean;
}

export const BulkStockImportModal: React.FC<BulkStockImportModalProps> = ({
  isOpen,
  availableParts,
  branches,
  isAdmin,
  userBranchId,
  onClose,
  onSuccess,
}) => {
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined);
  const [generalNote, setGeneralNote] = useState<string>('');
  const [rows, setRows] = useState<ParsedStockRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [skippedZeroCount, setSkippedZeroCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (!isAdmin && userBranchId) {
        setSelectedBranchId(userBranchId);
      } else if (branches.length > 0) {
        setSelectedBranchId(branches[0].maChiNhanh);
      }
      setGeneralNote('');
      setRows([]);
      setFileName('');
      setError(null);
      setSkippedZeroCount(0);
    }
  }, [isOpen, isAdmin, userBranchId, branches]);

  if (!isOpen) return null;

  const handleClose = () => {
    setRows([]);
    setFileName('');
    setError(null);
    setSkippedZeroCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setSkippedZeroCount(0);

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

        // Tạo map mã phụ tùng hiện có (viết hoa)
        const partMap = new Map<string, PartResponse>();
        availableParts.forEach((p) => {
          partMap.set(p.maPhuTungCode.trim().toUpperCase(), p);
        });

        let skippedZero = 0;
        const parsedRows: ParsedStockRow[] = [];

        rawJson.forEach((r) => {
          const rawCode = String(
            r['Mã phụ tùng (*)'] || r['Mã phụ tùng'] || r['MaPhuTungCode'] || r['Code'] || r['Mã'] || ''
          ).trim();

          const rawQty = r['Số lượng nhập (*)'] ?? r['Số lượng nhập'] ?? r['Số lượng'] ?? r['SoLuong'] ?? r['Quantity'] ?? 0;
          const qty = parseInt(String(rawQty).replace(/[^0-9]/g, ''), 10) || 0;

          // Nếu số lượng <= 0: tự động bỏ qua không coi là lỗi
          if (qty <= 0) {
            if (rawCode) {
              skippedZero++;
            }
            return;
          }

          const ghiChu = String(r['Ghi chú'] || r['GhiChu'] || r['Note'] || '').trim();
          const codeUpper = rawCode.toUpperCase();
          const matchedPart = partMap.get(codeUpper);

          let err: string | undefined = undefined;

          if (!rawCode) {
            err = 'Thiếu mã phụ tùng';
          } else if (!matchedPart) {
            err = `Mã '${codeUpper}' không tồn tại trong danh mục`;
          } else if (!matchedPart.trangThai) {
            err = `Phụ tùng '${matchedPart.tenPhuTung}' đang tạm ngưng`;
          }

          parsedRows.push({
            index: parsedRows.length + 1,
            item: {
              maPhuTung: matchedPart?.maPhuTung,
              maPhuTungCode: codeUpper,
              soLuong: qty,
              ghiChu: ghiChu || undefined,
            },
            partName: matchedPart?.tenPhuTung,
            unit: matchedPart?.donViTinh || '—',
            error: err,
            isValid: !err,
          });
        });

        setSkippedZeroCount(skippedZero);

        if (parsedRows.length === 0) {
          if (skippedZero > 0) {
            setError(`Tất cả ${skippedZero} phụ tùng trong file đều có số lượng 0. Hãy điền số lượng lớn hơn 0 cho phụ tùng cần nhập.`);
          } else {
            setError('File Excel rỗng hoặc không có dữ liệu hợp lệ');
          }
          setRows([]);
          return;
        }

        setRows(parsedRows);
      } catch (err: any) {
        console.error('Lỗi khi đọc file Excel:', err);
        setError('Không thể đọc file Excel. Vui lòng kiểm tra định dạng file (.xlsx, .xls, .csv)');
        setRows([]);
      }
    };

    reader.readAsBinaryString(file);
  };

  const validRows = rows.filter((r) => r.isValid);
  const validCount = validRows.length;
  const totalQuantity = validRows.reduce((sum, r) => sum + r.item.soLuong, 0);
  const errorCount = rows.length - validCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) {
      setError('Vui lòng chọn chi nhánh cần nhập kho');
      return;
    }

    const itemsToImport = validRows.map((r) => r.item);
    if (itemsToImport.length === 0) {
      setError('Không có mặt hàng hợp lệ nào để nhập kho');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await inventoryService.bulkImportStock({
        branchId: selectedBranchId,
        ghiChuChung: generalNote.trim() || undefined,
        items: itemsToImport,
      });

      onSuccess(itemsToImport.length);
      handleClose();
    } catch (err: any) {
      console.error('Lỗi khi nhập kho hàng loạt:', err);
      const msg = err.response?.data?.message || err.message || 'Không thể thực hiện nhập kho hàng loạt';
      setError(msg);
    } finally {
      setLoading(false);
    }
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
                inventory_2
              </span>
              Nhập Kho Phụ Tùng Hàng Loạt
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--color-outline)' }}>
              Tải file Excel hoặc CSV để nhập nhiều phụ tùng cho chi nhánh
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

            {/* Chi nhánh & Ghi chú chung */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isAdmin ? 'repeat(2, 1fr)' : '1fr',
                gap: '16px',
              }}
            >
              {isAdmin && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Chi nhánh nhập kho <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <select
                    className="form-input"
                    value={selectedBranchId || ''}
                    onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                    disabled={loading}
                    required
                  >
                    {branches.map((b) => (
                      <option key={b.maChiNhanh} value={b.maChiNhanh}>
                        {b.tenChiNhanh} ({b.maChiNhanh})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Ghi chú chung cho đợt nhập kho</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: Nhập lô hàng phụ tùng Bosch tháng 10/2026..."
                  value={generalNote}
                  onChange={(e) => setGeneralNote(e.target.value)}
                  disabled={loading}
                  maxLength={500}
                />
              </div>
            </div>

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
                  Bước 1: Tải file mẫu nhập kho
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-outline)', marginTop: '2px' }}>
                  File mẫu có sẵn danh sách phụ tùng với số lượng 0. Điền số lượng lớn hơn 0 cho những phụ tùng cần nhập.
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => downloadStockImportTemplate(availableParts)}
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
                Bước 2: Tải lên file Excel đợt nhập kho
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
                <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#059669' }}>
                  upload_file
                </span>
                <div style={{ fontWeight: 600, color: 'var(--color-on-surface)', marginTop: '6px' }}>
                  {fileName ? (
                    <span style={{ color: '#059669' }}>{fileName}</span>
                  ) : (
                    'Bấm vào đây để chọn file Excel (.xlsx, .csv)'
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-outline)', marginTop: '4px' }}>
                  Kiểm tra mã phụ tùng và số lượng trong bảng xem trước rồi xác nhận nhập kho
                </div>
              </div>
            </div>

            {/* Bảng Preview Xem Trước */}
            {rows.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-on-surface)' }}>
                    Bước 3: Xem trước đợt nhập ({rows.length} mặt hàng sẽ nhập)
                  </div>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                      ✓ {validCount} hợp lệ ({totalQuantity} đơn vị)
                    </span>
                    {skippedZeroCount > 0 && (
                      <span style={{ color: 'var(--color-outline)', backgroundColor: 'var(--color-surface-container, #f1f5f9)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                        Đã bỏ qua {skippedZeroCount} món có SL = 0
                      </span>
                    )}
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
                        <th style={{ textAlign: 'center' }}>ĐVT</th>
                        <th style={{ textAlign: 'center', width: '110px' }}>Số lượng nhập</th>
                        <th>Ghi chú</th>
                        <th style={{ width: '140px', textAlign: 'center' }}>Trạng thái</th>
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
                            <strong style={{ fontFamily: 'monospace' }}>{r.item.maPhuTungCode || '—'}</strong>
                          </td>
                          <td>{r.partName || <span style={{ color: 'var(--color-outline)' }}>Chưa khớp</span>}</td>
                          <td style={{ textAlign: 'center' }}>{r.unit}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-primary)' }}>
                            +{r.item.soLuong}
                          </td>
                          <td style={{ color: 'var(--color-outline)', fontSize: '0.75rem' }}>
                            {r.item.ghiChu || '—'}
                          </td>
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
              style={{ backgroundColor: '#059669', borderColor: '#059669' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '6px' }}>
                check_circle
              </span>
              Xác Nhận Nhập Kho ({validCount} mặt hàng — {totalQuantity} cái)
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
