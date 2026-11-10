Map<String, dynamic> invoiceJson({int id = 9}) => {
  'maHoaDon': id,
  'maPhieuSuaChua': 4,
  'tenChiNhanh': 'Garage Trung tâm',
  'ngayLap': '2026-09-25T09:30:00',
  'trangThai': 'CHUA_THANH_TOAN',
  'tongTien': 400000,
  'thanhTien': '400000',
  'daThanhToan': 100000,
  'conLai': 300000,
  'services': [
    {
      'tenDichVu': 'Thay dầu',
      'soLuong': 2,
      'donGia': 100000,
      'thanhTien': 200000,
    },
  ],
  'parts': [
    {
      'tenPhuTung': 'Dầu động cơ',
      'donViTinh': 'lít',
      'soLuong': 4,
      'donGia': 50000,
      'thanhTien': 200000,
    },
  ],
  'payments': [
    {
      'maThanhToan': 12,
      'soTien': 100000,
      'phuongThuc': 'TIEN_MAT',
      'maGiaoDich': null,
      'thoiGianThanhToan': '2026-09-25T10:00:00',
      'trangThai': 'THANH_CONG',
    },
    {
      'maThanhToan': 13,
      'soTien': 50000,
      'phuongThuc': 'CHUYEN_KHOAN',
      'maGiaoDich': 'GD-13',
      'thoiGianThanhToan': null,
      'trangThai': 'THAT_BAI',
    },
  ],
};
