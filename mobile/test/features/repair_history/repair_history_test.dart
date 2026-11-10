import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:garage_mobile/features/repair_history/data/repair_history_service.dart';
import 'package:garage_mobile/features/repair_history/presentation/repair_history_page.dart';
import 'package:garage_mobile/features/vehicles/data/vehicle_service.dart';
import 'package:garage_mobile/features/vehicles/domain/vehicle_models.dart';
import '../invoices/invoice_fixture.dart';

Map<String, dynamic> visitJson(int id) => {
  'receptionId': id,
  'plate': '51A-12345',
  'branchName': 'Garage Trung tâm',
  'receivedAt': '2026-10-10T09:00:00',
  'handedOverAt': '2026-10-11T10:00:00',
  'odometer': 42000,
  'request': 'Kiểm tra phanh',
  'total': 419999.5,
};

class FakeHistory implements RepairHistoryGateway {
  bool more = false, empty = false;
  String? error;
  Completer<RepairHistoryPageData>? pending;
  final calls = <(int?, int)>[];
  @override
  Future<RepairHistoryPageData> list({int? vehicleId, int page = 0}) async {
    calls.add((vehicleId, page));
    if (error != null) throw RepairHistoryException(error!);
    return pending?.future ??
        Future.value(
          RepairHistoryPageData.fromJson({
            'items': empty ? [] : [visitJson(page + 1)],
            'hasMore': more && page == 0,
          }),
        );
  }

  @override
  Future<RepairHistoryDetail> detail(int id) async {
    if (error != null) throw RepairHistoryException(error!);
    return RepairHistoryDetail.fromJson({
      'visit': visitJson(id),
      'invoices': [invoiceJson()],
    });
  }
}

class FakeVehicles implements VehicleGateway {
  @override
  Future<List<CustomerVehicle>> loadVehicles() async => [
    const CustomerVehicle(
      id: 42,
      licensePlate: '51A-12345',
      brand: 'Toyota',
      model: 'Camry',
    ),
  ];
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  Future<void> show(WidgetTester tester, FakeHistory api, {int? id}) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final router = GoRouter(
      routes: [
        GoRoute(
          path: '/',
          builder: (_, _) => Scaffold(body: RepairHistoryPage(receptionId: id)),
        ),
        GoRoute(
          path: '/account/repair-history/:id',
          builder: (_, state) => Scaffold(
            body: RepairHistoryPage(
              receptionId: int.parse(state.pathParameters['id']!),
            ),
          ),
        ),
        GoRoute(
          path: '/invoices/:id',
          builder: (_, _) =>
              const Scaffold(body: Text('Chi tiết hóa đơn thật')),
        ),
      ],
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          Provider<RepairHistoryGateway>.value(value: api),
          Provider<VehicleGateway>.value(value: FakeVehicles()),
        ],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pump();
  }

  testWidgets('loading and empty handed-over history', (tester) async {
    final api = FakeHistory()..pending = Completer();
    await show(tester, api);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    api.pending!.complete(
      RepairHistoryPageData.fromJson({'items': [], 'hasMore': false}),
    );
    await tester.pumpAndSettle();
    expect(find.text('Chưa có lịch sử sửa chữa'), findsOneWidget);
  });
  testWidgets(
    'filter and pagination request the selected vehicle and reset page',
    (tester) async {
      final api = FakeHistory()..more = true;
      await show(tester, api);
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Xem thêm'));
      await tester.tap(find.text('Xem thêm'));
      await tester.pumpAndSettle();
      expect(api.calls.last, (null, 1));
      await tester.ensureVisible(find.byType(DropdownButtonFormField<int>));
      await tester.tap(find.text('Tất cả xe'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('51A-12345 · Toyota Camry').last);
      await tester.pumpAndSettle();
      expect(api.calls.last, (42, 0));
    },
  );
  testWidgets('refresh failure clears financial data and retry recovers', (
    tester,
  ) async {
    final api = FakeHistory();
    await show(tester, api);
    await tester.pumpAndSettle();
    expect(find.textContaining('419.999,50'), findsOneWidget);
    api.error = 'Bạn không có quyền xem lịch sử này.';
    await tester.drag(find.byType(ListView), const Offset(0, 450));
    await tester.pumpAndSettle();
    expect(find.textContaining('419.999,50'), findsNothing);
    expect(find.text(api.error!), findsOneWidget);
    api.error = null;
    await tester.tap(find.text('Thử lại'));
    await tester.pumpAndSettle();
    expect(find.textContaining('419.999,50'), findsOneWidget);
  });
  testWidgets(
    'detail shows invoice snapshot services and parts and opens invoice',
    (tester) async {
      final api = FakeHistory();
      await show(tester, api, id: 1);
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Thay dầu'), 200);
      expect(find.text('Thay dầu'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Dầu động cơ'), 150);
      expect(find.text('Dầu động cơ'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Xem chi tiết hóa đơn'), 150);
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Xem chi tiết hóa đơn'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Xem chi tiết hóa đơn'));
      await tester.pumpAndSettle();
      expect(find.text('Chi tiết hóa đơn thật'), findsOneWidget);
    },
  );
  testWidgets('late response after disposal does not update old page', (
    tester,
  ) async {
    final api = FakeHistory()..pending = Completer();
    await show(tester, api);
    await tester.pumpWidget(const MaterialApp(home: Text('Đã đăng xuất')));
    api.pending!.complete(
      RepairHistoryPageData.fromJson({
        'items': [visitJson(1)],
        'hasMore': false,
      }),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('51A-12345'), findsNothing);
  });
}
