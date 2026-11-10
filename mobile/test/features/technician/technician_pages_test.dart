import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:garage_mobile/core/api/api_client.dart';
import 'package:garage_mobile/core/auth/auth_controller.dart';
import 'package:garage_mobile/core/auth/auth_repository.dart';
import 'package:garage_mobile/core/storage/secure_session_storage.dart';
import 'package:garage_mobile/features/technician/data/technician_service.dart';
import 'package:garage_mobile/features/technician/domain/technician_models.dart';
import 'package:garage_mobile/features/technician/presentation/technician_home_page.dart';
import 'package:garage_mobile/features/technician/presentation/technician_repair_detail_page.dart';
import 'package:provider/provider.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('danh sách chỉ hiện công việc chưa khóa ở bộ lọc mặc định', (
    tester,
  ) async {
    final gateway = _FakeTechnicianGateway();
    await tester.pumpWidget(
      ChangeNotifierProvider<AuthController>.value(
        value: _authController(),
        child: MaterialApp(home: TechnicianHomePage(gateway: gateway)),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Công việc hôm nay'), findsOneWidget);
    expect(find.text('51A-11111'), findsOneWidget);
    expect(find.text('51A-22222'), findsNothing);
    expect(find.byKey(const ValueKey('technician-order-11')), findsOneWidget);
  });

  testWidgets('chi tiết hiển thị khách, hạng mục và tiến độ', (tester) async {
    final gateway = _FakeTechnicianGateway();
    await tester.pumpWidget(
      MaterialApp(
        home: TechnicianRepairDetailPage(repairOrderId: 11, gateway: gateway),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Phiếu #11'), findsOneWidget);
    expect(find.text('Nguyễn Văn A'), findsOneWidget);
    expect(find.text('Kiểm tra phanh'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Đang sửa · 50%'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Đang sửa · 50%'), findsOneWidget);
    expect(find.text('Cập nhật tiến độ'), findsOneWidget);
  });

  testWidgets(
    'tiến độ tự đổi theo trạng thái và không gửi nhầm 100% khi chờ duyệt',
    (tester) async {
      final gateway = _FakeTechnicianGateway();
      await tester.pumpWidget(
        MaterialApp(
          home: TechnicianRepairDetailPage(repairOrderId: 11, gateway: gateway),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cập nhật tiến độ'));
      await tester.pumpAndSettle();

      expect(find.byType(Slider), findsNothing);
      expect(find.text('Tiến độ theo trạng thái: 50%'), findsOneWidget);
      for (final choice in [
        ('Hoàn tất', 100),
        ('Đã phân công', 0),
        ('Đang sửa', 50),
        ('Tạm dừng', 0),
      ]) {
        await tester.tap(find.byType(DropdownButtonFormField<String>));
        await tester.pumpAndSettle();
        await tester.tap(find.text(choice.$1).last);
        await tester.pumpAndSettle();
        expect(
          find.text('Tiến độ theo trạng thái: ${choice.$2}%'),
          findsOneWidget,
        );
        expect(
          tester
              .widget<LinearProgressIndicator>(
                find.byType(LinearProgressIndicator),
              )
              .value,
          choice.$2 / 100,
        );
      }
      await tester.enterText(
        find.byType(TextField),
        'Cần xác nhận hạng mục phát sinh',
      );
      await tester.ensureVisible(find.text('Lưu tiến độ'));
      await tester.tap(find.text('Lưu tiến độ'));
      await tester.pumpAndSettle();
      expect(gateway.savedProgress?.status, 'TAM_DUNG');
      expect(gateway.savedProgress?.percent, 0);
      expect(
        gateway.savedProgress?.description,
        'Cần xác nhận hạng mục phát sinh',
      );
      expect(find.text('Đã cập nhật tiến độ sửa chữa.'), findsOneWidget);
    },
  );

  testWidgets('phiếu hoàn tất không còn nút cập nhật tiến độ', (tester) async {
    final gateway = _FakeTechnicianGateway(completedDetail: true);
    await tester.pumpWidget(
      MaterialApp(
        home: TechnicianRepairDetailPage(repairOrderId: 12, gateway: gateway),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Hoàn tất'), findsOneWidget);
    expect(find.text('Cập nhật tiến độ'), findsNothing);
  });

  testWidgets('hiển thị phân nhóm hạng mục ban đầu và hạng mục phát sinh (Gợi ý 1)', (tester) async {
    final gateway = _FakeTechnicianGateway(hasChildItems: true);
    await tester.pumpWidget(
      MaterialApp(
        home: TechnicianRepairDetailPage(repairOrderId: 11, gateway: gateway),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Hạng mục ban đầu (Phiếu #11)'), findsOneWidget);
    expect(find.text('Hạng mục phát sinh (Phiếu #15)'), findsOneWidget);
    expect(find.text('Thay dầu 5W-30'), findsOneWidget);
    expect(find.text('Phát sinh #15'), findsOneWidget);
  });
}

AuthController _authController() {
  FlutterSecureStorage.setMockInitialValues({});
  const storage = SecureSessionStorage(FlutterSecureStorage());
  final apiClient = ApiClient(Dio(), storage);
  return AuthController(AuthRepository(apiClient, storage));
}

class _FakeTechnicianGateway implements TechnicianGateway {
  _FakeTechnicianGateway({this.completedDetail = false, this.hasChildItems = false});

  final bool completedDetail;
  final bool hasChildItems;
  TechnicianRepairProgress? savedProgress;

  List<TechnicianRepairOrder> get orders => const [
    TechnicianRepairOrder(
      id: 11,
      status: 'DANG_SUA',
      licensePlate: '51A-11111',
      brand: 'Toyota',
      model: 'Camry',
      customerName: 'Nguyễn Văn A',
      branchName: 'Garage Trung tâm',
    ),
    TechnicianRepairOrder(
      id: 12,
      status: 'HOAN_TAT',
      licensePlate: '51A-22222',
    ),
  ];

  @override
  Future<List<TechnicianRepairOrder>> loadRepairOrders() async => orders;

  @override
  Future<TechnicianRepairDetail> loadRepairDetail(int repairOrderId) async {
    final order = completedDetail ? orders.last : orders.first;
    return TechnicianRepairDetail(
      order: order,
      items: [
        const TechnicianRepairItem(
          id: 3,
          repairOrderId: 11,
          name: 'Kiểm tra phanh',
          category: 'Bảo dưỡng',
          status: 'CHO_XU_LY',
          total: 250000,
        ),
        if (hasChildItems)
          const TechnicianRepairItem(
            id: 8,
            repairOrderId: 15,
            name: 'Thay dầu 5W-30',
            category: 'Bảo dưỡng',
            status: 'CHO_XU_LY',
            total: 350000,
          ),
      ],
      progressHistory: const [
        TechnicianRepairProgress(
          status: 'DANG_SUA',
          percent: 50,
          description: 'Đang kiểm tra',
        ),
      ],
    );
  }

  @override
  Future<TechnicianRepairItem> updateItemStatus({
    required int repairOrderId,
    required int itemId,
    required String status,
  }) => throw UnimplementedError();

  @override
  Future<TechnicianRepairProgress> updateProgress({
    required int repairOrderId,
    required String status,
    required int percent,
    String? description,
  }) async {
    return savedProgress = TechnicianRepairProgress(
      status: status,
      percent: percent,
      description: description,
    );
  }
}
