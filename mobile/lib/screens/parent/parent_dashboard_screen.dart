import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/parent_provider.dart';
import '../../providers/auth_provider.dart';
import '../../utils/app_colors.dart';
import '../../widgets/app_avatar.dart';
import '../../widgets/app_card.dart';
import '../../widgets/app_loader.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/section_header.dart';
import '../../widgets/theme_toggle_button.dart';
import '../profile_screen.dart';
import '../attendance/student_attendance_screen.dart';
import '../timetable/student_timetable_screen.dart';
import '../exams/student_grades_screen.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';

class ParentDashboardScreen extends StatefulWidget {
  const ParentDashboardScreen({super.key});

  @override
  State<ParentDashboardScreen> createState() => _ParentDashboardScreenState();
}

class _ParentDashboardScreenState extends State<ParentDashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<ParentProvider>().fetchMyChildren();
    });
  }

  @override
  Widget build(BuildContext context) {
    final parentProvider = Provider.of<ParentProvider>(context);
    final user = Provider.of<AuthProvider>(context).user;

    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu_rounded),
            onPressed: () {
              final drawer = ZoomDrawer.of(context);
              if (drawer != null) {
                drawer.toggle();
              } else {
                Navigator.of(context).maybePop();
              }
            },
          ),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Parent Portal'),
            Text(
              'Welcome, ${user?['firstName'] ?? ''}',
              style: TextStyle(
                color: AppColors.mutedText(context),
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        actions: [
          const ThemeToggleButton(),
          IconButton(
            icon: Icon(
              Icons.person_outline_rounded,
              color: Theme.of(context).colorScheme.primary,
            ),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ProfileScreen()),
              );
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: parentProvider.isLoading && parentProvider.children.isEmpty
          ? const AppLoader(message: 'Loading children…')
          : RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () => parentProvider.fetchMyChildren(),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildQuickAlerts(context, parentProvider),
                    const SizedBox(height: AppSpacing.xxxl),
                    const SectionHeader(title: 'My Children'),
                    if (parentProvider.children.isEmpty)
                      const EmptyState(
                        icon: Icons.family_restroom_rounded,
                        title: 'No linked children',
                        subtitle:
                            'Ask the school admin to link your account to a student.',
                      )
                    else
                      ...parentProvider.children.map(
                        (child) => _ChildCard(
                          child: child,
                          onTap: () => _showChildActions(child),
                        ),
                      ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildQuickAlerts(BuildContext context, ParentProvider provider) {
    final count = provider.children.length;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: AppColors.primaryGradient,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppRadii.xxl),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Family overview',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  count == 0
                      ? 'Link a student to start tracking progress.'
                      : 'You are following $count ${count == 1 ? 'child' : 'children'}.',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.85),
                    fontSize: 13,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(AppRadii.lg),
            ),
            child: const Icon(
              Icons.verified_user_rounded,
              color: Colors.white,
              size: 28,
            ),
          ),
        ],
      ),
    );
  }

  void _showChildActions(dynamic child) {
    final name = '${child['firstName'] ?? ''}';
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.card(context),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.grey300,
                    borderRadius: BorderRadius.circular(AppRadii.full),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  AppAvatar(
                    firstName: child['firstName']?.toString(),
                    lastName: child['lastName']?.toString(),
                    radius: 22,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      "$name's progress",
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _sheetAction(
                sheetContext,
                Icons.calendar_today_rounded,
                'Attendance',
                AppColors.accentGreen,
                const StudentAttendanceScreen(),
              ),
              _sheetAction(
                sheetContext,
                Icons.analytics_rounded,
                'Grades & reports',
                AppColors.primary,
                const StudentGradesScreen(),
              ),
              _sheetAction(
                sheetContext,
                Icons.timer_rounded,
                'Class timetable',
                AppColors.accentOrange,
                const StudentTimetableScreen(),
              ),
              _sheetAction(
                sheetContext,
                Icons.person_rounded,
                'Profile',
                AppColors.accentPurple,
                const ProfileScreen(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sheetAction(
    BuildContext sheetContext,
    IconData icon,
    String title,
    Color color,
    Widget screen,
  ) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.softFill(context, color),
          borderRadius: BorderRadius.circular(AppRadii.md),
        ),
        child: Icon(icon, color: color, size: 20),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      trailing: Icon(
        Icons.arrow_forward_ios_rounded,
        color: AppColors.mutedText(context),
        size: 14,
      ),
      onTap: () {
        Navigator.pop(sheetContext);
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => screen),
        );
      },
    );
  }
}

class _ChildCard extends StatelessWidget {
  final dynamic child;
  final VoidCallback onTap;

  const _ChildCard({required this.child, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final profile = child['profile'];
    final classLabel = profile is Map
        ? 'Class ${profile['class'] ?? 'N/A'}${profile['section'] != null ? ' — ${profile['section']}' : ''}'
        : 'Student';

    return AppCard(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      onTap: onTap,
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: Row(
        children: [
          AppAvatar(
            firstName: child['firstName']?.toString(),
            lastName: child['lastName']?.toString(),
            radius: 28,
          ),
          const SizedBox(width: AppSpacing.lg),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${child['firstName'] ?? ''} ${child['lastName'] ?? ''}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  classLabel,
                  style: TextStyle(
                    color: AppColors.mutedText(context),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Icon(
            Icons.chevron_right_rounded,
            color: AppColors.mutedText(context),
          ),
        ],
      ),
    );
  }
}
