import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

class OfflineService {
  static const String pendingRequestsBox = 'pending_requests';
  static const String cacheBox = 'app_cache';

  // Cache keys
  static const String kMyClasses = 'my_classes';
  static const String kStudentAttendance = 'student_attendance';
  static const String kDashboardStats = 'dashboard_stats';
  static const String kTimetable = 'timetable';

  static Future<void> init() async {
    await Hive.initFlutter();
    await Hive.openBox(pendingRequestsBox);
    await Hive.openBox(cacheBox);
  }

  // --- Caching Data ---

  static Future<void> cacheData(String key, dynamic data) async {
    final box = Hive.box(cacheBox);
    await box.put(key, jsonEncode(data));
  }

  static Future<dynamic> getCachedData(String key) async {
    final box = Hive.box(cacheBox);
    final data = box.get(key);
    if (data != null) {
      return jsonDecode(data);
    }
    return null;
  }

  // --- Offline Queue ---

  static Future<void> queueRequest({
    required String endpoint,
    required String method,
    required Map<String, dynamic> body,
    required Map<String, String> headers,
  }) async {
    final box = Hive.box(pendingRequestsBox);
    final requestId = const Uuid().v4();
    final request = {
      'id': requestId,
      'endpoint': endpoint,
      'method': method,
      'body': body,
      'headers': headers,
      'timestamp': DateTime.now().toIso8601String(),
    };
    await box.put(requestId, jsonEncode(request));
    debugPrint('Request queued: $endpoint [$method]');
  }

  static List<Map<String, dynamic>> getPendingRequests() {
    final box = Hive.box(pendingRequestsBox);
    final List<Map<String, dynamic>> requests = [];

    for (var i = 0; i < box.length; i++) {
      final requestString = box.getAt(i);
      if (requestString != null) {
        requests.add(jsonDecode(requestString));
      }
    }

    // Sort by timestamp if needed, but FIFO is preserved by Hive indices generally if added sequentially
    return requests;
  }

  static Future<void> removeRequest(String requestId) async {
    final box = Hive.box(pendingRequestsBox);
    await box.delete(requestId);
  }

  static Future<void> clearQueue() async {
    final box = Hive.box(pendingRequestsBox);
    await box.clear();
  }
}