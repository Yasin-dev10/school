import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/auth_provider.dart';
import '../utils/app_colors.dart';
import 'login_screen.dart';
import 'drawer/zoom_drawer_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;
  late Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOut),
      ),
    );

    _scaleAnimation = Tween<double>(begin: 0.82, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.7, curve: Curves.easeOutBack),
      ),
    );

    _glowAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.3, 1.0, curve: Curves.easeInOut),
      ),
    );

    _controller.forward();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    await Future.delayed(const Duration(milliseconds: 2200));
    if (!mounted) return;

    final auth = Provider.of<AuthProvider>(context, listen: false);
    await auth.checkAuthStatus();
    if (!mounted) return;

    final next = auth.isAuthenticated
        ? const ZoomDrawerScreen()
        : const LoginScreen();

    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) => next,
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(opacity: animation, child: child);
        },
        transitionDuration: const Duration(milliseconds: 400),
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.darkBackground : AppColors.white;
    final subtitleColor = isDark
        ? AppColors.grey400
        : AppColors.primary.withValues(alpha: 0.65);

    return Scaffold(
      backgroundColor: bg,
      body: Stack(
        children: [
          // Soft brand glow
          AnimatedBuilder(
            animation: _glowAnimation,
            builder: (context, _) {
              return Positioned(
                top: -80,
                right: -60,
                child: Opacity(
                  opacity: 0.35 * _glowAnimation.value,
                  child: Container(
                    width: 260,
                    height: 260,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [
                          AppColors.primary.withValues(alpha: 0.45),
                          AppColors.accent.withValues(alpha: 0.0),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
          Positioned(
            bottom: -40,
            left: -40,
            child: Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.accent.withValues(alpha: isDark ? 0.2 : 0.12),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Center(
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: ScaleTransition(
                scale: _scaleAnimation,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(26),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: AppColors.primaryGradient,
                        ),
                        borderRadius: BorderRadius.circular(28),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.35),
                            blurRadius: 32,
                            offset: const Offset(0, 14),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.school_rounded,
                        size: 56,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 28),
                    Text(
                      'School Registry',
                      style: GoogleFonts.inter(
                        fontSize: 30,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : AppColors.grey900,
                        letterSpacing: -0.8,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Your campus, connected.',
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                        color: subtitleColor,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: 56,
            left: 0,
            right: 0,
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: Column(
                children: [
                  Text(
                    'Getting things ready…',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: AppColors.mutedText(context),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 88),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(AppRadii.full),
                      child: const LinearProgressIndicator(
                        minHeight: 5,
                        backgroundColor: AppColors.grey100,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          AppColors.primary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'v1.0.0',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      color: AppColors.grey400,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
