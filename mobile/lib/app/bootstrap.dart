import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:provider/provider.dart';

import '../core/api/api_client.dart';
import '../core/auth/auth_controller.dart';
import '../core/auth/auth_repository.dart';
import '../core/config/app_config.dart';
import '../core/storage/secure_session_storage.dart';
import '../features/appointments/data/appointment_service.dart';
import '../features/notifications/data/notification_events.dart';
import '../features/notifications/data/notification_service.dart';
import '../features/notifications/data/fcm_client.dart';
import '../features/notifications/data/push_registration.dart';
import '../features/technician/data/technician_service.dart';
import '../features/repair_chat/data/repair_chat_service.dart';
import '../features/vehicles/data/vehicle_service.dart';
import '../features/invoices/data/invoice_service.dart';
import '../features/invoices/data/payment_service.dart';
import '../features/customer/data/profile_service.dart';
import 'app.dart';
import '../features/repair_history/data/repair_history_service.dart';
import '../features/support_chat/data/support_chat_service.dart';
import '../features/support_chat/presentation/support_chat_controller.dart';

Future<void> bootstrap() async {
  const secureStorage = FlutterSecureStorage();
  final sessionStorage = SecureSessionStorage(secureStorage);
  final apiClient = ApiClient(
    Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 12),
        receiveTimeout: const Duration(seconds: 12),
        headers: const {'Accept': 'application/json'},
      ),
    ),
    sessionStorage,
  );
  final fcm = FcmClient();
  await fcm.initialize();
  final push = PushRegistration(fcm, PushRegistrationApi(apiClient));
  final authController = AuthController(
    AuthRepository(apiClient, sessionStorage),
    beforeLogout: push.logout,
  );

  runApp(
    MultiProvider(
      providers: [
        Provider<PushRegistration>.value(value: push),
        ChangeNotifierProvider.value(value: authController),
        ChangeNotifierProxyProvider<AuthController, SupportChatController>(
          create: (_) => SupportChatController(
            SupportChatService(apiClient),
            StompSupportEvents(AppConfig.apiBaseUrl),
          ),
          update: (_, auth, chat) => chat!
            ..bind(
              auth.session?.isCustomer == true
                  ? auth.session!.accessToken
                  : null,
            ),
        ),
        Provider<NotificationGateway>(
          create: (_) => NotificationService(apiClient),
        ),
        Provider<NotificationEvents>(
          create: (_) =>
              StompNotificationEvents(AppConfig.apiBaseUrl, sessionStorage),
        ),
        Provider<AppointmentGateway>(
          create: (_) => AppointmentService(apiClient),
        ),
        Provider<TechnicianGateway>(
          create: (_) => TechnicianService(apiClient),
        ),
        Provider<RepairChatGateway>(
          create: (_) => RepairChatService(apiClient),
        ),
        Provider<VehicleGateway>(create: (_) => VehicleService(apiClient)),
        Provider<RepairHistoryGateway>(
          create: (_) => RepairHistoryService(apiClient),
        ),
        Provider<InvoiceGateway>(create: (_) => InvoiceService(apiClient)),
        Provider<PaymentGateway>(create: (_) => PaymentService(apiClient)),
        Provider<ProfileGateway>(create: (_) => ProfileService(apiClient)),
      ],
      child: const GarageApp(),
    ),
  );

  await authController.restoreSession(
    minimumSplashDuration: const Duration(milliseconds: 1600),
  );
}
