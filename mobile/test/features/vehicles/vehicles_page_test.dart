import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:garage_mobile/features/vehicles/data/vehicle_service.dart';
import 'package:garage_mobile/features/vehicles/domain/vehicle_models.dart';
import 'package:garage_mobile/features/vehicles/presentation/vehicles_page.dart';
import 'package:garage_mobile/features/customer/presentation/customer_shell.dart';

void main() {
  const existingVehicle = CustomerVehicle(
    id: 7,
    licensePlate: '51A-11111',
    brandId: 1,
    modelId: 10,
    brand: 'Toyota',
    model: 'Camry',
    year: 2020,
    color: 'Trắng',
    vin: 'VIN123',
    odometer: 12000,
  );

  Future<void> openEditor(
    WidgetTester tester,
    _FakeVehicleGateway gateway,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: VehiclesPage(gateway: gateway)),
      ),
    );
    await tester.pumpAndSettle();
    final edit = find.byKey(const ValueKey('vehicle-edit-7'));
    await tester.ensureVisible(edit);
    await tester.tap(edit);
    await tester.pumpAndSettle();
  }

  testWidgets('bánh răng mở dữ liệu cũ, lưu đúng xe và cập nhật thẻ', (
    tester,
  ) async {
    final gateway = _FakeVehicleGateway()..vehicles = [existingVehicle];
    await openEditor(tester, gateway);
    expect(find.text('Chỉnh sửa thông tin xe'), findsOneWidget);
    final plate = tester.widget<TextFormField>(
      find.byKey(const ValueKey('vehicle-license-plate-field')),
    );
    expect(plate.controller!.text, '51A-11111');
    final editablePlate = tester.widget<TextField>(
      find.descendant(
        of: find.byKey(const ValueKey('vehicle-license-plate-field')),
        matching: find.byType(TextField),
      ),
    );
    expect(editablePlate.readOnly, isTrue);
    expect(find.text('2020'), findsOneWidget);
    expect(find.text('12000'), findsOneWidget);
    final color = find.widgetWithText(TextFormField, 'Trắng');
    await tester.ensureVisible(color);
    await tester.enterText(color, 'Đen');
    final submit = find.byKey(const ValueKey('vehicle-submit-button'));
    await tester.ensureVisible(submit);
    await tester.tap(submit);
    await tester.pumpAndSettle();
    expect(gateway.updatedId, 7);
    expect(gateway.lastUpdate?.brandId, 1);
    expect(gateway.lastUpdate?.modelId, 10);
    expect(gateway.lastUpdate?.color, 'Đen');
    expect(gateway.lastUpdate?.vin, 'VIN123');
    expect(gateway.createCalls, 0);
    expect(find.text('Đen • Đời 2020'), findsOneWidget);
    expect(find.text('Đã cập nhật thông tin xe.'), findsOneWidget);
    expect(gateway.imageLoads, 2);
  });

  testWidgets('lỗi lưu giữ form để sửa lại, không đổi thẻ xe', (tester) async {
    final gateway = _FakeVehicleGateway()
      ..vehicles = [existingVehicle]
      ..updateError = 'Bạn không có quyền cập nhật xe này';
    await openEditor(tester, gateway);
    final submit = find.byKey(const ValueKey('vehicle-submit-button'));
    await tester.ensureVisible(submit);
    await tester.tap(submit);
    await tester.pumpAndSettle();
    expect(find.text(gateway.updateError!), findsOneWidget);
    expect(find.text('Lưu thay đổi'), findsOneWidget);
    expect(gateway.createCalls, 0);
    gateway.updateError = null;
    await tester.ensureVisible(submit);
    await tester.tap(submit);
    await tester.pumpAndSettle();
    expect(find.text('Đã cập nhật thông tin xe.'), findsOneWidget);
  });

  testWidgets('đóng form chỉnh sửa không gửi request cập nhật', (tester) async {
    final gateway = _FakeVehicleGateway()..vehicles = [existingVehicle];
    await openEditor(tester, gateway);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(gateway.updatedId, isNull);
    expect(gateway.createCalls, 0);
  });

  testWidgets('empty state và nút góc phải cùng mở form thêm xe', (
    tester,
  ) async {
    final gateway = _FakeVehicleGateway();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: VehiclesPage(gateway: gateway)),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.byKey(const ValueKey('vehicles-header-add-button')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('vehicles-empty-add-button')),
      findsOneWidget,
    );

    await tester.tap(find.byKey(const ValueKey('vehicles-empty-add-button')));
    await tester.pumpAndSettle();
    expect(find.text('Đăng ký xe mới'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('vehicle-license-plate-field')),
      findsOneWidget,
    );
    expect(find.text('Ảnh xe (Tùy chọn)'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('vehicle-image-placeholder')),
      findsOneWidget,
    );

    await tester.ensureVisible(
      find.byKey(const ValueKey('vehicle-image-placeholder')),
    );
    await tester.tap(find.byKey(const ValueKey('vehicle-image-placeholder')));
    await tester.pumpAndSettle();
    expect(find.text('Thêm ảnh xe'), findsOneWidget);
    expect(find.text('Chụp ảnh'), findsOneWidget);
    expect(find.text('Chọn từ thư viện'), findsOneWidget);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const ValueKey('vehicle-license-plate-field')),
      '51A-12345',
    );
    final brandField = find.byKey(const ValueKey('vehicle-brand-field'));
    await tester.ensureVisible(brandField);
    await tester.pumpAndSettle();
    await tester.tap(brandField);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Toyota').last);
    await tester.pumpAndSettle();
    final modelField = find.byKey(const ValueKey('vehicle-model-field'));
    await tester.ensureVisible(modelField);
    await tester.pumpAndSettle();
    await tester.tap(modelField);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Camry').last);
    await tester.pumpAndSettle();
    await tester.ensureVisible(
      find.byKey(const ValueKey('vehicle-submit-button')),
    );
    await tester.tap(find.byKey(const ValueKey('vehicle-submit-button')));
    await tester.pumpAndSettle();

    expect(gateway.createCalls, 1);
    expect(gateway.lastRequest?.brandId, 1);
    expect(gateway.lastRequest?.modelId, 10);
    expect(find.text('51A-12345'), findsOneWidget);
  });

  testWidgets('route xe giữ navbar 5 mục và chọn Tài khoản', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: CustomerShell(
          currentLocation: '/vehicles',
          child: SizedBox.shrink(),
        ),
      ),
    );

    final navigation = tester.widget<NavigationBar>(find.byType(NavigationBar));
    expect(navigation.destinations, hasLength(5));
    expect(navigation.selectedIndex, 4);
    expect(find.text('Tài khoản'), findsOneWidget);
  });

  testWidgets('camera của từng trường mở chọn nguồn ảnh đúng mục', (
    tester,
  ) async {
    final gateway = _FakeVehicleGateway();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: VehiclesPage(gateway: gateway)),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('vehicles-empty-add-button')));
    await tester.pumpAndSettle();

    expect(
      find.byKey(const ValueKey('vehicle-text-scan-button')),
      findsNothing,
    );
    for (final entry in {
      'plate': 'biển số xe',
      'odometer': 'đồng hồ ODO',
      'vin': 'số khung / VIN',
    }.entries) {
      final camera = find.byKey(ValueKey('vehicle-text-scan-${entry.key}'));
      await tester.ensureVisible(camera);
      await tester.tap(camera);
      await tester.pumpAndSettle();
      expect(find.text('Quét ${entry.value}'), findsOneWidget);
      expect(find.text('Chụp ảnh trực tiếp'), findsOneWidget);
      expect(find.text('Chọn ảnh từ thư viện'), findsOneWidget);
      expect(find.text('Chọn thông tin cần quét'), findsNothing);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
    }
    expect(find.byKey(const ValueKey('vehicle-text-scan-year')), findsNothing);
    expect(gateway.createCalls, 0);
    expect(gateway.updatedId, isNull);
  });

  testWidgets('xe đã lưu khóa quét biển số và vẫn cho quét ODO, VIN', (
    tester,
  ) async {
    final gateway = _FakeVehicleGateway()..vehicles = [existingVehicle];
    await openEditor(tester, gateway);
    for (final target in ['plate', 'odometer', 'vin']) {
      final camera = tester.widget<IconButton>(
        find.byKey(ValueKey('vehicle-text-scan-$target')),
      );
      expect(camera.onPressed, target == 'plate' ? isNull : isNotNull);
    }
    expect(gateway.updatedId, isNull);
  });
}

class _FakeVehicleGateway implements VehicleGateway {
  int createCalls = 0;
  CreateCustomerVehicle? lastRequest;
  List<CustomerVehicle> vehicles = [];
  int? updatedId;
  UpdateCustomerVehicle? lastUpdate;
  String? updateError;
  int imageLoads = 0;

  @override
  Future<CustomerVehicle> updateVehicle(
    int vehicleId,
    UpdateCustomerVehicle request,
  ) async {
    updatedId = vehicleId;
    lastUpdate = request;
    if (updateError != null) throw VehicleException(updateError!);
    return CustomerVehicle(
      id: vehicleId,
      licensePlate: vehicles.single.licensePlate,
      brandId: request.brandId,
      modelId: request.modelId,
      brand: 'Toyota',
      model: 'Camry',
      color: request.color,
      year: request.year,
      vin: request.vin,
      odometer: request.odometer,
    );
  }

  @override
  Future<CustomerVehicle> createVehicle(CreateCustomerVehicle request) async {
    createCalls += 1;
    lastRequest = request;
    return CustomerVehicle(id: 1, licensePlate: request.licensePlate.trim());
  }

  @override
  Future<List<VehicleBrand>> loadBrands() async => const [
    VehicleBrand(id: 1, name: 'Toyota'),
  ];

  @override
  Future<List<VehicleModel>> loadModels(int brandId) async => const [
    VehicleModel(id: 10, brandId: 1, name: 'Camry'),
  ];

  @override
  Future<List<CustomerVehicle>> loadVehicles() async => vehicles;

  @override
  Future<Uint8List?> loadVehicleImage(int vehicleId) async {
    imageLoads++;
    return null;
  }

  @override
  Future<void> uploadVehicleImage(int vehicleId, String filePath) async {}
}
