import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
import '../../invoices/domain/invoice_models.dart';

class RepairVisit {
  RepairVisit.fromJson(Map<String, dynamic> json)
    : id = (json['receptionId'] as num).toInt(),
      plate = json['plate'] as String,
      branch = json['branchName'] as String,
      receivedAt = DateTime.tryParse(json['receivedAt'] as String? ?? ''),
      handedOverAt = DateTime.tryParse(json['handedOverAt'] as String? ?? ''),
      odometer = (json['odometer'] as num?)?.toInt(),
      request = json['request'] as String? ?? '',
      total = (json['total'] as num?)?.toDouble();
  final int id;
  final String plate, branch, request;
  final DateTime? receivedAt, handedOverAt;
  final int? odometer;
  final double? total;
}

class RepairHistoryPageData {
  RepairHistoryPageData.fromJson(Map<String, dynamic> json)
    : items = (json['items'] as List)
          .map((e) => RepairVisit.fromJson(e as Map<String, dynamic>))
          .toList(),
      hasMore = json['hasMore'] as bool;
  final List<RepairVisit> items;
  final bool hasMore;
}

class RepairHistoryDetail {
  RepairHistoryDetail.fromJson(Map<String, dynamic> json)
    : visit = RepairVisit.fromJson(json['visit'] as Map<String, dynamic>),
      invoices = (json['invoices'] as List)
          .map((e) => CustomerInvoice.fromJson(e as Map<String, dynamic>))
          .toList();
  final RepairVisit visit;
  final List<CustomerInvoice> invoices;
}

abstract interface class RepairHistoryGateway {
  Future<RepairHistoryPageData> list({int? vehicleId, int page = 0});
  Future<RepairHistoryDetail> detail(int id);
}

class RepairHistoryException implements Exception {
  const RepairHistoryException(this.message);
  final String message;
  @override
  String toString() => message;
}

class RepairHistoryService implements RepairHistoryGateway {
  const RepairHistoryService(this.api);
  final ApiClient api;
  @override
  Future<RepairHistoryPageData> list({int? vehicleId, int page = 0}) async =>
      RepairHistoryPageData.fromJson(
        await _get('/repair-history', {
          'vehicleId': ?vehicleId,
          'page': page,
          'size': 20,
        }),
      );
  @override
  Future<RepairHistoryDetail> detail(int id) async =>
      RepairHistoryDetail.fromJson(await _get('/repair-history/$id', {}));
  Future<Map<String, dynamic>> _get(
    String path,
    Map<String, dynamic> query,
  ) async {
    try {
      final response = await api.dio.get<Map<String, dynamic>>(
        path,
        queryParameters: query,
      );
      if (response.data?['success'] != true ||
          response.data?['data'] is! Map<String, dynamic>) {
        throw const RepairHistoryException('Không thể tải lịch sử sửa chữa.');
      }
      return response.data!['data'] as Map<String, dynamic>;
    } on DioException catch (error) {
      final status = error.response?.statusCode;
      throw RepairHistoryException(switch (status) {
        401 => 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        403 => 'Bạn không có quyền xem lịch sử này.',
        404 => 'Không tìm thấy lần sửa chữa trong lịch sử.',
        _ => 'Không thể tải lịch sử. Vui lòng thử lại.',
      });
    }
  }
}
