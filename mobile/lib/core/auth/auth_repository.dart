import 'package:dio/dio.dart';

import '../api/api_client.dart';
import '../storage/secure_session_storage.dart';
import 'auth_exception.dart';
import 'auth_session.dart';
import 'jwt_decoder.dart';

class AuthRepository {
  const AuthRepository(this._apiClient, this._sessionStorage);

  final ApiClient _apiClient;
  final SecureSessionStorage _sessionStorage;

  Future<AuthSession?> restoreSession() async {
    try {
      final token = await _sessionStorage.readToken();
      if (token == null || token.isEmpty) return null;

      try {
        final payload = JwtDecoder.decode(token);
        if (payload.isExpired) {
          await _sessionStorage.clear();
          return null;
        }
        final response = await _apiClient.dio.get<Map<String, dynamic>>(
          '/auth/me',
        );
        final currentUser = response.data?['data'];
        return _sessionFromToken(
          token,
          userData: currentUser is Map<String, dynamic> ? currentUser : null,
        );
      } on DioException catch (error) {
        if (error.response?.statusCode == 401 ||
            error.response?.statusCode == 403) {
          await _sessionStorage.clear();
          return null;
        }
        return _sessionFromToken(token);
      } on FormatException {
        await _sessionStorage.clear();
        return null;
      }
    } catch (_) {
      return null;
    }
  }

  Future<AuthSession> login({
    required String username,
    required String password,
  }) async {
    try {
      final response = await _apiClient.dio.post<Map<String, dynamic>>(
        '/auth/login',
        data: {'tenDangNhap': username.trim(), 'matKhau': password},
      );
      final envelope = response.data;
      final data = envelope?['data'];
      if (envelope?['success'] != true || data is! Map<String, dynamic>) {
        throw AuthException(
          envelope?['message']?.toString() ??
              'Phản hồi đăng nhập không hợp lệ.',
        );
      }

      final token = data['accessToken']?.toString();
      if (token == null || token.isEmpty) {
        throw const AuthException('Máy chủ không trả về access token.');
      }
      final payload = JwtDecoder.decode(token);
      final session = AuthSession(
        accessToken: token,
        userId: (data['maNguoiDung'] as num?)?.toInt(),
        username: data['tenDangNhap']?.toString() ?? payload.subject,
        fullName: data['hoTen']?.toString(),
        roles: payload.roles,
        hasPin: data['hasPin'] == true,
      );
      await _sessionStorage.writeToken(token);
      return session;
    } on AuthException {
      rethrow;
    } on DioException catch (error) {
      if (error.response?.statusCode == 401) {
        throw const AuthException('Tên đăng nhập hoặc mật khẩu không đúng.');
      }
      throw AuthException(_messageFor(error));
    } on FormatException {
      throw const AuthException('Access token từ máy chủ không hợp lệ.');
    }
  }

  Future<void> registerCustomer({
    required String fullName,
    required String phoneNumber,
    String? email,
    required String password,
    required bool acceptedTerms,
  }) async {
    try {
      final normalizedEmail = email?.trim();
      final response = await _apiClient.dio.post<Map<String, dynamic>>(
        '/auth/register',
        data: {
          'hoTen': fullName.trim(),
          'soDienThoai': phoneNumber.trim(),
          'email': normalizedEmail == null || normalizedEmail.isEmpty
              ? null
              : normalizedEmail,
          'matKhau': password,
          'dongYDieuKhoan': acceptedTerms,
        },
      );
      final envelope = response.data;
      if (envelope?['success'] != true ||
          envelope?['data'] is! Map<String, dynamic>) {
        throw AuthException(
          envelope?['message']?.toString() ?? 'Phản hồi đăng ký không hợp lệ.',
        );
      }
    } on AuthException {
      rethrow;
    } on DioException catch (error) {
      throw AuthException(_messageFor(error));
    }
  }

  Future<void> logout() => _sessionStorage.clear();

  String _messageFor(DioException error) {
    final body = error.response?.data;
    final serverMessage = body is Map<String, dynamic>
        ? body['message']?.toString()
        : null;
    if (serverMessage != null && serverMessage.isNotEmpty) {
      return serverMessage;
    }

    return 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.';
  }

  AuthSession _sessionFromToken(
    String token, {
    Map<String, dynamic>? userData,
  }) {
    final payload = JwtDecoder.decode(token);
    return AuthSession(
      accessToken: token,
      userId: (userData?['maNguoiDung'] as num?)?.toInt(),
      username: userData?['tenDangNhap']?.toString() ?? payload.subject,
      fullName: userData?['hoTen']?.toString(),
      roles: payload.roles,
      hasPin: userData?['hasPin'] == true,
    );
  }
}
