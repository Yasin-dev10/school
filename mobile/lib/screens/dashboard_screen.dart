import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/teacher_provider.dart';
import '../widgets/theme_toggle_button.dart';
import '../widgets/app_avatar.dart';
import '../widgets/app_card.dart';
import '../widgets/app_loader.dart';
import '../widgets/empty_state.dart';
import '../widgets/section_header.dart';
import '../widgets/stat_card.dart';
import '../widgets/quick_action_button.dart';
import '../utils/app_colors.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';
import 'attendance_screen.dart';
import 'notifications_screen.dart';
import 'assignments/assignment_list_screen.dart';
import 'classes/class_list_screen.dart';
import 'payslips_screen.dart';
import 'certificates/staff_certificates_screen.dart';
import 'students/all_students_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final teacherProvider = Provider.of<TeacherProvider>(
        context,
        listen: false,
      );
      teacherProvider.fetchDashboardData();
      teacherProvider.initializeListeners();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final teacher = Provider.of<TeacherProvider>(context);
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu_rounded),
            onPressed: () => ZoomDrawer.of(context)?.toggle(),
          ),
        ),
        title: const Text('Faculty Portal'),
        actions: [
          const ThemeToggleButton(),
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const NotificationsScreen()),
              );
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () => teacher.fetchDashboardData(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppCard(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Row(
                  children: [
                    AppAvatar(
                      firstName: user?['firstName']?.toString(),
                      lastName: user?['lastName']?.toString(),
                      radius: 30,
                    ),
                    const SizedBox(width: AppSpacing.lg),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Hello, ${user?['firstName'] ?? 'Teacher'}',
                            style: Theme.of(context).textTheme.titleLarge
                                ?.copyWith(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Faculty Member',
                            style: TextStyle(
                              color: AppColors.mutedText(context),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xxxl),
              const SectionHeader(title: 'Quick Overview'),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                crossAxisSpacing: 14,
                mainAxisSpacing: 14,
                childAspectRatio: 1.15,
                children: [
                  StatCard(
                    title: 'Total Students',
                    value: '${teacher.stats?['totalStudents'] ?? 0}',
                    icon: Icons.people_rounded,
                    color: AppColors.accentBlue,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const AllStudentsScreen(),
                        ),
                      );
                    },
                  ),
                  StatCard(
                    title: 'Weekly Hours',
                    value: '${teacher.stats?['weeklyHours'] ?? 0}h',
                    icon: Icons.schedule_rounded,
                    color: AppColors.accentOrange,
                  ),
                  StatCard(
                    title: 'Active Classes',
                    value: '${teacher.stats?['activeClasses'] ?? 0}',
                    icon: Icons.class_rounded,
                    color: AppColors.accentGreen,
                  ),
                  StatCard(
                    title: "Today's Slots",
                    value: '${teacher.stats?['totalSlots'] ?? 0}',
                    icon: Icons.event_note_rounded,
                    color: AppColors.accentPurple,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xxxl),
              const SectionHeader(title: 'Quick Actions'),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  QuickActionButton(
                    label: 'Classes',
                    icon: Icons.school_outlined,
                    color: AppColors.accentOrange,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const ClassListScreen(),
                      ),
                    ),
                  ),
                  QuickActionButton(
                    label: 'Attendance',
                    icon: Icons.fact_check_outlined,
                    color: AppColors.accentBlue,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const AttendanceScreen(),
                      ),
                    ),
                  ),
                  QuickActionButton(
                    label: 'Homework',
                    icon: Icons.assignment_outlined,
                    color: AppColors.accentGreen,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const AssignmentListScreen(),
                      ),
                    ),
                  ),
                  QuickActionButton(
                    label: 'Payslips',
                    icon: Icons.payments_outlined,
                    color: AppColors.accentPurple,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const PayslipsScreen(),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              Align(
                alignment: Alignment.centerLeft,
                child: QuickActionButton(
                  label: 'Certificates',
                  icon: Icons.workspace_premium_outlined,
                  color: AppColors.accentCyan,
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const StaffCertificatesScreen(),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xxxl),
              SectionHeader(
                title: "Today's Schedule",
                actionLabel: 'Mark Attendance',
                onAction: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const AttendanceScreen(),
                    ),
                  );
                },
              ),
              if (teacher.isLoading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 32),
                  child: AppLoader(message: 'Loading schedule…'),
                )
              else if (teacher.schedule.isEmpty)
                const EmptyState(
                  icon: Icons.event_busy_outlined,
                  title: 'No classes today',
                  subtitle: 'Your schedule for today is clear.',
                )
              else
                ...teacher.schedule.map(
                  (slot) => _ScheduleTile(
                    subject: slot['subject']['name'] ?? 'Unknown Subject',
                    className:
                        '${slot['class']['name']} ${slot['class']['section']}',
                    time: '${slot['startTime']} - ${slot['endTime']}',
                    room: slot['room'] ?? 'TBD',
                  ),
                ),
              const SizedBox(height: AppSpacing.xxl),
              SectionHeader(
                title: 'Recent Announcements',
                actionLabel: 'See All',
                onAction: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const NotificationsScreen(),
                    ),
                  );
                },
              ),
              if (teacher.notifications.isEmpty)
                const EmptyState(
                  icon: Icons.campaign_outlined,
                  title: 'No announcements',
                  subtitle: 'New school notices will show up here.',
                  iconSize: 36,
                )
              else
                ...teacher.notifications.take(3).map(
                      (notif) => _NotificationTile(
                        title: notif['title'] ?? 'No Title',
                        message: notif['message'] ?? '',
                      ),
                    ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ScheduleTile extends StatelessWidget {
  final String subject;
  final String className;
  final String time;
  final String room;

  const _ScheduleTile({
    required this.subject,
    required this.className,
    required this.time,
    required this.room,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.softFill(context, AppColors.primary),
              borderRadius: BorderRadius.circular(AppRadii.lg),
            ),
            child: const Icon(Icons.school_rounded, color: AppColors.primary),
          ),
          const SizedBox(width: AppSpacing.lg),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  subject,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 2),
                Text(
                  '$className • $room',
                  style: TextStyle(
                    color: AppColors.mutedText(context),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.softFill(context, AppColors.primary),
              borderRadius: BorderRadius.circular(AppRadii.sm),
            ),
            child: Text(
              time,
              style: const TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.w700,
                fontSize: 10,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final String title;
  final String message;

  const _NotificationTile({required this.title, required this.message});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: const EdgeInsets.all(AppSpacing.lg),
      elevated: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
          ),
          const SizedBox(height: 4),
          Text(
            message,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: AppColors.mutedText(context),
              fontSize: 12,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}
