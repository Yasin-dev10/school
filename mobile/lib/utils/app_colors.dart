import 'package:flutter/material.dart';

/// Brand colors and semantic tokens for School Registry.
class AppColors {
  // Primary
  static const Color primary = Color(0xFF6366F1);
  static const Color primaryLight = Color(0xFF818CF8);
  static const Color primaryDark = Color(0xFF4F46E5);

  // Secondary
  static const Color secondary = Color(0xFF10B981);
  static const Color secondaryLight = Color(0xFF34D399);
  static const Color secondaryDark = Color(0xFF059669);

  // Accent (violet in brand gradient)
  static const Color accent = Color(0xFF8B5CF6);

  // Neutrals
  static const Color white = Color(0xFFFFFFFF);
  static const Color black = Color(0xFF000000);
  static const Color grey50 = Color(0xFFF9FAFB);
  static const Color grey100 = Color(0xFFF3F4F6);
  static const Color grey200 = Color(0xFFE5E7EB);
  static const Color grey300 = Color(0xFFD1D5DB);
  static const Color grey400 = Color(0xFF9CA3AF);
  static const Color grey500 = Color(0xFF6B7280);
  static const Color grey600 = Color(0xFF4B5563);
  static const Color grey700 = Color(0xFF374151);
  static const Color grey800 = Color(0xFF1F2937);
  static const Color grey900 = Color(0xFF111827);

  // Dark surfaces
  static const Color darkBackground = Color(0xFF0F172A);
  static const Color darkSurface = Color(0xFF1E293B);
  static const Color darkCard = Color(0xFF334155);
  static const Color drawerBackground = Color(0xFF1E1E2D);

  // Status
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);
  static const Color danger = Color(0xFFF43F5E);

  // Accent palette for quick actions / stats
  static const Color accentBlue = Color(0xFF3B82F6);
  static const Color accentOrange = Color(0xFFF59E0B);
  static const Color accentGreen = Color(0xFF10B981);
  static const Color accentPurple = Color(0xFF8B5CF6);
  static const Color accentCyan = Color(0xFF06B6D4);

  static const List<Color> primaryGradient = [
    Color(0xFF6366F1),
    Color(0xFF8B5CF6),
  ];

  static const List<Color> darkGradient = [
    Color(0xFF0F172A),
    Color(0xFF1E293B),
    Color(0xFF0F172A),
  ];

  /// Theme-aware card / surface fill (replaces glass `white@5%`).
  static Color card(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return isDark ? darkSurface : white;
  }

  static Color cardBorder(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return isDark
        ? white.withValues(alpha: 0.08)
        : grey200.withValues(alpha: 0.9);
  }

  static Color mutedText(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return isDark ? grey400 : grey500;
  }

  static Color softFill(BuildContext context, Color color) {
    return color.withValues(
      alpha: Theme.of(context).brightness == Brightness.dark ? 0.18 : 0.12,
    );
  }

  static List<BoxShadow> cardShadow(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    if (isDark) {
      return [
        BoxShadow(
          color: black.withValues(alpha: 0.25),
          blurRadius: 16,
          offset: const Offset(0, 8),
        ),
      ];
    }
    return [
      BoxShadow(
        color: primary.withValues(alpha: 0.06),
        blurRadius: 20,
        offset: const Offset(0, 8),
      ),
      BoxShadow(
        color: grey900.withValues(alpha: 0.04),
        blurRadius: 8,
        offset: const Offset(0, 2),
      ),
    ];
  }
}

/// Spacing scale (4pt base).
class AppSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double xxxl = 32;
  static const double huge = 48;
}

/// Corner radii.
class AppRadii {
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double full = 999;
}

class AppColorSchemes {
  static ColorScheme lightColorScheme = ColorScheme.fromSeed(
    seedColor: AppColors.primary,
    brightness: Brightness.light,
    primary: AppColors.primary,
    secondary: AppColors.secondary,
    surface: AppColors.white,
    error: AppColors.error,
  ).copyWith(surfaceContainerLowest: AppColors.grey50);

  static ColorScheme darkColorScheme = ColorScheme.fromSeed(
    seedColor: AppColors.primary,
    brightness: Brightness.dark,
    primary: AppColors.primaryLight,
    secondary: AppColors.secondaryLight,
    surface: AppColors.darkSurface,
    error: AppColors.error,
  ).copyWith(surfaceContainerLowest: AppColors.darkBackground);
}
