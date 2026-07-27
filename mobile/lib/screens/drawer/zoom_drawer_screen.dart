import 'package:flutter/material.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../dashboard_screen.dart';
import '../student_dashboard_screen.dart';
import '../parent/parent_dashboard_screen.dart';
import 'menu_screen.dart';

class ZoomDrawerScreen extends StatefulWidget {
  const ZoomDrawerScreen({super.key});

  @override
  State<ZoomDrawerScreen> createState() => _ZoomDrawerScreenState();
}

class _ZoomDrawerScreenState extends State<ZoomDrawerScreen> {
  final _drawerController = ZoomDrawerController();
  late Widget _currentScreen;
  String _currentTitle = 'Dashboard';

  @override
  void initState() {
    super.initState();
    _initializeScreen();
  }

  void _initializeScreen() {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final role = auth.user?['role'];

    // Set initial screen based on role
    if (role == 'student') {
      _currentScreen = const StudentDashboardScreen();
    } else if (role == 'teacher') {
      _currentScreen = const DashboardScreen();
    } else if (role == 'parent') {
      _currentScreen = ParentDashboardScreen();
    } else {
      _currentScreen = const DashboardScreen();
    }
    _currentTitle = 'Dashboard';
  }

  @override
  Widget build(BuildContext context) {
    return ZoomDrawer(
      controller: _drawerController,
      menuScreen: MenuScreen(
        currentMenuTitle: _currentTitle,
        onMenuItemSelected: (item) {
          setState(() {
            _currentScreen = item.screen;
            _currentTitle = item.title;
          });
          _drawerController.close?.call();
        },
      ),
      mainScreen: _currentScreen,
      borderRadius: 28.0,
      showShadow: true,
      angle: 0.0,
      drawerShadowsBackgroundColor: Colors.black.withValues(alpha: 0.28),
      slideWidth: MediaQuery.of(context).size.width * 0.78,
      menuBackgroundColor: const Color(0xFF1E1E2D),
      mainScreenScale: 0.12,
      duration: const Duration(milliseconds: 280),
      reverseDuration: const Duration(milliseconds: 240),
      openCurve: Curves.fastOutSlowIn,
      closeCurve: Curves.fastOutSlowIn,
    );
  }
}
