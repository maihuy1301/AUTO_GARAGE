import 'package:flutter/foundation.dart';

abstract final class AppConfig {
  static const _fromEnv = String.fromEnvironment('API_BASE_URL');
  static String get apiBaseUrl {
    // 1. Nếu có truyền biến môi trường từ ngoài vào thì ưu tiên dùng
    if (_fromEnv.isNotEmpty) return _fromEnv;
    // 2. Nếu đang chạy trên Trình duyệt Web / Chrome -> dùng localhost
    if (kIsWeb) return 'http://localhost:8080/api';
    // 3. Mặc định trên Android Emulator dùng 10.0.2.2 (ApiClient sẽ tự động fallback sang 127.0.0.1 nếu cắm cáp USB adb reverse)
    return 'http://10.0.2.2:8080/api';
  }
}
