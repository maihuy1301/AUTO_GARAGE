import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

@pragma('vm:entry-point')
Future<void> garageBackgroundMessage(RemoteMessage message) async {
  await Firebase.initializeApp();
  // Android displays notification payloads. Never create a second local alert.
}

abstract interface class PushClient {
  bool get available;
  Stream<String> get tokenRefresh;
  Future<bool> requestPermission();
  Future<void> setAutoInit(bool enabled);
  Future<String?> getToken();
  Future<void> deleteToken();
}

class FcmClient implements PushClient {
  bool _available = false;
  @override
  bool get available => _available;

  Future<void> initialize() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return;
    try {
      await Firebase.initializeApp().timeout(const Duration(seconds: 3));
      await FirebaseMessaging.instance.setAutoInitEnabled(false);
      FirebaseMessaging.onBackgroundMessage(garageBackgroundMessage);
      _available = true;
    } on Object {
      debugPrint(
        'FCM not configured; the REST notification inbox remains available.',
      );
    }
  }

  @override
  Stream<String> get tokenRefresh => FirebaseMessaging.instance.onTokenRefresh;
  @override
  Future<bool> requestPermission() async {
    final settings = await FirebaseMessaging.instance.requestPermission();
    return settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional;
  }

  @override
  Future<void> setAutoInit(bool enabled) =>
      FirebaseMessaging.instance.setAutoInitEnabled(enabled);
  @override
  Future<String?> getToken() => FirebaseMessaging.instance.getToken();
  @override
  Future<void> deleteToken() => FirebaseMessaging.instance.deleteToken();
}
