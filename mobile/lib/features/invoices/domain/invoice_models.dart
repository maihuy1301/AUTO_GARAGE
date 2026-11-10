class CustomerInvoice {
  CustomerInvoice.fromJson(Map<String, dynamic> json)
    : id = (json['maHoaDon'] as num).toInt(),
      repairOrderId = (json['maPhieuSuaChua'] as num).toInt(),
      branchName = json['tenChiNhanh'] as String? ?? 'Garage',
      createdAt = DateTime.tryParse(json['ngayLap'] as String? ?? ''),
      status = json['trangThai'] as String,
      subtotal = _money(json['tongTien']),
      total = _money(json['thanhTien']),
      paid = _money(json['daThanhToan']),
      remaining = _money(json['conLai']),
      services = _items(
        json['services'],
        (item) => InvoiceItem.fromJson(item, false),
      ),
      parts = _items(json['parts'], (item) => InvoiceItem.fromJson(item, true)),
      payments = _items(json['payments'], InvoicePayment.fromJson);

  final int id, repairOrderId;
  final String branchName, status;
  final DateTime? createdAt;
  final double subtotal, total, paid, remaining;
  final List<InvoiceItem> services, parts;
  final List<InvoicePayment> payments;
}

class InvoiceItem {
  InvoiceItem.fromJson(Map<String, dynamic> json, bool isPart)
    : name =
          json[isPart ? 'tenPhuTung' : 'tenDichVu'] as String? ??
          (isPart ? 'Phụ tùng' : 'Dịch vụ'),
      unit = json['donViTinh'] as String? ?? '',
      quantity = (json['soLuong'] as num).toInt(),
      price = _money(json['donGia']),
      total = _money(json['thanhTien']);

  final String name, unit;
  final int quantity;
  final double price, total;
}

class InvoicePayment {
  InvoicePayment.fromJson(Map<String, dynamic> json)
    : id = (json['maThanhToan'] as num).toInt(),
      amount = _money(json['soTien']),
      method = json['phuongThuc'] as String? ?? '',
      reference = json['maGiaoDich'] as String?,
      paidAt = DateTime.tryParse(json['thoiGianThanhToan'] as String? ?? ''),
      status = json['trangThai'] as String;

  final int id;
  final double amount;
  final String method, status;
  final String? reference;
  final DateTime? paidAt;
}

double _money(Object? value) {
  final amount = value is num
      ? value.toDouble()
      : double.parse(value as String);
  if (!amount.isFinite) throw const FormatException('Invalid amount');
  return amount;
}

List<T> _items<T>(Object? value, T Function(Map<String, dynamic>) parse) =>
    (value as List? ?? [])
        .map((item) => parse(item as Map<String, dynamic>))
        .toList(growable: false);
