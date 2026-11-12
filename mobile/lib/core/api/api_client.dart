import 'package:dio/dio.dart';

import '../storage/secure_session_storage.dart';

class ApiClient {
  ApiClient(this.dio, SecureSessionStorage sessionStorage) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await sessionStorage.readToken();
          if (token != null &&
              token.isNotEmpty &&
              !options.headers.containsKey('Authorization')) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final options = error.requestOptions;
          final isConnectionIssue =
              error.type == DioExceptionType.connectionError ||
              error.type == DioExceptionType.connectionTimeout;
          final alreadyRetried = options.extra['_retriedHostFallback'] == true;

          if (isConnectionIssue && !alreadyRetried) {
            final currentBase = options.baseUrl;
            String? fallbackBase;
            if (currentBase.contains('://10.0.2.2:')) {
              fallbackBase = currentBase.replaceFirst('://10.0.2.2:', '://127.0.0.1:');
            } else if (currentBase.contains('://127.0.0.1:')) {
              fallbackBase = currentBase.replaceFirst('://127.0.0.1:', '://10.0.2.2:');
            }

            if (fallbackBase != null) {
              options.extra['_retriedHostFallback'] = true;
              options.baseUrl = fallbackBase;
              dio.options.baseUrl = fallbackBase;
              try {
                final response = await dio.fetch(options);
                return handler.resolve(response);
              } on DioException catch (retryError) {
                return handler.next(retryError);
              }
            }
          }
          handler.next(error);
        },
      ),
    );
  }

  final Dio dio;
}
