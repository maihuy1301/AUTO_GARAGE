class CustomerVehicle {
  const CustomerVehicle({
    required this.id,
    required this.licensePlate,
    this.brandId,
    this.brand = '',
    this.modelId,
    this.model = '',
    this.year,
    this.color = '',
    this.vin = '',
    this.odometer,
    this.isActive = true,
  });

  factory CustomerVehicle.fromJson(Map<String, dynamic> json) {
    return CustomerVehicle(
      id: (json['maXe'] as num).toInt(),
      licensePlate: json['bienSo']?.toString() ?? '',
      brandId: (json['maHangXe'] as num?)?.toInt(),
      brand: json['tenHangXe']?.toString() ?? json['hangXe']?.toString() ?? '',
      modelId: (json['maModel'] as num?)?.toInt(),
      model: json['tenModel']?.toString() ?? json['model']?.toString() ?? '',
      year: (json['namSanXuat'] as num?)?.toInt(),
      color: json['mauXe']?.toString() ?? '',
      vin: json['soVIN']?.toString() ?? '',
      odometer: (json['soKmHienTai'] as num?)?.toInt(),
      isActive: json['trangThai'] != false,
    );
  }

  final int id;
  final String licensePlate;
  final int? brandId;
  final String brand;
  final int? modelId;
  final String model;
  final int? year;
  final String color;
  final String vin;
  final int? odometer;
  final bool isActive;

  String get description =>
      [brand, model].where((value) => value.trim().isNotEmpty).join(' ');
}

class VehicleBrand {
  const VehicleBrand({required this.id, required this.name});

  factory VehicleBrand.fromJson(Map<String, dynamic> json) {
    return VehicleBrand(
      id: (json['maHangXe'] as num).toInt(),
      name: json['tenHangXe']?.toString() ?? '',
    );
  }

  final int id;
  final String name;
}

class VehicleModel {
  const VehicleModel({
    required this.id,
    required this.brandId,
    required this.name,
    this.brandName = '',
  });

  factory VehicleModel.fromJson(Map<String, dynamic> json) {
    return VehicleModel(
      id: (json['maModel'] as num).toInt(),
      brandId: (json['maHangXe'] as num).toInt(),
      brandName: json['tenHangXe']?.toString() ?? '',
      name: json['tenModel']?.toString() ?? '',
    );
  }

  final int id;
  final int brandId;
  final String brandName;
  final String name;
}

class UpdateCustomerVehicle {
  const UpdateCustomerVehicle({
    required this.brandId,
    required this.modelId,
    this.year,
    this.color = '',
    this.vin = '',
    this.odometer,
  });

  final int brandId;
  final int modelId;
  final int? year;
  final String color;
  final String vin;
  final int? odometer;

  Map<String, dynamic> toJson() => {
    'maHangXe': brandId,
    'maModel': modelId,
    'namSanXuat': year,
    'mauXe': color.trim(),
    'soVIN': vin.trim().toUpperCase(),
    'soKmHienTai': odometer,
  };
}

class CreateCustomerVehicle {
  const CreateCustomerVehicle({
    required this.licensePlate,
    required this.brandId,
    required this.modelId,
    this.year,
    this.color,
    this.vin,
    this.odometer,
  });

  final String licensePlate;
  final int brandId;
  final int modelId;
  final int? year;
  final String? color;
  final String? vin;
  final int? odometer;

  Map<String, dynamic> toJson() => {
    'bienSo': licensePlate.trim().toUpperCase(),
    'maHangXe': brandId,
    'maModel': modelId,
    'namSanXuat': year,
    'mauXe': _optional(color),
    'soVIN': _optional(vin)?.toUpperCase(),
    'soKmHienTai': odometer,
  };

  static String? _optional(String? value) {
    final normalized = value?.trim();
    return normalized == null || normalized.isEmpty ? null : normalized;
  }
}
