import 'package:dio/dio.dart';

import '../../../core/api/api_client.dart';
import '../domain/technician_models.dart';

abstract interface class TechnicianGateway {
  Future<List<TechnicianRepairOrder>> loadRepairOrders();

  Future<TechnicianRepairDetail> loadRepairDetail(int repairOrderId);

  Future<TechnicianRepairProgress> updateProgress({
    required int repairOrderId,
    required String status,
    required int percent,
    String? description,
  });

  Future<TechnicianRepairItem> updateItemStatus({
    required int repairOrderId,
    required int itemId,
    required String status,
  });
}

class TechnicianException implements Exception {
  const TechnicianException(this.message);

  final String message;

  @override
  String toString() => message;
}

class TechnicianService implements TechnicianGateway {
  TechnicianService(this._apiClient);

  final ApiClient _apiClient;

  @override
  Future<List<TechnicianRepairOrder>> loadRepairOrders() async {
    try {
      final response = await _apiClient.dio.get<Map<String, dynamic>>(
        '/technician/repair-orders',
      );
      final data = _readList(response.data, 'danh sách công việc');
      final orders = data.map(TechnicianRepairOrder.fromJson).toList();
      orders.sort((a, b) {
        final statusCompare = _statusPriority(
          a.status,
        ).compareTo(_statusPriority(b.status));
        if (statusCompare != 0) return statusCompare;
        return b.id.compareTo(a.id);
      });
      return orders;
    } on TechnicianException {
      rethrow;
    } on DioException catch (error) {
      throw TechnicianException(_messageFor(error));
    } on Object {
      throw const TechnicianException(
        'Phản hồi danh sách công việc từ máy chủ không hợp lệ.',
      );
    }
  }

  @override
  Future<TechnicianRepairDetail> loadRepairDetail(int repairOrderId) async {
    try {
      final responses = await Future.wait([
        _apiClient.dio.get<Map<String, dynamic>>(
          '/technician/repair-orders/$repairOrderId',
        ),
        _apiClient.dio.get<Map<String, dynamic>>(
          '/technician/repair-orders/$repairOrderId/items',
        ),
        _apiClient.dio.get<Map<String, dynamic>>(
          '/technician/repair-orders/$repairOrderId/progress-history',
        ),
      ]);

      final order = TechnicianRepairOrder.fromJson(
        _readObject(responses[0].data, 'chi tiết công việc'),
      );
      final items = _readList(
        responses[1].data,
        'danh sách hạng mục',
      ).map(TechnicianRepairItem.fromJson).toList(growable: false);
      final history = _readList(
        responses[2].data,
        'lịch sử tiến độ',
      ).map(TechnicianRepairProgress.fromJson).toList(growable: false);

      // Tải danh sách phụ tùng tương ứng cho tất cả các phiếu (phiếu chính + phiếu phát sinh)
      final orderIds = <int>{repairOrderId, ...items.map((it) => it.repairOrderId)};
      final parts = <TechnicianRepairPart>[];
      try {
        final partsResponses = await Future.wait(
          orderIds.map(
            (id) => _apiClient.dio.get<Map<String, dynamic>>('/repair-orders/$id/parts'),
          ),
        );
        for (final resp in partsResponses) {
          final list = _readList(resp.data, 'danh sách phụ tùng');
          parts.addAll(list.map(TechnicianRepairPart.fromJson));
        }
      } catch (_) {
        // Dự phòng bỏ qua nếu một phiếu con không thể truy vấn phụ tùng
      }

      return TechnicianRepairDetail(
        order: order,
        items: items,
        progressHistory: history,
        parts: parts,
      );
    } on TechnicianException {
      rethrow;
    } on DioException catch (error) {
      throw TechnicianException(_messageFor(error));
    } on Object {
      throw const TechnicianException(
        'Phản hồi chi tiết công việc từ máy chủ không hợp lệ.',
      );
    }
  }

  @override
  Future<TechnicianRepairProgress> updateProgress({
    required int repairOrderId,
    required String status,
    required int percent,
    String? description,
  }) async {
    try {
      final response = await _apiClient.dio.patch<Map<String, dynamic>>(
        '/technician/repair-orders/$repairOrderId/progress',
        data: {
          'trangThai': status,
          'phanTramHoanThanh': percent,
          'moTa': _optional(description),
        },
      );
      return TechnicianRepairProgress.fromJson(
        _readObject(response.data, 'cập nhật tiến độ'),
      );
    } on TechnicianException {
      rethrow;
    } on DioException catch (error) {
      throw TechnicianException(_messageFor(error));
    } on Object {
      throw const TechnicianException(
        'Phản hồi cập nhật tiến độ từ máy chủ không hợp lệ.',
      );
    }
  }

  @override
  Future<TechnicianRepairItem> updateItemStatus({
    required int repairOrderId,
    required int itemId,
    required String status,
  }) async {
    try {
      final response = await _apiClient.dio.patch<Map<String, dynamic>>(
        '/technician/repair-orders/$repairOrderId/items/$itemId',
        data: {'trangThai': status},
      );
      return TechnicianRepairItem.fromJson(
        _readObject(response.data, 'cập nhật hạng mục'),
      );
    } on TechnicianException {
      rethrow;
    } on DioException catch (error) {
      throw TechnicianException(_messageFor(error));
    } on Object {
      throw const TechnicianException(
        'Phản hồi cập nhật hạng mục từ máy chủ không hợp lệ.',
      );
    }
  }

  List<Map<String, dynamic>> _readList(
    Map<String, dynamic>? envelope,
    String label,
  ) {
    final data = envelope?['data'];
    if (envelope?['success'] != true || data is! List) {
      throw TechnicianException(
        envelope?['message']?.toString() ?? 'Không thể tải $label.',
      );
    }
    return data.whereType<Map<String, dynamic>>().toList(growable: false);
  }

  Map<String, dynamic> _readObject(
    Map<String, dynamic>? envelope,
    String label,
  ) {
    final data = envelope?['data'];
    if (envelope?['success'] != true || data is! Map<String, dynamic>) {
      throw TechnicianException(
        envelope?['message']?.toString() ?? 'Không thể xử lý $label.',
      );
    }
    return data;
  }

  String _messageFor(DioException error) {
    final body = error.response?.data;
    final message = body is Map<String, dynamic>
        ? body['message']?.toString()
        : null;
    if (message != null && message.trim().isNotEmpty) {
      return message.replaceFirst(RegExp(r'^Forbidden:\s*'), '');
    }
    if (error.response?.statusCode == 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    }
    if (error.response?.statusCode == 403) {
      return 'Bạn không được phân công công việc này.';
    }
    return 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.';
  }

  String? _optional(String? value) {
    final normalized = value?.trim();
    return normalized == null || normalized.isEmpty ? null : normalized;
  }

  int _statusPriority(String status) => switch (status) {
    'DANG_SUA' => 0,
    'DA_PHAN_CONG' => 1,
    'TAM_DUNG' => 2,
    'HOAN_TAT' => 3,
    'HUY' => 4,
    _ => 2,
  };
}
