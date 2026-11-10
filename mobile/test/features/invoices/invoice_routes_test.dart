import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:garage_mobile/app/router.dart';
import 'package:garage_mobile/core/api/api_client.dart';
import 'package:garage_mobile/core/auth/auth_controller.dart';
import 'package:garage_mobile/core/auth/auth_repository.dart';
import 'package:garage_mobile/core/auth/auth_session.dart';
import 'package:garage_mobile/core/storage/secure_session_storage.dart';
import 'package:garage_mobile/features/invoices/data/invoice_service.dart';
import 'package:garage_mobile/features/technician/data/technician_service.dart';
import 'package:garage_mobile/features/technician/domain/technician_models.dart';
import 'package:provider/provider.dart';
import 'package:garage_mobile/features/repair_history/data/repair_history_service.dart';
import 'package:garage_mobile/features/vehicles/data/vehicle_service.dart';
import '../repair_history/repair_history_test.dart'
    show FakeHistory, FakeVehicles;

import 'invoices_page_test.dart' show FakeInvoices;
import 'payment_test.dart' show FakePayments;
import '../customer/profile_test.dart' show FakeProfile;
import 'package:garage_mobile/features/customer/data/profile_service.dart';
import 'package:garage_mobile/features/invoices/data/payment_service.dart';

class _Auth extends AuthController {
  _Auth(this.current)
    : super(
        AuthRepository(
          ApiClient(Dio(), const SecureSessionStorage(FlutterSecureStorage())),
          const SecureSessionStorage(FlutterSecureStorage()),
        ),
      );
  AuthSession? current;
  @override
  bool get isInitialized => true;
  @override
  bool get isAuthenticated => current != null;
  @override
  AuthSession? get session => current;
  void change(AuthSession? value) {
    current = value;
    notifyListeners();
  }
}

class _Technician implements TechnicianGateway {
  @override
  Future<List<TechnicianRepairOrder>> loadRepairOrders() async => [];
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

const _customer = AuthSession(
  accessToken: 'test',
  username: 'customer',
  roles: ['ROLE_CUSTOMER'],
);

void main() {
  Future<AppRouter> mount(
    WidgetTester tester,
    _Auth auth,
    FakeInvoices invoices,
  ) async {
    final appRouter = AppRouter(auth);
    addTearDown(appRouter.router.dispose);
    addTearDown(auth.dispose);
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthController>.value(value: auth),
          Provider<InvoiceGateway>.value(value: invoices),
          Provider<RepairHistoryGateway>.value(
            value: FakeHistory()..empty = true,
          ),
          Provider<VehicleGateway>.value(value: FakeVehicles()),
          Provider<ProfileGateway>.value(value: FakeProfile()),
          Provider<PaymentGateway>.value(
            value: FakePayments()..enabled = false,
          ),
          Provider<TechnicianGateway>.value(value: _Technician()),
        ],
        child: MaterialApp.router(routerConfig: appRouter.router),
      ),
    );
    await tester.pumpAndSettle();
    return appRouter;
  }

  testWidgets(
    'repair history retains account tab and redirects to login on logout',
    (tester) async {
      final auth = _Auth(_customer);
      final app = await mount(tester, auth, FakeInvoices());
      app.router.go('/account/repair-history');
      await tester.pumpAndSettle();
      expect(find.text('Chưa có lịch sử sửa chữa'), findsOneWidget);
      expect(
        tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
        4,
      );
      auth.change(null);
      await tester.pumpAndSettle();
      expect(app.router.routeInformationProvider.value.uri.path, '/login');
      expect(find.text('Chưa có lịch sử sửa chữa'), findsNothing);
    },
  );

  testWidgets(
    'profile is protected, retains account navigation and exits on logout',
    (tester) async {
      final auth = _Auth(_customer);
      final app = await mount(tester, auth, FakeInvoices());
      app.router.go('/account');
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Thông tin cá nhân'));
      await tester.tap(find.text('Thông tin cá nhân'));
      await tester.pumpAndSettle();
      expect(find.text('Lưu thay đổi'), findsOneWidget);
      expect(
        tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
        4,
      );
      auth.change(null);
      await tester.pumpAndSettle();
      expect(find.text('Lưu thay đổi'), findsNothing);
      expect(app.router.routeInformationProvider.value.uri.path, '/login');
    },
  );

  testWidgets(
    'account -> list -> detail -> back keeps account shell selected',
    (tester) async {
      final gateway = FakeInvoices();
      final app = await mount(tester, _Auth(_customer), gateway);
      app.router.go('/account');
      await tester.pumpAndSettle();
      await tester.tap(find.text('Hóa đơn của tôi'));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('invoice-9')), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('invoice-9')));
      await tester.pumpAndSettle();
      expect(find.text('Chi tiết hóa đơn'), findsOneWidget);
      expect(
        tester.widget<NavigationBar>(find.byType(NavigationBar)).selectedIndex,
        4,
      );
      await tester.tap(find.byTooltip('Quay lại'));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('invoice-9')), findsOneWidget);
      expect(gateway.calls, greaterThanOrEqualTo(3));
    },
  );

  testWidgets(
    'guest deep link returns to detail after login and logout hides invoices',
    (tester) async {
      final auth = _Auth(null);
      final gateway = FakeInvoices();
      final app = await mount(tester, auth, gateway);
      app.router.go('/invoices/9');
      await tester.pumpAndSettle();
      expect(app.router.routeInformationProvider.value.uri.path, '/login');
      expect(
        app
            .router
            .routeInformationProvider
            .value
            .uri
            .queryParameters['returnTo'],
        '/invoices/9',
      );
      expect(gateway.calls, 0);
      auth.change(_customer);
      await tester.pumpAndSettle();
      expect(app.router.routeInformationProvider.value.uri.path, '/invoices/9');
      expect(find.text('Hóa đơn #9'), findsOneWidget);
      auth.change(null);
      await tester.pumpAndSettle();
      expect(find.text('Hóa đơn #9'), findsNothing);
      expect(app.router.routeInformationProvider.value.uri.path, '/login');
    },
  );

  testWidgets(
    'technician invoice deep link redirects without loading customer data',
    (tester) async {
      final auth = _Auth(
        const AuthSession(
          accessToken: 'test',
          username: 'technician',
          roles: ['ROLE_TECHNICIAN'],
        ),
      );
      final gateway = FakeInvoices();
      final app = await mount(tester, auth, gateway);
      app.router.go('/invoices/9');
      await tester.pumpAndSettle();
      expect(app.router.routeInformationProvider.value.uri.path, '/technician');
      expect(gateway.calls, 0);
    },
  );

  testWidgets('payment route preserves account shell and clears on logout', (
    tester,
  ) async {
    final auth = _Auth(_customer);
    final app = await mount(tester, auth, FakeInvoices());
    app.router.go('/invoices/9/payment');
    await tester.pumpAndSettle();
    expect(find.text('Thanh toán ngân hàng'), findsOneWidget);
    expect(
      find.text('Garage chưa cấu hình thanh toán ngân hàng.'),
      findsOneWidget,
    );
    expect(find.byType(NavigationBar), findsOneWidget);
    auth.change(null);
    await tester.pumpAndSettle();
    expect(app.router.routeInformationProvider.value.uri.path, '/login');
    expect(find.text('Hóa đơn #9'), findsNothing);
  });
}
