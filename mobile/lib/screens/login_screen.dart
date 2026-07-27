import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/theme_provider.dart';
import '../widgets/theme_toggle_button.dart';
import '../widgets/custom_button.dart';
import '../utils/app_colors.dart';
import 'drawer/zoom_drawer_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscurePassword = true;
  late AnimationController _animController;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOut,
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.06),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _animController, curve: Curves.easeOut));
    _animController.forward();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _animController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.login(
      _emailController.text.trim(),
      _passwordController.text,
    );

    if (!mounted) return;

    if (success) {
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          pageBuilder: (_, __, ___) => const ZoomDrawerScreen(),
          transitionsBuilder: (_, animation, __, child) =>
              FadeTransition(opacity: animation, child: child),
          transitionDuration: const Duration(milliseconds: 350),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            auth.errorMessage ??
                'Login failed. Please check your credentials.',
          ),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final themeProvider = Provider.of<ThemeProvider>(context);
    final isDark = themeProvider.isDarkMode(context);

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: isDark
                ? AppColors.darkGradient
                : [
                    AppColors.primary.withValues(alpha: 0.08),
                    AppColors.accent.withValues(alpha: 0.06),
                    AppColors.grey50,
                  ],
          ),
        ),
        child: SafeArea(
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: SlideTransition(
              position: _slideAnimation,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.xxl),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Align(
                        alignment: Alignment.centerRight,
                        child: ThemeToggleButton(showLabel: true),
                      ),
                      const SizedBox(height: AppSpacing.xxxl),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: AppColors.primaryGradient,
                          ),
                          borderRadius: BorderRadius.circular(AppRadii.lg),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.3),
                              blurRadius: 16,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.school_rounded,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xxl),
                      Text(
                        'Welcome back',
                        style: Theme.of(context).textTheme.headlineMedium
                            ?.copyWith(
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.8,
                            ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'Sign in to your school account — teachers, students, and parents.',
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: AppColors.mutedText(context),
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.huge),
                      TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        autofillHints: const [AutofillHints.email],
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Email is required';
                          }
                          if (!value.contains('@')) {
                            return 'Enter a valid email';
                          }
                          return null;
                        },
                        decoration: const InputDecoration(
                          labelText: 'Email address',
                          hintText: 'you@school.edu',
                          prefixIcon: Icon(Icons.email_outlined),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        textInputAction: TextInputAction.done,
                        onFieldSubmitted: (_) => _handleLogin(),
                        autofillHints: const [AutofillHints.password],
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Password is required';
                          }
                          if (value.length < 4) {
                            return 'Password is too short';
                          }
                          return null;
                        },
                        decoration: InputDecoration(
                          labelText: 'Password',
                          prefixIcon: const Icon(Icons.lock_outlined),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                            ),
                            onPressed: () {
                              setState(() {
                                _obscurePassword = !_obscurePassword;
                              });
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xxxl),
                      CustomButton(
                        label: 'Sign in',
                        icon: Icons.arrow_forward_rounded,
                        isLoading: auth.isLoading,
                        onPressed: auth.isLoading ? null : _handleLogin,
                      ),
                      const SizedBox(height: AppSpacing.xxl),
                      Center(
                        child: Text(
                          'Use the same credentials as the web dashboard',
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: AppColors.mutedText(context)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
