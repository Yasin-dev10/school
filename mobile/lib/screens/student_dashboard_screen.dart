import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/student_provider.dart';
import '../widgets/theme_toggle_button.dart';
import '../widgets/app_avatar.dart';
import '../widgets/app_card.dart';
import '../widgets/app_loader.dart';
import '../widgets/empty_state.dart';
import '../widgets/section_header.dart';
import '../widgets/quick_action_button.dart';
import '../utils/app_colors.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';
import 'notifications_screen.dart';
import 'assignments/student_assignment_list_screen.dart';
import 'attendance/student_attendance_screen.dart';
import 'timetable/student_timetable_screen.dart';
import 'exams/student_exams_screen.dart';
import 'student/student_fees_screen.dart';

class StudentDashboardScreen extends StatefulWidget {
  const StudentDashboardScreen({super.key});

  @override
  State<StudentDashboardScreen> createState() => _StudentDashboardScreenState();
}

class _StudentDashboardScreenState extends State<StudentDashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final user = auth.user;
      String? classId;
      if (user != null &&
          user['profile'] != null &&
          user['profile']['class'] != null) {
        classId = user['profile']['class'];
      }

      final provider = Provider.of<StudentProvider>(context, listen: false);
      provider.fetchDashboardData(classId);
      provider.fetchAssignments();
      provider.fetchExams();
      provider.fetchCertificates();
      provider.fetchStudentGrades();
      provider.initializeListeners(classId);
    });
  }

  String _classLabel(dynamic user) {
    final profile = user?['profile'];
    if (profile == null) return 'Student';
    final cls = profile['class'];
    final section = profile['section'];
    final className = cls is Map ? (cls['name'] ?? cls.toString()) : cls;
    if (className == null || className.toString().isEmpty) return 'Student';
    if (section != null && section.toString().isNotEmpty) {
      return 'Class $className — $section';
    }
    return 'Class $className';
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final studentProvider = Provider.of<StudentProvider>(context);
    final user = auth.user;

    final now = DateTime.now();
    final todaysSchedule = studentProvider.timetable.where((slot) {
      final slotDay = slot['day']?.toString().toLowerCase();
      return slotDay == _getDayName(now.weekday).toLowerCase();
    }).toList();

    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu_rounded),
            onPressed: () => ZoomDrawer.of(context)?.toggle(),
          ),
        ),
        title: const Text('Student Portal'),
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
        onRefresh: () async {
          String? classId;
          if (user != null && user['profile'] != null) {
            classId = user['profile']['class'];
          }
          await studentProvider.fetchDashboardData(classId);
          await studentProvider.fetchStudentGrades();
        },
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
                            'Hello, ${user?['firstName'] ?? 'Student'}!',
                            style: Theme.of(context).textTheme.titleLarge
                                ?.copyWith(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _classLabel(user),
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
              const SectionHeader(title: 'Quick Actions'),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  QuickActionButton(
                    label: 'Attendance',
                    icon: Icons.calendar_today_rounded,
                    color: AppColors.accentBlue,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const StudentAttendanceScreen(),
                      ),
                    ),
                  ),
                  QuickActionButton(
                    label: 'Timetable',
                    icon: Icons.calendar_month_rounded,
                    color: AppColors.accentPurple,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const StudentTimetableScreen(),
                      ),
                    ),
                  ),
                  QuickActionButton(
                    label: 'Exams',
                    icon: Icons.assignment_turned_in_rounded,
                    color: AppColors.accentOrange,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const StudentExamsScreen(),
                      ),
                    ),
                  ),
                  QuickActionButton(
                    label: 'Fees',
                    icon: Icons.account_balance_wallet_rounded,
                    color: AppColors.accentGreen,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const StudentFeesScreen(),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xxxl),
              const SectionHeader(title: 'Academic Overview'),
              _buildAcademicCard(studentProvider),
              const SizedBox(height: AppSpacing.xxxl),
              const SectionHeader(title: "Today's Schedule"),
              if (studentProvider.isLoading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 32),
                  child: AppLoader(message: 'Loading schedule…'),
                )
              else if (todaysSchedule.isEmpty)
                const EmptyState(
                  icon: Icons.event_busy_outlined,
                  title: 'No classes today',
                  subtitle: 'Enjoy the free time — or catch up on homework.',
                )
              else
                ...todaysSchedule.map(
                  (slot) => _ScheduleTile(
                    subject: slot['subject'] is Map
                        ? (slot['subject']['name'] ?? 'Subject')
                        : 'Subject',
                    time: '${slot['startTime']} - ${slot['endTime']}',
                    room: slot['room'] ?? 'TBD',
                  ),
                ),
              if (studentProvider.assignments.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.xxl),
                SectionHeader(
                  title: 'Assignments Due',
                  actionLabel: 'See All',
                  onAction: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const StudentAssignmentListScreen(),
                    ),
                  ),
                ),
                ...studentProvider.assignments
                    .take(2)
                    .map((a) => _AssignmentTile(assignment: a)),
              ],
              const SizedBox(height: AppSpacing.xxl),
              SectionHeader(
                title: 'Recent Announcements',
                actionLabel: 'See All',
                onAction: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const NotificationsScreen(),
                  ),
                ),
              ),
              if (studentProvider.notifications.isEmpty)
                const EmptyState(
                  icon: Icons.campaign_outlined,
                  title: 'No announcements',
                  subtitle: 'School notices will appear here.',
                  iconSize: 36,
                )
              else
                ...studentProvider.notifications.take(3).map(
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

  Widget _buildAcademicCard(StudentProvider provider) {
    final stats = provider.attendanceStats;
    final percentage = stats?['percentage'] ?? '0';

    return Row(
      children: [
        Expanded(
          child: _MetricBanner(
            label: 'ATTENDANCE',
            value: '$percentage%',
            color: AppColors.accentBlue,
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: _MetricBanner(
            label: 'AVG GRADE',
            value: provider.studentGrades?['cumulativeGpa']?.toString() ?? 'N/A',
            color: AppColors.accentPurple,
          ),
        ),
      ],
    );
  }

  String _getDayName(int weekday) {
    const days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    return days[weekday - 1];
  }
}

class _MetricBanner extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _MetricBanner({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [color, color.withValues(alpha: 0.82)],
        ),
        borderRadius: BorderRadius.circular(AppRadii.xxl),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.28),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.75),
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 26,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _ScheduleTile extends StatelessWidget {
  final String subject;
  final String time;
  final String room;

  const _ScheduleTile({
    required this.subject,
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
            child: const Icon(Icons.book_rounded, color: AppColors.primary),
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
                Text(
                  'Room $room',
                  style: TextStyle(
                    color: AppColors.mutedText(context),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Text(
            time,
            style: const TextStyle(
              color: AppColors.primary,
              fontWeight: FontWeight.w700,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}

class _AssignmentTile extends StatelessWidget {
  final dynamic assignment;

  const _AssignmentTile({required this.assignment});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: const EdgeInsets.all(AppSpacing.lg),
      elevated: false,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.softFill(context, AppColors.danger),
              borderRadius: BorderRadius.circular(AppRadii.md),
            ),
            child: const Icon(
              Icons.assignment_rounded,
              color: AppColors.danger,
              size: 20,
            ),
          ),
          const SizedBox(width: AppSpacing.lg),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  assignment['title'] ?? 'Assignment',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(
                  'Due: ${assignment['dueDate']?.toString().split('T')[0] ?? 'No Date'}',
                  style: TextStyle(
                    color: AppColors.mutedText(context),
                    fontSize: 12,
                  ),
                ),
              ],
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
