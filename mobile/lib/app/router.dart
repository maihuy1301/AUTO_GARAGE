import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../features/repair_history/presentation/repair_history_page.dart';

import '../core/auth/auth_controller.dart';
import '../features/appointments/presentation/appointment_booking_page.dart';
import '../features/appointments/presentation/appointment_detail_page.dart';
import '../features/appointments/presentation/appointment_tracking_page.dart';
import '../features/auth/presentation/login_page.dart';
import '../features/auth/presentation/register_page.dart';
import '../features/customer/presentation/account_page.dart';
import '../features/customer/presentation/profile_page.dart';
import '../features/customer/presentation/customer_shell.dart';
import '../features/notifications/presentation/notifications_page.dart';
import '../features/public/presentation/home_page.dart';
import '../features/public/presentation/splash_page.dart';
import '../features/technician/presentation/technician_home_page.dart';
import '../features/technician/presentation/technician_repair_detail_page.dart';
import '../features/vehicles/presentation/vehicles_page.dart';
import '../features/invoices/presentation/invoices_page.dart';
import '../features/invoices/presentation/invoice_payment_page.dart';
import '../features/support_chat/presentation/support_chat_page.dart';
import '../features/repair_chat/presentation/repair_chat_page.dart';

class AppRouter {
  AppRouter(AuthController authController)
    : router = GoRouter(
        initialLocation: '/splash',
        refreshListenable: authController,
        redirect: (context, state) => _redirect(authController, state),
        routes: [
          GoRoute(
            path: '/support-chat',
            builder: (context, state) =>
                SupportChatPage(key: ObjectKey(authController.session)),
          ),
          GoRoute(
            path: '/splash',
            builder: (context, state) => const SplashPage(),
          ),
          GoRoute(
            path: '/login',
            builder: (context, state) => LoginPage(
              returnTo: state.uri.queryParameters['returnTo'],
              initialUsername: state.uri.queryParameters['username'],
              registrationSucceeded:
                  state.uri.queryParameters['registered'] == 'true',
            ),
          ),
          GoRoute(
            path: '/register',
            builder: (context, state) => const RegisterPage(),
          ),
          ShellRoute(
            builder: (context, state, child) =>
                CustomerShell(currentLocation: state.uri.path, child: child),
            routes: [
              GoRoute(path: '/', builder: (context, state) => const HomePage()),
              GoRoute(
                path: '/appointments',
                builder: (context, state) => AppointmentBookingPage(
                  initialVehicleId: int.tryParse(
                    state.uri.queryParameters['vehicleId'] ?? '',
                  ),
                ),
              ),
              GoRoute(
                path: '/tracking',
                builder: (context, state) => const AppointmentTrackingPage(),
                routes: [
                  GoRoute(
                    path: ':appointmentId',
                    builder: (context, state) => AppointmentDetailPage(
                      appointmentId:
                          int.tryParse(
                            state.pathParameters['appointmentId'] ?? '',
                          ) ??
                          -1,
                    ),
                  ),
                ],
              ),
              GoRoute(
                path: '/notifications',
                builder: (context, state) =>
                    NotificationsPage(key: ObjectKey(authController.session)),
              ),
              GoRoute(
                path: '/account',
                builder: (context, state) => const AccountPage(),
                routes: [
                  GoRoute(
                    path: 'repair-history',
                    builder: (context, state) => RepairHistoryPage(
                      key: ObjectKey(authController.session),
                    ),
                    routes: [
                      GoRoute(
                        path: ':receptionId',
                        builder: (context, state) => RepairHistoryPage(
                          key: ValueKey((
                            authController.session,
                            state.pathParameters['receptionId'],
                          )),
                          receptionId:
                              int.tryParse(
                                state.pathParameters['receptionId'] ?? '',
                              ) ??
                              -1,
                        ),
                      ),
                    ],
                  ),
                  GoRoute(
                    path: 'profile',
                    builder: (context, state) {
                      final token = authController.session?.accessToken ?? '';
                      return ProfilePage(
                        key: ValueKey(token),
                        onSaved: (profile) => authController.updateProfileName(
                          token,
                          profile.name,
                        ),
                      );
                    },
                  ),
                ],
              ),
              GoRoute(
                path: '/vehicles',
                builder: (context, state) => const VehiclesPage(),
              ),
              GoRoute(
                path: '/invoices',
                builder: (context, state) =>
                    InvoicesPage(key: ObjectKey(authController.session)),
                routes: [
                  GoRoute(
                    path: ':invoiceId',
                    routes: [
                      GoRoute(
                        path: 'payment',
                        builder: (context, state) => InvoicePaymentPage(
                          key: ValueKey((
                            authController.session,
                            state.pathParameters['invoiceId'],
                            'payment',
                          )),
                          invoiceId:
                              int.tryParse(
                                state.pathParameters['invoiceId'] ?? '',
                              ) ??
                              -1,
                        ),
                      ),
                    ],
                    builder: (context, state) => InvoicesPage(
                      key: ValueKey((
                        authController.session,
                        state.pathParameters['invoiceId'],
                      )),
                      invoiceId:
                          int.tryParse(
                            state.pathParameters['invoiceId'] ?? '',
                          ) ??
                          -1,
                    ),
                  ),
                ],
              ),
            ],
          ),
          GoRoute(
            path: '/technician',
            builder: (context, state) => const TechnicianHomePage(),
            routes: [
              GoRoute(
                path: 'repair-orders/:repairOrderId',
                routes: [
                  GoRoute(
                    path: 'chat',
                    builder: (context, state) => RepairChatPage(
                      key: ValueKey((
                        authController.session,
                        state.pathParameters['repairOrderId'],
                        'repair-chat',
                      )),
                      orderId:
                          int.tryParse(
                            state.pathParameters['repairOrderId'] ?? '',
                          ) ??
                          -1,
                    ),
                  ),
                ],
                builder: (context, state) => TechnicianRepairDetailPage(
                  repairOrderId:
                      int.tryParse(
                        state.pathParameters['repairOrderId'] ?? '',
                      ) ??
                      -1,
                ),
              ),
            ],
          ),
        ],
      );

  final GoRouter router;

  static const _protectedCustomerPaths = {
    '/support-chat',
    '/appointments',
    '/tracking',
    '/notifications',
    '/account',
    '/vehicles',
    '/invoices',
  };

  static String? _redirect(AuthController auth, GoRouterState state) {
    final location = state.uri.path;
    if (!auth.isInitialized) {
      return location == '/splash' ? null : '/splash';
    }

    if (location == '/splash') {
      return auth.session?.isTechnician == true ? '/technician' : '/';
    }

    if (!auth.isAuthenticated && _isProtectedCustomerPath(location)) {
      return Uri(
        path: '/login',
        queryParameters: {'returnTo': state.uri.toString()},
      ).toString();
    }

    if (!auth.isAuthenticated && _isTechnicianPath(location)) {
      return Uri(
        path: '/login',
        queryParameters: {'returnTo': state.uri.toString()},
      ).toString();
    }

    if (auth.isAuthenticated &&
        (location == '/login' || location == '/register')) {
      if (auth.session?.isTechnician == true) return '/technician';
      final returnTo = state.uri.queryParameters['returnTo'];
      return _safeReturnTo(returnTo) ?? '/';
    }

    if (auth.session?.isTechnician == true && !_isTechnicianPath(location)) {
      return '/technician';
    }
    if (auth.session?.isCustomer == true && _isTechnicianPath(location)) {
      return '/';
    }
    return null;
  }

  static bool _isProtectedCustomerPath(String location) {
    return _protectedCustomerPaths.any(
      (path) => location == path || location.startsWith('$path/'),
    );
  }

  static bool _isTechnicianPath(String location) {
    return location == '/technician' || location.startsWith('/technician/');
  }

  static String? _safeReturnTo(String? value) {
    if (value == null || !value.startsWith('/') || value.startsWith('//')) {
      return null;
    }
    return value;
  }
}
