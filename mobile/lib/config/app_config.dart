import 'dart:io';

import 'package:flutter/foundation.dart';

/// Shared API configuration so mobile talks to the same backend as the web app.
///
/// Production host matches `frontend/next.config.ts` and `render.yaml`
/// (`https://school-ta8j.onrender.com`).
///
/// Overrides:
/// - `flutter run --dart-define=API_BASE_URL=http://192.168.1.10:5000/api`
/// - `flutter run --dart-define=USE_LOCAL_API=true` (emulator/simulator → local backend)
class AppConfig {
  /// Same Render deployment the Next.js web app uses.
  static const String productionHost = 'https://school-ta8j.onrender.com';
  static const String productionApiBase = '$productionHost/api';

  static const String _apiFromEnv = String.fromEnvironment('API_BASE_URL');
  static const bool useLocalApi = bool.fromEnvironment(
    'USE_LOCAL_API',
    defaultValue: false,
  );

  static String get apiBaseUrl {
    if (_apiFromEnv.isNotEmpty) {
      return _normalizeApiUrl(_apiFromEnv);
    }

    // Default: same production API as the web app so both clients share
    // users, data, and realtime events out of the box.
    if (useLocalApi) {
      return _normalizeApiUrl(_localDevApiUrl);
    }

    return productionApiBase;
  }

  static String get socketUrl {
    return apiBaseUrl.replaceAll(RegExp(r'/api/?$'), '');
  }

  /// Local backend (same port as web `NEXT_PUBLIC_API_URL`).
  static String get _localDevApiUrl {
    if (kIsWeb) return 'http://localhost:5000/api';
    if (Platform.isAndroid) {
      // Android emulator loopback to the host machine.
      return 'http://10.0.2.2:5000/api';
    }
    // iOS simulator / desktop
    return 'http://localhost:5000/api';
  }

  static String _normalizeApiUrl(String url) {
    final trimmed = url.trim().replaceAll(RegExp(r'/+$'), '');
    if (trimmed.endsWith('/api')) return trimmed;
    return '$trimmed/api';
  }
}
