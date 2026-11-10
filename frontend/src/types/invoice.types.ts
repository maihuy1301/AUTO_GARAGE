export interface InvoiceServiceItem {
  maChiTiet: number;
  maPhieuDichVu?: number;
  maDichVu?: number;
  tenDichVu?: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
}

export interface InvoicePartItem {
  maChiTiet: number;
  maPhieuPhuTung?: number;
  maDichVuChiTiet?: number;
  maPhuTung?: number;
  maPhuTungCode?: string;
  tenPhuTung?: string;
  donViTinh?: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
}

export interface PaymentItem {
  maThanhToan: number;
  maHoaDon: number;
  soTien: number;
  phuongThuc: string;
  maGiaoDich?: string;
  thoiGianThanhToan?: string;
  trangThai: string;
}

export interface InvoiceResponse {
  maHoaDon: number;
  maPhieuSuaChua?: number;
  maKhachHang?: number;
  tenKhachHang?: string;
  soDienThoaiKhachHang?: string;
  bienSoXe?: string;
  tenHangXe?: string;
  tenModel?: string;
  maChiNhanh?: number;
  tenChiNhanh?: string;
  maNhanVienThuNgan?: number;
  tenThuNgan?: string;
  tongTien: number;
  thanhTien: number;
  daThanhToan: number;
  conLai: number;
  trangThai: InvoiceStatus;
  ngayLap: string;
  services: InvoiceServiceItem[];
  parts: InvoicePartItem[];
  payments: PaymentItem[];
}

export type InvoiceStatus = 'CHUA_THANH_TOAN' | 'THANH_TOAN_MOT_PHAN' | 'DA_THANH_TOAN' | 'HUY';

export const InvoiceStatusLabels: Record<InvoiceStatus | string, string> = {
  CHUA_THANH_TOAN: 'Chưa thanh toán',
  THANH_TOAN_MOT_PHAN: 'Thanh toán một phần',
  DA_THANH_TOAN: 'Đã thanh toán',
  HUY: 'Đã hủy',
};

export const InvoiceStatusTone: Record<
  InvoiceStatus | string,
  'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
> = {
  CHUA_THANH_TOAN: 'warning',
  THANH_TOAN_MOT_PHAN: 'info',
  DA_THANH_TOAN: 'success',
  HUY: 'danger',
};

export interface CreateInvoiceRequest {
  ghiChu?: string;
}

export interface CreatePaymentRequest {
  soTien: number;
  phuongThuc: string; // 'TIEN_MAT' | 'CHUYEN_KHOAN'
  maGiaoDich?: string;
}

export interface PaymentResponse {
  maThanhToan: number;
  maHoaDon: number;
  soTien: number;
  phuongThuc: string;
  maGiaoDich?: string;
  thoiGianThanhToan?: string;
  trangThai: string;
}
