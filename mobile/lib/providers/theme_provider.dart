import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Theme modes available in the app
enum AppThemeMode { light, dark, system }

/// Provider for managing app theme state
class ThemeProvider extends ChangeNotifier {
  static const String _themeKey = 'app_theme_mode';

  AppThemeMode _themeMode = AppThemeMode.system;
  SharedPreferences? _prefs;

  AppThemeMode get themeMode => _themeMode;

  /// Get Flutter's ThemeMode from AppThemeMode
  ThemeMode get flutterThemeMode {
    switch (_themeMode) {
      case AppThemeMode.light:
        return ThemeMode.light;
      case AppThemeMode.dark:
        return ThemeMode.dark;
      case AppThemeMode.system:
        return ThemeMode.system;
    }
  }

  /// Check if current theme is dark
  bool isDarkMode(BuildContext context) {
    if (_themeMode == AppThemeMode.system) {
      return MediaQuery.of(context).platformBrightness == Brightness.dark;
    }
    return _themeMode == AppThemeMode.dark;
  }

  /// Initialize theme provider
  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    await _loadTheme();
  }

  /// Load saved theme from preferences
  Future<void> _loadTheme() async {
    final savedTheme = _prefs?.getString(_themeKey);
    if (savedTheme != null) {
      _themeMode = AppThemeMode.values.firstWhere(
        (mode) => mode.toString() == savedTheme,
        orElse: () => AppThemeMode.system,
      );
      notifyListeners();
    }
  }

  /// Save theme to preferences
  Future<void> _saveTheme() async {
    await _prefs?.setString(_themeKey, _themeMode.toString());
  }

  /// Set theme mode
  Future<void> setThemeMode(AppThemeMode mode) async {
    if (_themeMode != mode) {
      _themeMode = mode;
      await _saveTheme();
      notifyListeners();
    }
  }

  /// Toggle between light and dark theme
  Future<void> toggleTheme() async {
    if (_themeMode == AppThemeMode.light) {
      await setThemeMode(AppThemeMode.dark);
    } else {
      await setThemeMode(AppThemeMode.light);
    }
  }

  /// Get theme mode display name
  String getThemeModeDisplayName(AppThemeMode mode) {
    switch (mode) {
      case AppThemeMode.light:
        return 'Light';
      case AppThemeMode.dark:
        return 'Dark';
      case AppThemeMode.system:
        return 'System';
    }
  }

  /// Get current theme mode display name
  String get currentThemeDisplayName => getThemeModeDisplayName(_themeMode);

  /// Get theme mode icon
  IconData getThemeModeIcon(AppThemeMode mode) {
    switch (mode) {
      case AppThemeMode.light:
        return Icons.light_mode;
      case AppThemeMode.dark:
        return Icons.dark_mode;
      case AppThemeMode.system:
        return Icons.brightness_auto;
    }
  }

  /// Get current theme mode icon
  IconData get currentThemeIcon => getThemeModeIcon(_themeMode);
}