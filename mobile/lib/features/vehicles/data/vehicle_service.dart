import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../domain/vehicle_models.dart';

abstract interface class VehicleGateway {
  Future<List<CustomerVehicle>> loadVehicles();
  Future<List<VehicleBrand>> loadBrands();
  Future<List<VehicleModel>> loadModels(int brandId);
  Future<CustomerVehicle> createVehicle(CreateCustomerVehicle request);
  Future<CustomerVehicle> updateVehicle(
    int vehicleId,
    UpdateCustomerVehicle request,
  );
  Future<void> uploadVehicleImage(int vehicleId, String filePath);
  Future<Uint8List?> loadVehicleImage(int vehicleId);
}

class VehicleException implements Exception {
  const VehicleException(this.message);
  final String message;
  @override
  String toString() => message;
}

class VehicleService implements VehicleGateway {
  const VehicleService(this._apiClient);
  final ApiClient _apiClient;

  @override
  Future<List<CustomerVehicle>> loadVehicles() async {
    try {
      final response = await _apiClient.dio.get<Map<String, dynamic>>(
        '/vehicles',
      );
      final data = response.data?['data'];
      if (response.data?['success'] != true || data is! List) {
        throw VehicleException(
          response.data?['message']?.toString() ??
              'Không thể tải danh sách xe.',
        );
      }
      return data
          .whereType<Map<String, dynamic>>()
          .map(CustomerVehicle.fromJson)
          .toList(growable: false);
    } on VehicleException {
      rethrow;
    } on DioException catch (error) {
      throw VehicleException(_messageFor(error));
    } on Object {
      throw const VehicleException('Dữ liệu xe từ máy chủ không hợp lệ.');
    }
  }

  @override
  Future<List<VehicleBrand>> loadBrands() => _loadCatalogList(
    path: '/brands',
    fallbackMessage: 'Không thể tải danh sách hãng xe.',
    parse: VehicleBrand.fromJson,
  );

  @override
  Future<List<VehicleModel>> loadModels(int brandId) => _loadCatalogList(
    path: '/brands/$brandId/models',
    fallbackMessage: 'Không thể tải danh sách model xe.',
    parse: VehicleModel.fromJson,
  );

  @override
  Future<CustomerVehicle> createVehicle(CreateCustomerVehicle request) async {
    try {
      final response = await _apiClient.dio.post<Map<String, dynamic>>(
        '/vehicles',
        data: request.toJson(),
      );
      final data = response.data?['data'];
      if (response.data?['success'] != true || data is! Map<String, dynamic>) {
        throw VehicleException(
          response.data?['message']?.toString() ?? 'Không thể thêm xe.',
        );
      }
      return CustomerVehicle.fromJson(data);
    } on VehicleException {
      rethrow;
    } on DioException catch (error) {
      throw VehicleException(_messageFor(error));
    } on Object {
      throw const VehicleException('Phản hồi thêm xe từ máy chủ không hợp lệ.');
    }
  }

  @override
  Future<CustomerVehicle> updateVehicle(
    int vehicleId,
    UpdateCustomerVehicle request,
  ) async {
    try {
      final response = await _apiClient.dio.put<Map<String, dynamic>>(
        '/vehicles/$vehicleId',
        data: request.toJson(),
      );
      final data = response.data?['data'];
      if (response.data?['success'] != true || data is! Map<String, dynamic>) {
        throw VehicleException(
          response.data?['message']?.toString() ?? 'Không thể cập nhật xe.',
        );
      }
      return CustomerVehicle.fromJson(data);
    } on VehicleException {
      rethrow;
    } on DioException catch (error) {
      throw VehicleException(_messageFor(error));
    } on Object {
      throw const VehicleException(
        'Phản hồi cập nhật xe từ máy chủ không hợp lệ.',
      );
    }
  }

  @override
  Future<void> uploadVehicleImage(int vehicleId, String filePath) async {
    try {
      final fileName = filePath.split(RegExp(r'[/\\]')).last;
      final response = await _apiClient.dio.post<Map<String, dynamic>>(
        '/vehicles/$vehicleId/image',
        data: FormData.fromMap({
          'file': await MultipartFile.fromFile(filePath, filename: fileName),
        }),
      );
      if (response.data?['success'] != true) {
        throw VehicleException(
          response.data?['message']?.toString() ?? 'Không thể tải ảnh xe.',
        );
      }
    } on VehicleException {
      rethrow;
    } on DioException catch (error) {
      throw VehicleException(_messageFor(error));
    } on Object {
      throw const VehicleException('Không thể đọc ảnh đã chọn.');
    }
  }

  @override
  Future<Uint8List?> loadVehicleImage(int vehicleId) async {
    try {
      final response = await _apiClient.dio.get<List<int>>(
        '/vehicles/$vehicleId/image',
        options: Options(responseType: ResponseType.bytes),
      );
      final bytes = response.data;
      return bytes == null ? null : Uint8List.fromList(bytes);
    } on DioException catch (error) {
      if (error.response?.statusCode == 404) return null;
      throw VehicleException(_messageFor(error));
    }
  }

  Future<List<T>> _loadCatalogList<T>({
    required String path,
    required String fallbackMessage,
    required T Function(Map<String, dynamic>) parse,
  }) async {
    try {
      final response = await _apiClient.dio.get<Map<String, dynamic>>(path);
      final data = response.data?['data'];
      if (response.data?['success'] != true || data is! List) {
        throw VehicleException(
          response.data?['message']?.toString() ?? fallbackMessage,
        );
      }
      return data
          .whereType<Map<String, dynamic>>()
          .map(parse)
          .toList(growable: false);
    } on VehicleException {
      rethrow;
    } on DioException catch (error) {
      throw VehicleException(_messageFor(error));
    } on Object {
      throw VehicleException('$fallbackMessage Dữ liệu máy chủ không hợp lệ.');
    }
  }

  String _messageFor(DioException error) {
    final body = error.response?.data;
    final serverMessage = body is Map<String, dynamic>
        ? body['message']?.toString()
        : null;
    if (serverMessage != null && serverMessage.trim().isNotEmpty) {
      return serverMessage.replaceFirst(RegExp(r'^Forbidden:\s*'), '');
    }
    if (error.response?.statusCode == 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    }
    if (error.response?.statusCode == 403) {
      return 'Bạn không có quyền thực hiện thao tác này.';
    }
    return 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.';
  }
}
