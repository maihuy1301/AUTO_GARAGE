import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:garage_mobile/core/api/api_client.dart';
import 'package:garage_mobile/core/storage/secure_session_storage.dart';
import 'package:garage_mobile/features/repair_history/data/repair_history_service.dart';
import '../invoices/invoice_fixture.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Dio dio;
  late RepairHistoryService service;
  setUp(() {
    FlutterSecureStorage.setMockInitialValues({
      'garage_access_token': 'test-token',
    });
    dio = Dio(BaseOptions(baseUrl: 'http://localhost/api'));
    service = RepairHistoryService(
      ApiClient(dio, const SecureSessionStorage(FlutterSecureStorage())),
    );
  });
  test('list only sends pagination and vehicle filter with JWT', () async {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          expect(options.path, '/repair-history');
          expect(options.queryParameters, {
            'vehicleId': 42,
            'page': 2,
            'size': 20,
          });
          expect(options.headers['Authorization'], 'Bearer test-token');
          expect(options.data, isNull);
          handler.resolve(
            Response(
              requestOptions: options,
              data: {
                'success': true,
                'data': {'items': [], 'hasMore': false},
              },
            ),
          );
        },
      ),
    );
    expect((await service.list(vehicleId: 42, page: 2)).items, isEmpty);
  });
  test('detail retains invoice snapshot prices and unknown cost', () async {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          expect(options.path, '/repair-history/10');
          expect(options.queryParameters, isEmpty);
          handler.resolve(
            Response(
              requestOptions: options,
              data: {
                'success': true,
                'data': {
                  'visit': {
                    'receptionId': 10,
                    'plate': '51A',
                    'branchName': 'Garage',
                    'total': null,
                  },
                  'invoices': [invoiceJson()],
                },
              },
            ),
          );
        },
      ),
    );
    final result = await service.detail(10);
    expect(result.visit.total, isNull);
    expect(result.invoices.single.services.single.price, 100000);
    expect(result.invoices.single.total, 419999.5);
  });
  for (final status in [401, 403, 404, 500]) {
    test('HTTP $status produces a readable error', () async {
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            handler.reject(
              DioException(
                requestOptions: options,
                response: Response(requestOptions: options, statusCode: status),
              ),
            );
          },
        ),
      );
      await expectLater(
        service.detail(10),
        throwsA(isA<RepairHistoryException>()),
      );
    });
  }
}
