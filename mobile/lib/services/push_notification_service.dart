import 'dart:convert';
import 'dart:io';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'api_service.dart';
import '../screens/notifications_screen.dart';
import '../screens/attendance_screen.dart';
import '../screens/attendance/student_attendance_screen.dart';
import '../screens/assignments/assignment_list_screen.dart';
import '../screens/assignments/student_assignment_list_screen.dart';
import '../screens/exams/student_grades_screen.dart';
import '../screens/student/student_fees_screen.dart';
import '../config/app_config.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  final options = AppConfig.firebaseOptions;
  if (options != null) await Firebase.initializeApp(options: options);
}

class PushNotificationService {
  PushNotificationService._();
  static final instance = PushNotificationService._();
  static final navigatorKey = GlobalKey<NavigatorState>();

  final _api = ApiService();
  FirebaseMessaging? _messaging;
  String? _role;
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;
    final options = AppConfig.firebaseOptions;
    if (options == null) {
      debugPrint(
        'Push notifications disabled: Firebase dart-defines are not configured.',
      );
      return;
    }
    try {
      await Firebase.initializeApp(options: options);
      _messaging = FirebaseMessaging.instance;
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
      await _messaging!.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );
      FirebaseMessaging.onMessageOpenedApp.listen(_openMessage);
      FirebaseMessaging.onMessage.listen((message) {
        final context = navigatorKey.currentContext;
        if (context != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                message.notification?.title ?? 'New notification',
              ),
              action: SnackBarAction(
                label: 'Open',
                onPressed: () => _openMessage(message),
              ),
            ),
          );
        }
      });
      _messaging!.onTokenRefresh.listen((token) => _registerToken(token));
      final initial = await _messaging!.getInitialMessage();
      if (initial != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _openMessage(initial));
      }
      _initialized = true;
    } catch (error) {
      debugPrint('Push notifications are not configured: $error');
    }
  }

  Future<void> syncDeviceToken({required String role}) async {
    _role = role;
    await initialize();
    final token = await _messaging?.getToken(
      vapidKey: kIsWeb && AppConfig.firebaseVapidKey.isNotEmpty
          ? AppConfig.firebaseVapidKey
          : null,
    );
    if (token != null) await _registerToken(token);
  }

  Future<void> _registerToken(String token) async {
    final platform = kIsWeb ? 'web' : Platform.isIOS ? 'ios' : 'android';
    try {
      await _api.post('/notifications/devices/register', {
        'token': token,
        'platform': platform,
        'deviceName': kIsWeb ? 'Web browser' : Platform.operatingSystem,
      });
    } catch (error) {
      debugPrint('Could not register push token: $error');
    }
  }

  Future<void> unregister() async {
    final token = await _messaging?.getToken(
      vapidKey: kIsWeb && AppConfig.firebaseVapidKey.isNotEmpty
          ? AppConfig.firebaseVapidKey
          : null,
    );
    if (token != null) {
      try {
        await _api.post('/notifications/devices/unregister', {'token': token});
      } catch (_) {}
    }
    _role = null;
  }

  void _openMessage(RemoteMessage message) {
    final link = message.data['deepLink']?.toString() ?? '/dashboard/notifications';
    final navigator = navigatorKey.currentState;
    if (navigator == null) return;
    Widget screen;
    if (link.contains('attendance')) {
      screen = _role == 'student' ? const StudentAttendanceScreen() : const AttendanceScreen();
    } else if (link.contains('assignment')) {
      screen = _role == 'student' ? const StudentAssignmentListScreen() : const AssignmentListScreen();
    } else if (link.contains('exam-results')) {
      screen = const StudentGradesScreen();
    } else if (link.contains('student-finance')) {
      screen = const StudentFeesScreen();
    } else {
      screen = const NotificationsScreen();
    }
    navigator.push(MaterialPageRoute(builder: (_) => screen));
  }

  Future<Map<String, dynamic>?> getPreferences() async {
    final response = await _api.get('/notifications/preferences');
    if (response.statusCode != 200) return null;
    return jsonDecode(response.body)['data'] as Map<String, dynamic>?;
  }

  Future<bool> updatePreferences(Map<String, bool> preferences) async {
    final response = await _api.put('/notifications/preferences', preferences);
    return response.statusCode == 200;
  }
}
