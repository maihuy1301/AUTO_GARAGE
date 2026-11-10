import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:garage_mobile/core/auth/auth_exception.dart';
import 'package:garage_mobile/core/auth/auth_session.dart';
import 'package:garage_mobile/features/notifications/data/fcm_client.dart';
import 'package:garage_mobile/features/notifications/data/push_registration.dart';

class FakePushClient implements PushClient {
  @override
  bool available = true;
  bool granted = true;
  bool deletionFails = false;
  bool auto = false;
  int deleted = 0;
  String token = 'device-token';
  final refresh = StreamController<String>.broadcast();
  @override
  Stream<String> get tokenRefresh => refresh.stream;
  @override
  Future<bool> requestPermission() async => granted;
  @override
  Future<String?> getToken() async => token;
  @override
  Future<void> setAutoInit(bool enabled) async {
    auto = enabled;
  }

  @override
  Future<void> deleteToken() async {
    if (deletionFails) throw StateError('offline');
    deleted++;
  }
}

class FakeRegistrationApi implements PushRegistrationGateway {
  final registered = <(String, String)>[];
  final removed = <(String, String)>[];
  bool removeFails = false;
  bool registerFails = false;
  @override
  Future<void> register(String token, String jwt) async {
    if (registerFails) throw StateError('offline');
    registered.add((token, jwt));
  }

  @override
  Future<void> unregister(String token, String jwt) async {
    if (removeFails) throw StateError('offline');
    removed.add((token, jwt));
  }
}

AuthSession customer(String name) => AuthSession(
  accessToken: '$name-jwt',
  username: name,
  roles: ['ROLE_CUSTOMER'],
);

void main() {
  late FakePushClient client;
  late FakeRegistrationApi api;
  late PushRegistration registration;
  setUp(() {
    client = FakePushClient();
    api = FakeRegistrationApi();
    registration = PushRegistration(client, api);
  });
  tearDown(() async {
    registration.dispose();
    await client.refresh.close();
  });

  test('registration binds captured JWT and refreshes changed token', () async {
    registration.setSession(customer('first'));
    await registration.retry();
    expect(api.registered.last, ('device-token', 'first-jwt'));
    client.token = 'rotated';
    client.refresh.add('rotated');
    await Future<void>.delayed(Duration.zero);
    await registration.retry();
    expect(api.registered.last, ('rotated', 'first-jwt'));
    expect(api.removed, contains(('device-token', 'first-jwt')));
  });
  test('account switch unregisters old token using old JWT', () async {
    registration.setSession(customer('first'));
    await registration.retry();
    registration.setSession(customer('second'));
    await registration.retry();
    expect(api.removed, contains(('device-token', 'first-jwt')));
    expect(api.registered.last.$2, 'second-jwt');
  });
  test('denied permission does not register a device', () async {
    client.granted = false;
    registration.setSession(customer('first'));
    await registration.retry();
    expect(api.registered, isEmpty);
    expect(client.auto, isFalse);
  });
  test('missing Firebase config leaves inbox-only operation', () async {
    client.available = false;
    registration.setSession(customer('first'));
    await registration.retry();
    await registration.logout();
    expect(api.registered, isEmpty);
  });
  test('logout unregisters and deletes the FCM token', () async {
    registration.setSession(customer('first'));
    await registration.retry();
    await registration.logout();
    expect(api.removed.last, ('device-token', 'first-jwt'));
    expect(client.auto, isFalse);
    expect(client.deleted, greaterThan(0));
  });
  test('offline backend still permits logout if FCM revokes token', () async {
    registration.setSession(customer('first'));
    await registration.retry();
    api.removeFails = true;
    await registration.logout();
    expect(client.auto, isFalse);
  });
  test(
    'failed revocation retries removal without re-registering logged-out user',
    () async {
      registration.setSession(customer('first'));
      await registration.retry();
      api.removeFails = true;
      client.deletionFails = true;
      final registrationsBeforeLogout = api.registered.length;
      await expectLater(registration.logout(), throwsA(isA<AuthException>()));
      api.removeFails = false;
      client.deletionFails = false;
      await registration.retry();
      expect(api.registered.length, registrationsBeforeLogout);
      expect(client.auto, isFalse);
      expect(api.removed.last, ('device-token', 'first-jwt'));
    },
  );
  test(
    'failed registration retries without exposing token in errors',
    () async {
      api.registerFails = true;
      registration.setSession(customer('first'));
      await registration.retry();
      api.registerFails = false;
      await registration.retry();
      expect(api.registered.last, ('device-token', 'first-jwt'));
    },
  );
}
