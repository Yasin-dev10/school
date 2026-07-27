import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../providers/auth_provider.dart';
import '../dashboard_screen.dart';
import '../attendance_screen.dart';
import '../assignments/assignment_list_screen.dart';
import '../exams/teacher_exams_screen.dart';
import '../timetable/teacher_timetable_screen.dart';
import '../lms/material_list_screen.dart';
import '../payslips_screen.dart';
import '../profile_screen.dart';
import '../notifications_screen.dart';
import '../student_dashboard_screen.dart';
import '../assignments/student_assignment_list_screen.dart';
import '../timetable/student_timetable_screen.dart';
import '../attendance/student_attendance_screen.dart';
import '../exams/student_exams_screen.dart';
import '../materials/student_materials_screen.dart';
import '../student/student_certificates_screen.dart';
import '../exams/student_grades_screen.dart';
import '../student/student_fees_screen.dart';
import '../login_screen.dart';
import '../parent/parent_dashboard_screen.dart';
import '../certificates/staff_certificates_screen.dart';

class MenuItem {
  final String title;
  final IconData icon;
  final Widget screen;

  const MenuItem(this.title, this.icon, this.screen);
}

class MenuScreen extends StatelessWidget {
  final Function(MenuItem) onMenuItemSelected;
  final String currentMenuTitle;

  const MenuScreen({
    super.key,
    required this.onMenuItemSelected,
    required this.currentMenuTitle,
  });

  static List<MenuItem> getMenuItems(String? role) {
    if (role == 'teacher') {
      return [
        const MenuItem('Dashboard', Icons.dashboard_rounded, DashboardScreen()),
        const MenuItem(
          'Attendance',
          Icons.calendar_today_rounded,
          AttendanceScreen(),
        ),
        const MenuItem(
          'Assignments',
          Icons.assignment_rounded,
          AssignmentListScreen(),
        ),
        const MenuItem('Exams', Icons.grade_rounded, TeacherExamsScreen()),
        const MenuItem(
          'Timetable',
          Icons.calendar_month_rounded,
          TeacherTimetableScreen(),
        ),
        const MenuItem(
          'LMS Materials',
          Icons.menu_book_rounded,
          MaterialListScreen(),
        ),
        const MenuItem(
          'Certificates',
          Icons.workspace_premium_rounded,
          StaffCertificatesScreen(),
        ),
        const MenuItem(
          'Payslips',
          Icons.receipt_long_rounded,
          PayslipsScreen(),
        ),
        const MenuItem('Profile', Icons.person_rounded, ProfileScreen()),
        const MenuItem(
          'Notifications',
          Icons.notifications_rounded,
          NotificationsScreen(),
        ),
      ];
    } else if (role == 'student') {
      return [
        const MenuItem(
          'Dashboard',
          Icons.dashboard_rounded,
          StudentDashboardScreen(),
        ),
        const MenuItem(
          'Assignments',
          Icons.assignment_rounded,
          StudentAssignmentListScreen(),
        ),
        const MenuItem(
          'Timetable',
          Icons.calendar_today_rounded,
          StudentTimetableScreen(),
        ),
        const MenuItem(
          'Attendance',
          Icons.check_circle_outline_rounded,
          StudentAttendanceScreen(),
        ),
        const MenuItem(
          'Exams',
          Icons.assignment_turned_in_rounded,
          StudentExamsScreen(),
        ),
        const MenuItem('Grades', Icons.grade_rounded, StudentGradesScreen()),
        const MenuItem(
          'Materials',
          Icons.menu_book_rounded,
          StudentMaterialsScreen(),
        ),
        const MenuItem(
          'Certificates',
          Icons.workspace_premium_rounded,
          StudentCertificatesScreen(),
        ),
        const MenuItem(
          'Fees',
          Icons.account_balance_wallet_rounded,
          StudentFeesScreen(),
        ),
        const MenuItem('Profile', Icons.person_rounded, ProfileScreen()),
        const MenuItem(
          'Notifications',
          Icons.notifications_rounded,
          NotificationsScreen(),
        ),
      ];
    } else if (role == 'parent') {
      return [
        MenuItem('Dashboard', Icons.dashboard_rounded, ParentDashboardScreen()),
        const MenuItem('Profile', Icons.person_rounded, ProfileScreen()),
        const MenuItem(
          'Notifications',
          Icons.notifications_rounded,
          NotificationsScreen(),
        ),
      ];
    }
    return [];
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final role = user?['role'];
    final List<MenuItem> menuItems = getMenuItems(role);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF1E1E2D), Color(0xFF2D2D44)],
          ),
        ),
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(user),
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  itemCount: menuItems.length,
                  itemBuilder: (context, index) {
                    final item = menuItems[index];
                    final isSelected = item.title == currentMenuTitle;
                    return _buildMenuItem(context, item, isSelected);
                  },
                ),
              ),
              _buildLogoutButton(context, auth),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(Map<String, dynamic>? user) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            onMenuItemSelected(
              const MenuItem('Profile', Icons.person_rounded, ProfileScreen()),
            );
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      colors: [Color(0xFF6366F1), Color(0xFF818CF8)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF6366F1).withOpacity(0.3),
                        blurRadius: 12,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: CircleAvatar(
                    radius: 38,
                    backgroundColor: const Color(0xFF2D2D44),
                    child: Text(
                      '${user?['firstName']?[0] ?? ''}',
                      style: GoogleFonts.inter(
                        fontSize: 32,
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  '${user?['firstName'] ?? ''} ${user?['lastName'] ?? ''}',
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFF6366F1).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: const Color(0xFF6366F1).withOpacity(0.3),
                    ),
                  ),
                  child: Text(
                    (user?['role'] ?? '').toString().toUpperCase(),
                    style: GoogleFonts.inter(
                      color: const Color(0xFF818CF8),
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.0,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMenuItem(BuildContext context, MenuItem item, bool isSelected) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12), // Increased spacing
      decoration: BoxDecoration(
        color: isSelected
            ? const Color(0xFF6366F1).withOpacity(0.15)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        border: isSelected
            ? Border.all(
                color: const Color(0xFF6366F1).withOpacity(0.3),
                width: 1,
              )
            : Border.all(color: Colors.transparent),
        boxShadow: isSelected
            ? [
                BoxShadow(
                  color: const Color(0xFF6366F1).withOpacity(0.1),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ]
            : [],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => onMenuItemSelected(item),
          borderRadius: BorderRadius.circular(16),
          splashColor: const Color(0xFF6366F1).withOpacity(0.15),
          highlightColor: const Color(0xFF6366F1).withOpacity(0.08),
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: 20,
              vertical: 16,
            ), // Larger touch target
            child: Row(
              children: [
                Icon(
                  item.icon,
                  color: isSelected
                      ? const Color(0xFF818CF8)
                      : Colors.white.withOpacity(0.6),
                  size: 26, // Slightly larger icon
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    item.title,
                    style: GoogleFonts.inter(
                      color: isSelected
                          ? Colors.white
                          : Colors.white.withOpacity(0.7),
                      fontSize: 17, // Slightly larger text
                      fontWeight: isSelected
                          ? FontWeight.w600
                          : FontWeight.w500,
                      letterSpacing: 0.3,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (isSelected) ...[
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: const Color(0xFF818CF8),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF818CF8).withOpacity(0.4),
                          blurRadius: 6,
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLogoutButton(BuildContext context, AuthProvider auth) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 40), // More bottom padding
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF43F5E).withOpacity(0.3)),
          color: const Color(0xFFF43F5E).withOpacity(0.1),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFF43F5E).withOpacity(0.1),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () async {
              await auth.logout();
              if (context.mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (context) => const LoginScreen()),
                  (route) => false,
                );
              }
            },
            borderRadius: BorderRadius.circular(16),
            splashColor: const Color(0xFFF43F5E).withOpacity(0.2),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center, // Center the text
                children: [
                  Icon(
                    Icons.logout_rounded,
                    color: const Color(0xFFF43F5E),
                    size: 22,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Logout',
                    style: GoogleFonts.inter(
                      color: const Color(0xFFF43F5E),
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
