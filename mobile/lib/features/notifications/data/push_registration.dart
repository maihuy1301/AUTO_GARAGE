import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../../../core/api/api_client.dart';
import '../../../core/auth/auth_exception.dart';
import '../../../core/auth/auth_session.dart';
import 'fcm_client.dart';

abstract interface class PushRegistrationGateway {
  Future<void> register(String token, String accessToken);
  Future<void> unregister(String token, String accessToken);
}

class PushRegistrationApi implements PushRegistrationGateway {
  PushRegistrationApi(this.api);
  final ApiClient api;
  @override
  Future<void> register(String token, String accessToken) async {
    await api.dio.post<void>(
      '/notifications/devices',
      data: {'token': token},
      options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
    );
  }

  @override
  Future<void> unregister(String token, String accessToken) async {
    await api.dio.delete<void>(
      '/notifications/devices',
      data: {'token': token},
      options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
    );
  }
}

class PushRegistration {
  PushRegistration(this.client, this.api);
  final PushClient client;
  final PushRegistrationGateway api;
  AuthSession? _bound;
  AuthSession? _desired;
  String? _token;
  StreamSubscription<String>? _refresh;
  Future<void> _queue = Future<void>.value();
  bool _started = false;
  bool get available => client.available;

  void setSession(AuthSession? session) {
    final customer = session?.isCustomer == true ? session : null;
    if (_started && customer?.accessToken == _desired?.accessToken) return;
    _started = true;
    _desired = customer;
    unawaited(retry());
  }

  Future<void> retry() =>
      _enqueue(() async {
        if (!available) return;
        if (_bound?.accessToken != _desired?.accessToken || _desired == null) {
          await _detach();
        }
        final session = _desired;
        if (session == null) return;
        _bound = session;
        if (!await client.requestPermission()) {
          await _detach();
          return;
        }
        await client.setAutoInit(true);
        _refresh ??= client.tokenRefresh.listen((token) {
          unawaited(
            _enqueue(() async {
              if (_bound?.accessToken == session.accessToken) {
                await _register(token);
              }
            }).catchError((Object _) {
              debugPrint('Refreshed push token registration pending.');
            }),
          );
        }, onError: (Object _) {});
        final token = await client.getToken();
        if (token != null) await _register(token);
      }).catchError((Object _) {
        debugPrint(
          'Push registration pending; will retry when the app resumes.',
        );
      });

  Future<void> _register(String token) async {
    final session = _bound;
    if (session == null || session.accessToken != _desired?.accessToken) return;
    final previous = _token;
    _token = token;
    await api.register(token, session.accessToken);
    if (previous != null && previous != token) {
      try {
        await api.unregister(previous, session.accessToken);
      } on Object {
        /* Invalid old tokens are also pruned by the server. */
      }
    }
  }

  Future<void> logout() async {
    _desired = null;
    try {
      await _enqueue(_detach);
    } on Object {
      // Keep the old binding only for revocation retries. Never register it
      // again after the user has requested logout.
      throw const AuthException(
        'Chưa thể ngắt thông báo trên thiết bị. Sẽ thử lại khi có kết nối.',
      );
    }
  }

  Future<void> _detach() async {
    if (!available) return;
    await _refresh?.cancel();
    _refresh = null;
    await client.setAutoInit(false);
    var serverRemoved = false;
    if (_bound != null && _token != null) {
      try {
        await api.unregister(_token!, _bound!.accessToken);
        serverRemoved = true;
      } on Object {
        /* Token deletion below can still revoke delivery. */
      }
    }
    try {
      await client.deleteToken();
    } on Object {
      if (!serverRemoved) rethrow;
    }
    _bound = null;
    _token = null;
  }

  Future<void> _enqueue(Future<void> Function() action) {
    final result = _queue.then((_) => action());
    _queue = result.catchError((Object _) {});
    return result;
  }

  void dispose() {
    unawaited(_refresh?.cancel());
  }
}
