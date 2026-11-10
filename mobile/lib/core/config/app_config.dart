import 'package:flutter/foundation.dart';

abstract final class AppConfig {
  static const _fromEnv = String.fromEnvironment('API_BASE_URL');
  static String get apiBaseUrl {
    // 1. Nếu có truyền biến môi trường từ ngoài vào thì ưu tiên dùng
    if (_fromEnv.isNotEmpty) return _fromEnv;
    // 2. Nếu đang chạy trên Trình duyệt Web / Chrome -> dùng localhost
    if (kIsWeb) return 'http://localhost:8080/api';
    // Local Android development defaults to USB (run connect-usb.ps1 first).
    // Emulator profile explicitly supplies http://10.0.2.2:8080/api.
    return 'http://127.0.0.1:8080/api';
  }
}
