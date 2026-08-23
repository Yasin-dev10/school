import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/auth_provider.dart';
import '../providers/teacher_provider.dart';
import '../providers/student_provider.dart';
import '../utils/app_colors.dart';
import '../widgets/app_card.dart';
import '../widgets/app_loader.dart';
import '../widgets/empty_state.dart';
import 'package:flutter_zoom_drawer/flutter_zoom_drawer.dart';
import '../services/push_notification_service.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  List<dynamic> _notificationsForRole(BuildContext context) {
    final role = Provider.of<AuthProvider>(context, listen: false).user?['role'];
    if (role == 'student') {
      return Provider.of<StudentProvider>(context).notifications;
    }
    return Provider.of<TeacherProvider>(context).notifications;
  }

  bool _isLoading(BuildContext context) {
    final role = Provider.of<AuthProvider>(context, listen: false).user?['role'];
    if (role == 'student') {
      return Provider.of<StudentProvider>(context).isLoading;
    }
    return Provider.of<TeacherProvider>(context).isLoading;
  }

  Future<void> _refresh(BuildContext context) async {
    final role = Provider.of<AuthProvider>(context, listen: false).user?['role'];
    if (role == 'student') {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final classId = auth.user?['profile']?['class'];
      await Provider.of<StudentProvider>(
        context,
        listen: false,
      ).fetchDashboardData(classId);
    } else {
      await Provider.of<TeacherProvider>(
        context,
        listen: false,
      ).fetchDashboardData();
    }
  }

  Future<void> _showPreferences(BuildContext context) async {
    final preferences = await PushNotificationService.instance.getPreferences();
    if (!context.mounted) return;
    if (preferences == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not load notification preferences')));
      return;
    }
    final options = <String, String>{
      'pushEnabled': 'Push notifications',
      'attendanceAlerts': 'Attendance alerts',
      'examResultAlerts': 'Exam result alerts',
      'assignmentAlerts': 'Assignment alerts',
      'feeAlerts': 'Fee reminders',
      'announcementAlerts': 'Announcements',
    };
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setModalState) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Notification preferences', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                ...options.entries.map((option) => SwitchListTile.adaptive(
                  contentPadding: EdgeInsets.zero,
                  title: Text(option.value),
                  value: preferences[option.key] != false,
                  onChanged: (value) async {
                    setModalState(() => preferences[option.key] = value);
                    final saved = await PushNotificationService.instance.updatePreferences({option.key: value});
                    if (!saved && context.mounted) {
                      setModalState(() => preferences[option.key] = !value);
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not save preference')));
                    }
                  },
                )),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Rebuild when either provider changes
    Provider.of<TeacherProvider>(context);
    Provider.of<StudentProvider>(context);

    final notifications = _notificationsForRole(context);
    final loading = _isLoading(context);

    return Scaffold(
      appBar: AppBar(
        actions: [
          IconButton(
            tooltip: 'Notification preferences',
            icon: const Icon(Icons.tune_rounded),
            onPressed: () => _showPreferences(context),
          ),
        ],
        leading: Builder(
          builder: (context) {
            final drawer = ZoomDrawer.of(context);
            if (drawer != null) {
              return IconButton(
                icon: const Icon(Icons.menu_rounded),
                onPressed: () => drawer.toggle(),
              );
            }
            return IconButton(
              icon: const Icon(Icons.arrow_back_rounded),
              onPressed: () => Navigator.of(context).maybePop(),
            );
          },
        ),
        title: const Text('Announcements'),
      ),
      body: loading && notifications.isEmpty
          ? const AppLoader(message: 'Loading announcements…')
          : notifications.isEmpty
          ? EmptyState(
              icon: Icons.campaign_outlined,
              title: 'No announcements yet',
              subtitle: 'When the school posts a notice, it will show up here.',
              actionLabel: 'Refresh',
              onAction: () => _refresh(context),
            )
          : RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () => _refresh(context),
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                itemCount: notifications.length,
                itemBuilder: (context, index) {
                  final notif = notifications[index];
                  final date =
                      DateTime.tryParse(notif['createdAt'] ?? '') ??
                      DateTime.now();
                  final formattedDate = DateFormat(
                    'MMM d, y • h:mm a',
                  ).format(date);
                  final type =
                      notif['type']?.toString().toUpperCase() ?? 'NOTICE';

                  return AppCard(
                    margin: const EdgeInsets.only(bottom: AppSpacing.md),
                    padding: const EdgeInsets.all(AppSpacing.xl),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.softFill(
                                  context,
                                  AppColors.primary,
                                ),
                                borderRadius: BorderRadius.circular(AppRadii.sm),
                              ),
                              child: Text(
                                type,
                                style: TextStyle(
                                  color: Theme.of(context).colorScheme.primary,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 10,
                                  letterSpacing: 0.4,
                                ),
                              ),
                            ),
                            Text(
                              formattedDate,
                              style: TextStyle(
                                color: AppColors.mutedText(context),
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          notif['title'] ?? 'No Title',
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          notif['message'] ?? '',
                          style: TextStyle(
                            color: AppColors.mutedText(context),
                            fontSize: 14,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
    );
  }
}
