import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:garage_mobile/core/api/api_client.dart';
import 'package:garage_mobile/core/auth/auth_controller.dart';
import 'package:garage_mobile/core/auth/auth_repository.dart';
import 'package:garage_mobile/core/auth/auth_session.dart';
import 'package:garage_mobile/core/storage/secure_session_storage.dart';

const storage = SecureSessionStorage(FlutterSecureStorage());

class SessionRepository extends AuthRepository {
  SessionRepository() : super(ApiClient(Dio(), storage), storage);
  @override
  Future<AuthSession?> restoreSession() async => const AuthSession(
    accessToken: 'test-token',
    username: 'customer',
    roles: ['ROLE_CUSTOMER'],
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(
    () => FlutterSecureStorage.setMockInitialValues({
      'garage_access_token': 'test-token',
    }),
  );

  for (final synchronous in [true, false]) {
    test(
      'logout clears persisted token despite push failure (sync=$synchronous)',
      () async {
        final auth = AuthController(
          SessionRepository(),
          beforeLogout: () {
            if (synchronous) throw StateError('offline');
            return Future<void>.error(StateError('offline'));
          },
        );
        addTearDown(auth.dispose);
        await auth.restoreSession();
        expect(auth.isAuthenticated, isTrue);
        await auth.logout();
        expect(auth.session, isNull);
        expect(await storage.readToken(), isNull);
      },
    );
  }

  test(
    'pending push cleanup cannot hold local logout or restore session later',
    () async {
      final pending = Completer<void>();
      final auth = AuthController(
        SessionRepository(),
        beforeLogout: () => pending.future,
      );
      addTearDown(auth.dispose);
      await auth.restoreSession();
      await auth.logout().timeout(const Duration(seconds: 1));
      expect(auth.isAuthenticated, isFalse);
      expect(await storage.readToken(), isNull);
      pending.completeError(StateError('still offline'));
      await Future<void>.delayed(Duration.zero);
      expect(auth.session, isNull);
    },
  );
}
