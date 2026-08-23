import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/app_config.dart';
import 'providers/auth_provider.dart';
import 'providers/teacher_provider.dart';
import 'providers/student_provider.dart';
import 'providers/parent_provider.dart';
import 'providers/theme_provider.dart';
import 'services/offline_service.dart';
import 'services/connectivity_service.dart';
import 'services/push_notification_service.dart';
import 'screens/splash_screen.dart';
import 'utils/app_themes.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await OfflineService.init();
  await PushNotificationService.instance.initialize();

  debugPrint('Mobile API: ${AppConfig.apiBaseUrl}');
  debugPrint('Mobile Socket: ${AppConfig.socketUrl}');

  // Initialize theme provider
  final themeProvider = ThemeProvider();
  await themeProvider.init();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ConnectivityService()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => TeacherProvider()),
        ChangeNotifierProvider(create: (_) => StudentProvider()),
        ChangeNotifierProvider(create: (_) => ParentProvider()),
        ChangeNotifierProvider.value(value: themeProvider),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<ThemeProvider>(
      builder: (context, themeProvider, child) {
        return MaterialApp(
          navigatorKey: PushNotificationService.navigatorKey,
          title: 'School Registry Mobile',
          debugShowCheckedModeBanner: false,
          theme: AppThemes.lightTheme,
          darkTheme: AppThemes.darkTheme,
          themeMode: themeProvider.flutterThemeMode,
          home: const SplashScreen(),
        );
      },
    );
  }
}
